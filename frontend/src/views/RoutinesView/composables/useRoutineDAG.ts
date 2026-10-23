import type { RoutineWithStatus } from '../../../types/routine.types';

export interface DAGNode {
  routine: RoutineWithStatus;
  inDegree: number;
  dependencies: string[];
  dependents: string[];
}

export interface DAGLayer {
  layerIndex: number;
  parallelRoutines: RoutineWithStatus[];
}

export interface DAGResolution {
  layers: DAGLayer[];
  sortedOrder: RoutineWithStatus[];
  hasCycle: boolean;
  isolatedCount: number;
  totalNodes: number;
}

/**
 * Resuelve las dependencias entre rutinas mediante el Algoritmo de Kahn estratificado en ondas/capas
 * de paralelismo en complejidad lineal O(|V| + |E|).
 */
export function resolveRoutineDAG(routines: RoutineWithStatus[]): DAGResolution {
  const nodeMap = new Map<string, DAGNode>();
  const idByTitleLower = new Map<string, string>();

  // 1. Indexar nodos
  routines.forEach((r) => {
    nodeMap.set(r.id, {
      routine: r,
      inDegree: 0,
      dependencies: [],
      dependents: []
    });
    idByTitleLower.set(r.title.toLowerCase().trim(), r.id);
  });

  // 2. Construir aristas usando depends_on_id explícito o anchor_cue
  routines.forEach((r) => {
    // Relación nativa DDL (depends_on_id)
    if (r.depends_on_id && nodeMap.has(r.depends_on_id) && r.depends_on_id !== r.id) {
      const parentNode = nodeMap.get(r.depends_on_id)!;
      const currentNode = nodeMap.get(r.id)!;
      if (!currentNode.dependencies.includes(r.depends_on_id)) {
        currentNode.dependencies.push(r.depends_on_id);
        parentNode.dependents.push(r.id);
        currentNode.inDegree++;
      }
    }

    // Relación semántica inferida por anchor_cue
    const cue = r.parsedMetadata?.anchor_cue?.toLowerCase().trim() || r.anchor_cue?.toLowerCase().trim();
    if (cue) {
      for (const [targetTitle, targetId] of idByTitleLower.entries()) {
        if (targetId !== r.id && (cue.includes(targetTitle) || targetTitle.includes(cue))) {
          const targetNode = nodeMap.get(targetId);
          const currentNode = nodeMap.get(r.id);
          if (targetNode && currentNode && !currentNode.dependencies.includes(targetId)) {
            currentNode.dependencies.push(targetId);
            targetNode.dependents.push(r.id);
            currentNode.inDegree++;
          }
        }
      }
    }
  });

  // 3. Estratificación por capas de paralelismo (Kahn's Algorithm with Layering)
  let currentLayerQueue: string[] = [];
  nodeMap.forEach((node, id) => {
    if (node.inDegree === 0) {
      currentLayerQueue.push(id);
    }
  });

  const inDegreeCopy = new Map<string, number>();
  nodeMap.forEach((node, id) => inDegreeCopy.set(id, node.inDegree));

  const layers: DAGLayer[] = [];
  const sortedOrder: RoutineWithStatus[] = [];
  let layerIndex = 0;

  while (currentLayerQueue.length > 0) {
    const nextLayerQueue: string[] = [];
    const currentLayerRoutines: RoutineWithStatus[] = [];

    for (const u of currentLayerQueue) {
      const uNode = nodeMap.get(u)!;
      currentLayerRoutines.push(uNode.routine);
      sortedOrder.push(uNode.routine);

      for (const v of uNode.dependents) {
        const currentIn = inDegreeCopy.get(v)! - 1;
        inDegreeCopy.set(v, currentIn);
        if (currentIn === 0) {
          nextLayerQueue.push(v);
        }
      }
    }

    layers.push({
      layerIndex,
      parallelRoutines: currentLayerRoutines
    });

    layerIndex++;
    currentLayerQueue = nextLayerQueue;
  }

  const hasCycle = sortedOrder.length !== routines.length;
  const finalOrder = hasCycle ? routines : sortedOrder;
  const isolatedCount = routines.filter((r) => {
    const n = nodeMap.get(r.id);
    return n && n.dependencies.length === 0 && n.dependents.length === 0;
  }).length;

  return {
    layers: hasCycle ? [{ layerIndex: 0, parallelRoutines: routines }] : layers,
    sortedOrder: finalOrder,
    hasCycle,
    isolatedCount,
    totalNodes: routines.length
  };
}
