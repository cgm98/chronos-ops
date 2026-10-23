import { ref, computed } from 'vue';

export interface CRDTOperation {
  opId: string;
  op: 'TOGGLE_TODAY' | 'CREATE' | 'UPDATE' | 'DELETE';
  entityId: string;
  payload: any;
  lamportClock: number;
  timestamp: string;
  synced: boolean;
}

const STORAGE_KEY = 'cogni_routine_crdt_oplog';
const CLOCK_STORAGE_KEY = 'cogni_routine_lamport_clock';

export function useRoutineCRDT() {
  const getInitialClock = (): number => {
    try {
      const stored = localStorage.getItem(CLOCK_STORAGE_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  };

  const getInitialLog = (): CRDTOperation[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const lamportClock = ref<number>(getInitialClock());
  const opLog = ref<CRDTOperation[]>(getInitialLog());
  const syncStatus = ref<'synced' | 'syncing' | 'offline_pending'>('synced');

  const persist = () => {
    try {
      localStorage.setItem(CLOCK_STORAGE_KEY, lamportClock.value.toString());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(opLog.value.slice(-50))); // Retener últimos 50 eventos
    } catch {}
  };

  /**
   * Genera una nueva operación atómica con reloj lógico de Lamport L = L + 1
   */
  const recordLocalOp = (
    op: CRDTOperation['op'],
    entityId: string,
    payload: any = {}
  ): CRDTOperation => {
    lamportClock.value++;
    const operation: CRDTOperation = {
      opId: `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      op,
      entityId,
      payload,
      lamportClock: lamportClock.value,
      timestamp: new Date().toISOString(),
      synced: false
    };

    opLog.value.unshift(operation);
    syncStatus.value = 'syncing';
    persist();
    return operation;
  };

  /**
   * Confirma la sincronización con el servidor y avanza el reloj de Lamport L = max(L_local, L_remote) + 1
   */
  const markOpSynced = (opId: string, remoteClock: number = 0) => {
    lamportClock.value = Math.max(lamportClock.value, remoteClock) + 1;
    const item = opLog.value.find((o) => o.opId === opId);
    if (item) {
      item.synced = true;
    }
    const hasUnsynced = opLog.value.some((o) => !o.synced);
    syncStatus.value = hasUnsynced ? 'offline_pending' : 'synced';
    persist();
  };

  const markOpFailed = (opId: string) => {
    syncStatus.value = 'offline_pending';
  };

  const pendingOpsCount = computed(() => opLog.value.filter((o) => !o.synced).length);

  return {
    lamportClock,
    opLog,
    syncStatus,
    pendingOpsCount,
    recordLocalOp,
    markOpSynced,
    markOpFailed
  };
}
