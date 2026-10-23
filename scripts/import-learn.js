import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { openDatabase } from '../backend/src/infrastructure/database/connection.js';
import { localDate, routineOrder } from '../backend/src/domain/dag.js';

const args=process.argv.slice(2);
const option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const sourcePath=option('--source'), targetPath=option('--target')||'db/chronos.db', dryRun=args.includes('--dry-run');
if(!sourcePath || !existsSync(sourcePath)) {console.error('Uso: npm run import:learn -- --source <respaldo-cogni.db> [--target db/chronos.db] [--dry-run]');process.exit(2);}
if(resolve(sourcePath)===resolve(targetPath)) {console.error('Origen y destino deben ser distintos');process.exit(2);}
const source=new DatabaseSync(sourcePath,{readOnly:true});
const hasTable=name=>!!source.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
const columns=name=>new Set(source.prepare(`PRAGMA table_info(${name})`).all().map(r=>r.name));
const required=['tasks','routines','plans','plan_versions','domains','events'];
for(const table of required) if(!hasTable(table)) {console.error(`Falta tabla ${table} en el respaldo`);process.exit(2);}
if(!columns('tasks').has('user_id')) {console.error('La tabla tasks no contiene user_id; se requiere una versión de LEARN con pertenencia explícita.');process.exit(2);}
const report={};
for(const table of required) report[table]=source.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
const plans=source.prepare('SELECT p.*,d.user_id FROM plans p JOIN domains d ON d.id=p.domain_id').all();
const routines=source.prepare('SELECT * FROM routines').all();
const tasks=source.prepare('SELECT * FROM tasks').all();
const versions=source.prepare('SELECT v.* FROM plan_versions v JOIN plans p ON p.id=v.plan_id JOIN domains d ON d.id=p.domain_id WHERE d.user_id IS NOT NULL').all();
const rawEvents=source.prepare("SELECT e.* FROM events e JOIN routines r ON r.id=e.entity_id WHERE e.kind='routine_completed' AND e.entity_type='routine' AND r.user_id IS NOT NULL ORDER BY e.created_at,e.id").all();
const skipped={tasks:tasks.filter(x=>!x.user_id).length,routines:routines.filter(x=>!x.user_id).length,plans:plans.filter(x=>!x.user_id).length};
const selected={tasks:tasks.length-skipped.tasks,routines:routines.length-skipped.routines,plans:plans.length-skipped.plans,plan_versions:versions.length,routine_events:rawEvents.length};
console.log(JSON.stringify({source:resolve(sourcePath),target:resolve(targetPath),dryRun,sourceCounts:report,selected,skipped},null,2));
if(dryRun) {source.close();process.exit(0);}
if(existsSync(targetPath)) {console.error('El destino ya existe. Use una ruta nueva o haga un respaldo y retire el destino antes de importar.');process.exit(2);}
mkdirSync(dirname(resolve(targetPath)),{recursive:true});
const target=openDatabase(targetPath);
try {
  target.exec('BEGIN IMMEDIATE');
  const write=(table,fields,record)=>target.prepare(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`).run(...fields.map(k=>record[k]??null));
  const taskFields=['id','user_id','title','description','status','priority','assignee_id','project_id','due_date','created_at','updated_at'];
  for(const row of tasks.filter(x=>x.user_id)) write('tasks',taskFields,row);
  const routineFields=['id','user_id','title','description','frequency','weekly_days','active','time_of_day','duration_mins','anchor_cue','depends_on_id','created_at','updated_at'];
  const pending=routines.filter(x=>x.user_id), inserted=new Set();
  while(pending.length) {
    const before=pending.length;
    for(let i=pending.length-1;i>=0;i--) {
      const row=pending[i];
      if(!row.depends_on_id || inserted.has(row.depends_on_id)) {write('routines',routineFields,row);inserted.add(row.id);pending.splice(i,1);}
    }
    if(pending.length===before) throw Error(`Dependencias cíclicas o faltantes en rutinas: ${pending.map(x=>x.id).join(', ')}`);
  }
  for(const uid of new Set(routines.filter(x=>x.user_id).map(x=>x.user_id))) routineOrder(target.prepare('SELECT * FROM routines WHERE user_id=?').all(uid));
  const planFields=['id','user_id','domain_id','title','status','content','created_at','updated_at'];
  for(const row of plans.filter(x=>x.user_id)) write('plans',planFields,row);
  const versionFields=['id','plan_id','title','content','created_at'];
  for(const row of versions) write('plan_versions',versionFields,row);
  const eventFields=['id','user_id','routine_id','date','created_at'];
  let duplicateEvents=0;
  for(const event of rawEvents) {
    const routine=routines.find(x=>x.id===event.entity_id);
    const row={id:event.id,user_id:routine.user_id,routine_id:event.entity_id,date:localDate(new Date(event.created_at)),created_at:event.created_at};
    try {write('routine_events',eventFields,row);} catch(error) {if(String(error).includes('UNIQUE constraint failed: routine_events.user_id')) duplicateEvents++;else throw error;}
  }
  const fk=target.prepare('PRAGMA foreign_key_check').all(), integrity=target.prepare('PRAGMA integrity_check').get();
  if(fk.length||integrity.integrity_check!=='ok') throw Error('Falló la integridad del destino');
  target.exec('COMMIT');
  console.log(JSON.stringify({imported:{tasks:target.prepare('SELECT count(*) n FROM tasks').get().n,routines:target.prepare('SELECT count(*) n FROM routines').get().n,plans:target.prepare('SELECT count(*) n FROM plans').get().n,plan_versions:target.prepare('SELECT count(*) n FROM plan_versions').get().n,routine_events:target.prepare('SELECT count(*) n FROM routine_events').get().n},duplicateEvents,integrity:'ok'},null,2));
} catch(error) {target.exec('ROLLBACK');console.error(error);process.exitCode=1;}
finally {target.close();source.close();}
