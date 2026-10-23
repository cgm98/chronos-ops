import type { RoutineWithStatus } from '../../../types/routine.types';

export interface MarkovAnalysis {
  // Matriz de transición 2x2: P(Hoy = Done | Ayer = Done), P(Hoy = Done | Ayer = Missed)
  pDoneGivenDone: number;
  pDoneGivenMissed: number;
  // Entropía de Shannon del proceso estocástico (bits): Medida de predictibilidad
  shannonEntropy: number;
  // Estado estacionario estimado (tasa asintótica de éxito)
  stationaryProbability: number;
  stabilityIndex: 'Deterministic' | 'Highly Stable' | 'Stochastic Fluctuating' | 'Unstable';
}

/**
 * Calcula la matriz de transición de primer orden de Markov a partir del historial empírico.
 * Estados: 1 = Cumplido (Done), 0 = Omitido (Missed)
 */
export function computeMarkovAnalysis(recentDays?: { date: string; done: boolean }[]): MarkovAnalysis {
  if (!recentDays || recentDays.length < 2) {
    return {
      pDoneGivenDone: 0,
      pDoneGivenMissed: 0,
      shannonEntropy: 0,
      stationaryProbability: 0,
      stabilityIndex: 'Unstable'
    };
  }

  let n11 = 0; // Done -> Done
  let n10 = 0; // Done -> Missed
  let n01 = 0; // Missed -> Done
  let n00 = 0; // Missed -> Missed

  for (let i = 0; i < recentDays.length - 1; i++) {
    const prev = recentDays[i].done ? 1 : 0;
    const curr = recentDays[i + 1].done ? 1 : 0;

    if (prev === 1 && curr === 1) n11++;
    else if (prev === 1 && curr === 0) n10++;
    else if (prev === 0 && curr === 1) n01++;
    else if (prev === 0 && curr === 0) n00++;
  }

  const totalFromDone = n11 + n10;
  const totalFromMissed = n01 + n00;

  const pDoneGivenDone = totalFromDone > 0 ? n11 / totalFromDone : 0.5;
  const pDoneGivenMissed = totalFromMissed > 0 ? n01 / totalFromMissed : 0.5;

  const pMissedGivenDone = 1 - pDoneGivenDone;
  const pMissedGivenMissed = 1 - pDoneGivenMissed;

  // Vector de distribución estacionaria: pi_1 * P_10 = pi_0 * P_01 => pi_1 = P_01 / (P_01 + P_10)
  const denominator = pDoneGivenMissed + pMissedGivenDone;
  const stationaryProbability = denominator > 0 ? pDoneGivenMissed / denominator : 0;
  const pi0 = 1 - stationaryProbability;

  // Entropía de Shannon de la cadena de Markov: H = - sum_i pi_i sum_j P_ij log2(P_ij)
  const entropyFromDone =
    (pDoneGivenDone > 0 ? pDoneGivenDone * Math.log2(pDoneGivenDone) : 0) +
    (pMissedGivenDone > 0 ? pMissedGivenDone * Math.log2(pMissedGivenDone) : 0);

  const entropyFromMissed =
    (pDoneGivenMissed > 0 ? pDoneGivenMissed * Math.log2(pDoneGivenMissed) : 0) +
    (pMissedGivenMissed > 0 ? pMissedGivenMissed * Math.log2(pMissedGivenMissed) : 0);

  const rawEntropy = -(stationaryProbability * entropyFromDone + pi0 * entropyFromMissed);
  const shannonEntropy = Number(Math.max(0, rawEntropy).toFixed(3));

  let stabilityIndex: MarkovAnalysis['stabilityIndex'] = 'Unstable';
  if (pDoneGivenDone >= 0.85 && shannonEntropy < 0.45) {
    stabilityIndex = 'Deterministic';
  } else if (pDoneGivenDone >= 0.65) {
    stabilityIndex = 'Highly Stable';
  } else if (stationaryProbability >= 0.4) {
    stabilityIndex = 'Stochastic Fluctuating';
  }

  return {
    pDoneGivenDone: Math.round(pDoneGivenDone * 100),
    pDoneGivenMissed: Math.round(pDoneGivenMissed * 100),
    shannonEntropy,
    stationaryProbability: Math.round(stationaryProbability * 100),
    stabilityIndex
  };
}
