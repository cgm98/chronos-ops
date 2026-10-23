import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('importa entidades operativas de un respaldo y conserva relaciones',()=>{
  const dir=mkdtempSync(join(tmpdir(),'chronos-import-'));
  try {
    const sourcePath=join(dir,'source.db'), targetPath=join(dir,'target.db');
    const db=new DatabaseSync(sourcePath);
    db.exec(`
      CREATE TABLE tasks(id TEXT,user_id TEXT,title TEXT,description TEXT,status TEXT,priority TEXT,assignee_id TEXT,project_id TEXT,due_date TEXT,created_at TEXT,updated_at TEXT);
      CREATE TABLE routines(id TEXT,user_id TEXT,title TEXT,description TEXT,frequency TEXT,weekly_days TEXT,active INTEGER,time_of_day TEXT,duration_mins INTEGER,anchor_cue TEXT,depends_on_id TEXT,created_at TEXT,updated_at TEXT);
      CREATE TABLE domains(id TEXT,user_id TEXT);
      CREATE TABLE plans(id TEXT,domain_id TEXT,title TEXT,status TEXT,content TEXT,created_at TEXT,updated_at TEXT);
      CREATE TABLE plan_versions(id TEXT,plan_id TEXT,title TEXT,content TEXT,created_at TEXT);
      CREATE TABLE events(id TEXT,kind TEXT,entity_type TEXT,entity_id TEXT,created_at TEXT);
      INSERT INTO domains VALUES('d','u');
      INSERT INTO tasks VALUES('t','u','Tarea',NULL,'todo','medium',NULL,NULL,NULL,'2026-10-23','2026-10-23');
      INSERT INTO routines VALUES('r','u','Rutina',NULL,'daily',NULL,1,'anytime',15,NULL,NULL,'2026-10-23','2026-10-23');
      INSERT INTO plans VALUES('p','d','Plan','draft','texto','2026-10-23','2026-10-23');
      INSERT INTO plan_versions VALUES('v','p','Anterior','texto viejo','2026-10-22');
      INSERT INTO events VALUES('e','routine_completed','routine','r','2026-10-23T12:00:00.000Z');
    `);
    db.close();
    const command=join(process.cwd(),'scripts','import-learn.js');
    const dry=JSON.parse(execFileSync(process.execPath,['--import','tsx',command,'--source',sourcePath,'--target',targetPath,'--dry-run'],{encoding:'utf8'}));
    assert.equal(dry.selected.tasks,1);
    execFileSync(process.execPath,['--import','tsx',command,'--source',sourcePath,'--target',targetPath],{encoding:'utf8'});
    const target=new DatabaseSync(targetPath,{readOnly:true});
    assert.equal(target.prepare('SELECT count(*) n FROM tasks').get().n,1);
    assert.equal(target.prepare('SELECT count(*) n FROM routine_events').get().n,1);
    assert.equal(target.prepare('SELECT user_id FROM plans').get().user_id,'u');
    target.close();
  } finally {rmSync(dir,{recursive:true,force:true});}
});
