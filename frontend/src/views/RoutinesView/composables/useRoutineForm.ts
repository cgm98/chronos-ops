import { ref } from 'vue';
import type { useRoutineStore } from '../../../stores/routine.store';
import type { Routine, RoutineFrequency, RoutineTimeOfDay } from '../../../types/routine.types';
import { parseRoutineDescription, serializeRoutineDescription } from './useHabitStrength';

// Alta/edición de rutinas enriquecida con features de deep tech & chronobiology.
export function useRoutineForm(
  store: ReturnType<typeof useRoutineStore>,
  onSuccess: (msg: string) => void,
  onError: (msg: string) => void
) {
  const editingId = ref<string | null>(null);
  const fTitle = ref('');
  const fDescription = ref('');
  const fFrequency = ref<RoutineFrequency>('daily');
  const fWeeklyDays = ref<number[]>([]);
  const fActive = ref(true);
  const fTimeOfDay = ref<RoutineTimeOfDay>('anytime');
  const fDurationMins = ref<number>(15);
  const fAnchorCue = ref('');
  const fDependsOnId = ref<string>('');

  const resetForm = () => {
    editingId.value = null;
    fTitle.value = '';
    fDescription.value = '';
    fFrequency.value = 'daily';
    fWeeklyDays.value = [];
    fActive.value = true;
    fTimeOfDay.value = 'anytime';
    fDurationMins.value = 15;
    fAnchorCue.value = '';
    fDependsOnId.value = '';
  };

  const startEdit = (r: Routine) => {
    editingId.value = r.id;
    fTitle.value = r.title;
    const { text, meta } = parseRoutineDescription(r.description);
    fDescription.value = text;
    fTimeOfDay.value = r.time_of_day || meta.time_of_day || 'anytime';
    fDurationMins.value = r.duration_mins || meta.duration_mins || 15;
    fAnchorCue.value = r.anchor_cue || meta.anchor_cue || '';
    fDependsOnId.value = r.depends_on_id || meta.depends_on_id || '';
    fFrequency.value = r.frequency;
    fWeeklyDays.value = r.weekly_days ? r.weekly_days.split(',').map(Number) : [];
    fActive.value = !!r.active;
  };

  const toggleWeeklyDay = (day: number) => {
    fWeeklyDays.value = fWeeklyDays.value.includes(day)
      ? fWeeklyDays.value.filter(d => d !== day)
      : [...fWeeklyDays.value, day].sort();
  };

  const handleSubmit = async () => {
    const title = fTitle.value.trim();
    if (!title) return onError('El título es obligatorio');
    if (fFrequency.value === 'weekly' && fWeeklyDays.value.length === 0) {
      return onError('Elegí al menos un día de la semana');
    }

    const duration = Number(fDurationMins.value) || 15;
    const anchorCue = fAnchorCue.value.trim() || undefined;
    const dependsOn = fDependsOnId.value.trim() || undefined;

    const serializedDescription = serializeRoutineDescription(fDescription.value, {
      time_of_day: fTimeOfDay.value !== 'anytime' ? fTimeOfDay.value : undefined,
      duration_mins: duration,
      anchor_cue: anchorCue,
      depends_on_id: dependsOn
    });

    const payload: Partial<Routine> = {
      title,
      description: serializedDescription || null,
      frequency: fFrequency.value,
      weekly_days: fFrequency.value === 'weekly' ? fWeeklyDays.value.join(',') : null,
      active: fActive.value ? 1 : 0,
      time_of_day: fTimeOfDay.value,
      duration_mins: duration,
      anchor_cue: anchorCue || null,
      depends_on_id: dependsOn || null
    };

    try {
      if (editingId.value) {
        await store.updateRoutine(editingId.value, payload);
        onSuccess('Nodo de rutina actualizado');
      } else {
        await store.createRoutine(payload);
        onSuccess('Nodo de rutina creado');
      }
      resetForm();
    } catch (e: any) {
      onError(e.message || 'Error');
    }
  };

  return {
    editingId,
    fTitle,
    fDescription,
    fFrequency,
    fWeeklyDays,
    fActive,
    fTimeOfDay,
    fDurationMins,
    fAnchorCue,
    fDependsOnId,
    toggleWeeklyDay,
    resetForm,
    startEdit,
    handleSubmit
  };
}
