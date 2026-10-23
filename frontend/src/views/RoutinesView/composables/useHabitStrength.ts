import type { RoutineMetadata, RoutineWithStatus, RoutineTimeOfDay } from '../../../types/routine.types';

const META_PREFIX = '<!--__HABIT_META__';
const META_SUFFIX = '__-->';

/**
 * Parsea la metadata enriquecida incrustada en la descripción.
 */
export function parseRoutineDescription(raw: string | null): { text: string; meta: RoutineMetadata } {
  if (!raw) return { text: '', meta: {} };

  const startIdx = raw.indexOf(META_PREFIX);
  const endIdx = raw.indexOf(META_SUFFIX);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const jsonStr = raw.substring(startIdx + META_PREFIX.length, endIdx);
    const plainText = (raw.substring(0, startIdx) + raw.substring(endIdx + META_SUFFIX.length)).trim();
    try {
      const meta = JSON.parse(jsonStr) as RoutineMetadata;
      return { text: plainText, meta };
    } catch {
      return { text: raw, meta: {} };
    }
  }

  return { text: raw, meta: {} };
}

/**
 * Serializa la descripción junto a la metadata estructurada.
 */
export function serializeRoutineDescription(plainText: string, meta: RoutineMetadata): string {
  const cleanText = (plainText || '').trim();
  const hasMeta = Object.keys(meta).length > 0 && Object.values(meta).some(v => v !== undefined && v !== null && v !== '');

  if (!hasMeta) return cleanText;

  const jsonStr = JSON.stringify(meta);
  const metaBlock = `${META_PREFIX}${jsonStr}${META_SUFFIX}`;

  return cleanText ? `${cleanText}\n\n${metaBlock}` : metaBlock;
}

/**
 * Calcula el índice de resiliencia (Habit Strength) mediante decaimiento exponencial e^(-λt).
 * λ = ln(2) / 7 (vida media de 7 días).
 */
export function computeResilienceScore(recentDays?: { date: string; done: boolean }[]): number {
  if (!recentDays || recentDays.length === 0) return 0;

  const halfLife = 7;
  const lambda = Math.log(2) / halfLife;

  let weightedSum = 0;
  let totalWeight = 0;

  // recentDays suele venir en orden cronológico (índice 0 = hace N días, último índice = hoy)
  const n = recentDays.length;
  for (let i = 0; i < n; i++) {
    const daysAgo = n - 1 - i; // 0 = hoy, 1 = ayer...
    const weight = Math.exp(-lambda * daysAgo);
    totalWeight += weight;
    if (recentDays[i].done) {
      weightedSum += weight;
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100);
}

/**
 * Determina la ventana circadiana actual basada en la hora solar local.
 */
export function getCurrentCircadianWindow(): RoutineTimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function getCircadianLabel(window: RoutineTimeOfDay): string {
  switch (window) {
    case 'morning': return 'Mañana / Activación';
    case 'afternoon': return 'Tarde / Deep Work';
    case 'evening': return 'Atardecer / Descompresión';
    case 'night': return 'Noche / Protocolo';
    default: return 'Cualquier momento';
  }
}

export function getCircadianIconName(window: RoutineTimeOfDay): string {
  switch (window) {
    case 'morning': return 'Sun';
    case 'afternoon': return 'Zap';
    case 'evening': return 'Sunset';
    case 'night': return 'Moon';
    default: return 'Clock';
  }
}
