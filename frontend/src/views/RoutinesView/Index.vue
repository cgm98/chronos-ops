<script setup lang="ts">
import './style.css';
import { ref, computed, onMounted } from 'vue';
import {
  Workflow, Plus, Flame, Clock, Calendar, Check, Edit2, Trash2,
  ChevronDown, ChevronUp, AlertCircle, Sun, Zap, Sunset, Moon,
  GitBranch, Sparkles
} from 'lucide-vue-next';
import { useRoutineStore } from '../../stores/routine.store';
import Modal from '../../components/Modal/Index.vue';
import type { Routine, RoutineFrequency, RoutineTimeOfDay, RoutineWithStatus } from '../../types/routine.types';

const store = useRoutineStore();

const WEEKDAYS = [
  { val: 1, label: 'Lun' },
  { val: 2, label: 'Mar' },
  { val: 3, label: 'Mié' },
  { val: 4, label: 'Jue' },
  { val: 5, label: 'Vie' },
  { val: 6, label: 'Sáb' },
  { val: 0, label: 'Dom' }
];

// Filtros
const activeFilter = ref<'all' | 'daily' | 'weekly' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');

// Estado del Formulario en Ventana Modal
const showFormModal = ref(false);
const editingId = ref<string | null>(null);
const showMoreOptions = ref(false);

// Campos Esenciales
const fTitle = ref('');
const fFrequency = ref<RoutineFrequency>('daily');
const fWeeklyDays = ref<number[]>([]);
const fDurationMins = ref<number>(15);

// Opciones adicionales / plegables
const fTimeOfDay = ref<RoutineTimeOfDay>('anytime');
const fAnchorCue = ref('');
const fDependsOnId = ref<string>('');
const fDescription = ref('');
const fActive = ref(true);

// Errores específicos por campo
const errors = ref<{
  title?: string;
  weeklyDays?: string;
  duration?: string;
}>({});

// Toast
const toastMsg = ref('');
const toastType = ref<'success' | 'error'>('success');
const toastVisible = ref(false);
const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
  toastMsg.value = msg;
  toastType.value = type;
  toastVisible.value = true;
  setTimeout(() => { toastVisible.value = false; }, 2600);
};

// Modal Eliminar
const showDeleteModal = ref(false);
const routineToDeleteId = ref('');

onMounted(async () => {
  try {
    await store.fetchRoutines();
  } catch (e: any) {
    triggerToast(e.message || 'Error al cargar rutinas', 'error');
  }
});

// Rutinas filtradas
const filteredRoutines = computed(() => {
  const list = store.routines;
  if (activeFilter.value === 'all') return list;
  if (activeFilter.value === 'daily') return list.filter(r => r.frequency === 'daily');
  if (activeFilter.value === 'weekly') return list.filter(r => r.frequency === 'weekly');
  return list.filter(r => r.time_of_day === activeFilter.value);
});

// Ayudante de dependencias
const getRoutineTitle = (id: string | null | undefined) => {
  if (!id) return '';
  const match = store.routines.find(r => r.id === id);
  return match ? match.title : 'Rutina anterior';
};

const otherRoutines = computed(() => {
  return store.routines.filter(r => r.id !== editingId.value);
});

// Manejo de días de la semana
const toggleWeeklyDay = (day: number) => {
  if (fWeeklyDays.value.includes(day)) {
    fWeeklyDays.value = fWeeklyDays.value.filter(d => d !== day);
  } else {
    fWeeklyDays.value = [...fWeeklyDays.value, day].sort();
  }
  if (fWeeklyDays.value.length > 0 && errors.value.weeklyDays) {
    delete errors.value.weeklyDays;
  }
};

const weeklyDaysLabel = (csv: string | null) => {
  if (!csv) return '';
  const map: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 0: 'Dom' };
  return csv.split(',').map(Number).map(d => map[d] || '').filter(Boolean).join(', ');
};

// Acciones de formulario
const openCreate = () => {
  editingId.value = null;
  fTitle.value = '';
  fFrequency.value = 'daily';
  fWeeklyDays.value = [];
  fDurationMins.value = 15;
  fTimeOfDay.value = 'anytime';
  fAnchorCue.value = '';
  fDependsOnId.value = '';
  fDescription.value = '';
  fActive.value = true;
  showMoreOptions.value = false;
  errors.value = {};
  showFormModal.value = true;
};

const openEdit = (r: RoutineWithStatus) => {
  editingId.value = r.id;
  fTitle.value = r.title;
  fFrequency.value = r.frequency;
  fWeeklyDays.value = r.weekly_days ? r.weekly_days.split(',').map(Number) : [];
  fDurationMins.value = r.duration_mins || 15;
  fTimeOfDay.value = r.time_of_day || 'anytime';
  fAnchorCue.value = r.anchor_cue || '';
  fDependsOnId.value = r.depends_on_id || '';
  fDescription.value = r.description || '';
  fActive.value = !!r.active;
  showMoreOptions.value = !!(r.anchor_cue || r.depends_on_id || r.description || r.time_of_day !== 'anytime' || !r.active);
  errors.value = {};
  showFormModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
};

const validateForm = (): boolean => {
  const errs: typeof errors.value = {};
  if (!fTitle.value.trim()) {
    errs.title = 'El nombre de la rutina es obligatorio.';
  }
  if (fFrequency.value === 'weekly' && fWeeklyDays.value.length === 0) {
    errs.weeklyDays = 'Selecciona al menos un día de la semana para una rutina semanal.';
  }
  if (!fDurationMins.value || fDurationMins.value < 1) {
    errs.duration = 'La duración debe ser de al menos 1 minuto.';
  }
  errors.value = errs;
  return Object.keys(errs).length === 0;
};

const handleSaveRoutine = async () => {
  if (!validateForm()) return;

  const payload: Partial<Routine> = {
    title: fTitle.value.trim(),
    frequency: fFrequency.value,
    weekly_days: fFrequency.value === 'weekly' ? fWeeklyDays.value.join(',') : null,
    duration_mins: Number(fDurationMins.value) || 15,
    time_of_day: fTimeOfDay.value,
    anchor_cue: fAnchorCue.value.trim() || null,
    depends_on_id: fDependsOnId.value.trim() || null,
    description: fDescription.value.trim() || null,
    active: fActive.value ? 1 : 0
  };

  try {
    if (editingId.value) {
      await store.updateRoutine(editingId.value, payload);
      triggerToast('Rutina actualizada correctamente');
    } else {
      await store.createRoutine(payload);
      triggerToast('Rutina creada con éxito');
    }
    showFormModal.value = false;
  } catch (e: any) {
    triggerToast(e.message || 'Error al guardar la rutina', 'error');
  }
};

// Toggle de hoy
const toggleToday = async (id: string) => {
  try {
    await store.toggleToday(id);
    const r = store.routines.find(x => x.id === id);
    triggerToast(r?.doneToday ? 'Completada por hoy ✓' : 'Marcada como pendiente');
  } catch (e: any) {
    triggerToast(e.message || 'Error al actualizar estado', 'error');
  }
};

// Eliminar
const clickDelete = (id: string) => {
  routineToDeleteId.value = id;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  showDeleteModal.value = false;
  try {
    await store.deleteRoutine(routineToDeleteId.value);
    triggerToast('Rutina eliminada');
  } catch (e: any) {
    triggerToast(e.message || 'Error al eliminar rutina', 'error');
  }
};
</script>

<template>
  <div class="routines-view">
    <!-- Header Principal -->
    <header class="routines-header">
      <div>
        <span class="eyebrow">HÁBITOS & CADENAS DE EJECUCIÓN</span>
        <h1>Rutinas</h1>
        <p>Construye consistencia diaria con seguimiento de racha y orden lógico.</p>
      </div>
      <div class="header-action-group">
        <button class="btn-primary" @click="openCreate">
          <Plus :size="16" />
          <span>Nueva rutina</span>
        </button>
      </div>
    </header>

    <!-- Barra de Filtros -->
    <div class="routines-filter-bar">
      <button
        class="filter-chip"
        :class="{ active: activeFilter === 'all' }"
        @click="activeFilter = 'all'"
      >
        Todas ({{ store.routines.length }})
      </button>
      <button
        class="filter-chip"
        :class="{ active: activeFilter === 'daily' }"
        @click="activeFilter = 'daily'"
      >
        Diarias
      </button>
      <button
        class="filter-chip"
        :class="{ active: activeFilter === 'weekly' }"
        @click="activeFilter = 'weekly'"
      >
        Semanales
      </button>
      <button
        class="filter-chip"
        :class="{ active: activeFilter === 'morning' }"
        @click="activeFilter = 'morning'"
      >
        <Sun :size="13" /> Mañana
      </button>
      <button
        class="filter-chip"
        :class="{ active: activeFilter === 'afternoon' }"
        @click="activeFilter = 'afternoon'"
      >
        <Zap :size="13" /> Tarde
      </button>
      <button
        class="filter-chip"
        :class="{ active: activeFilter === 'night' }"
        @click="activeFilter = 'night'"
      >
        <Moon :size="13" /> Noche
      </button>
    </div>

    <!-- Contenedor Padre con Scroll para las Cards -->
    <div class="routines-scroll-area">
      <!-- Lista Limpia de Rutinas -->
      <div v-if="filteredRoutines.length > 0" class="routines-clean-list">
        <article
          v-for="r in filteredRoutines"
          :key="r.id"
          class="routine-item-card"
          :class="{ 'is-done': r.doneToday, 'is-inactive': !r.active }"
        >
          <!-- Checkbox Circular de Estado Diario -->
          <button
            type="button"
            class="routine-check-btn"
            :class="{ checked: r.doneToday }"
            @click="toggleToday(r.id)"
            :title="r.doneToday ? 'Hábito completado hoy (click para revertir)' : 'Marcar como completado hoy'"
            aria-label="Alternar estado de hoy"
          >
            <Check v-if="r.doneToday" :size="16" :stroke-width="3" />
          </button>

          <!-- Información Central -->
          <div class="routine-item-body">
            <div class="routine-title-row">
              <h3 class="routine-title">{{ r.title }}</h3>
              <!-- Racha -->
              <span class="streak-badge" :class="{ 'has-streak': (r.currentStreak || 0) > 0 }">
                <Flame :size="14" />
                <span>{{ r.currentStreak || 0 }} {{ (r.currentStreak || 0) === 1 ? 'día' : 'días' }} de racha</span>
              </span>
            </div>

            <!-- Metadatos de la Rutina -->
            <div class="routine-tags-row">
              <span class="routine-tag frequency">
                {{ r.frequency === 'daily' ? 'Diaria' : `Semanal (${weeklyDaysLabel(r.weekly_days)})` }}
              </span>
              <span class="routine-tag duration">
                <Clock :size="12" /> {{ r.duration_mins }} min
              </span>
              <span v-if="r.time_of_day && r.time_of_day !== 'anytime'" class="routine-tag moment">
                <Sun v-if="r.time_of_day === 'morning'" :size="12" />
                <Zap v-else-if="r.time_of_day === 'afternoon'" :size="12" />
                <Sunset v-else-if="r.time_of_day === 'evening'" :size="12" />
                <Moon v-else-if="r.time_of_day === 'night'" :size="12" />
                {{ r.time_of_day === 'morning' ? 'Mañana' : r.time_of_day === 'afternoon' ? 'Tarde' : r.time_of_day === 'evening' ? 'Atardecer' : 'Noche' }}
              </span>
              <span v-if="r.depends_on_id" class="routine-tag dependency" :title="`Depende de: ${getRoutineTitle(r.depends_on_id)}`">
                <GitBranch :size="12" /> Requiere: {{ getRoutineTitle(r.depends_on_id) }}
              </span>
              <span v-if="!r.active" class="routine-tag paused">
                Pausada
              </span>
            </div>

            <p v-if="r.description" class="routine-notes">{{ r.description }}</p>
            <p v-if="r.anchor_cue" class="routine-anchor">
              <strong>Disparador:</strong> {{ r.anchor_cue }}
            </p>
          </div>

          <!-- Acciones -->
          <div class="routine-item-actions">
            <button class="btn-ghost" @click="openEdit(r)" title="Editar rutina">
              <Edit2 :size="15" />
              <span>Editar</span>
            </button>
            <button class="btn-danger-ghost" @click="clickDelete(r.id)" title="Eliminar rutina">
              <Trash2 :size="16" />
            </button>
          </div>
        </article>
      </div>

      <!-- Estado Vacío Unificado -->
      <div v-else class="empty-state">
        <div class="empty-state-icon">
          <Workflow :size="28" />
        </div>
        <h3 class="empty-state-title">
          {{ activeFilter === 'all' ? 'No tienes rutinas registradas' : 'No hay rutinas con este filtro' }}
        </h3>
        <p class="empty-state-desc">
          {{ activeFilter === 'all'
            ? 'Crea tu primera rutina para estructurar tu día, registrar rachas y asegurar precedencia entre actividades.'
            : 'Cambia de filtro o crea una rutina para esta categoría.'
          }}
        </p>
        <button class="btn-primary" @click="openCreate">
          <Plus :size="16" />
          <span>{{ activeFilter === 'all' ? 'Crear primera rutina' : 'Nueva rutina' }}</span>
        </button>
      </div>
    </div>

    <!-- Modal Formulario de Rutina (Campos Esenciales + Plegable) -->
    <Modal
      :show="showFormModal"
      :title="editingId ? 'Editar rutina' : 'Nueva rutina'"
      max-width="540px"
      @close="closeFormModal"
    >
      <form @submit.prevent="handleSaveRoutine" class="form-stack">
        <!-- 1. Nombre (Esencial) -->
        <div class="form-group">
          <label for="routine-title">Nombre de la rutina *</label>
          <input
            id="routine-title"
            v-model="fTitle"
            type="text"
            placeholder="Ej: Planificación de objetivos del día"
            :class="{ 'has-error': errors.title }"
            @input="delete errors.title"
            autofocus
          />
          <span v-if="errors.title" class="field-error">
            <AlertCircle :size="13" /> {{ errors.title }}
          </span>
        </div>

        <!-- 2. Frecuencia y Duración (Esenciales en fila) -->
        <div class="form-row">
          <div class="form-group">
            <label for="routine-freq">Frecuencia *</label>
            <select id="routine-freq" v-model="fFrequency">
              <option value="daily">Diaria</option>
              <option value="weekly">Semanal</option>
            </select>
          </div>

          <div class="form-group">
            <label for="routine-duration">Duración estimada (min) *</label>
            <input
              id="routine-duration"
              v-model.number="fDurationMins"
              type="number"
              min="1"
              placeholder="15"
              :class="{ 'has-error': errors.duration }"
              @input="delete errors.duration"
            />
            <span v-if="errors.duration" class="field-error">
              <AlertCircle :size="13" /> {{ errors.duration }}
            </span>
          </div>
        </div>

        <!-- Días de la semana (Si es semanal) -->
        <div v-if="fFrequency === 'weekly'" class="form-group">
          <label>Días de ejecución *</label>
          <div class="weekday-selector">
            <button
              v-for="day in WEEKDAYS"
              :key="day.val"
              type="button"
              class="weekday-chip"
              :class="{ selected: fWeeklyDays.includes(day.val) }"
              @click="toggleWeeklyDay(day.val)"
            >
              {{ day.label }}
            </button>
          </div>
          <span v-if="errors.weeklyDays" class="field-error">
            <AlertCircle :size="13" /> {{ errors.weeklyDays }}
          </span>
        </div>

        <!-- 3. Sección Plegable: Más Opciones -->
        <div class="form-collapsible">
          <button
            type="button"
            class="collapsible-trigger"
            @click="showMoreOptions = !showMoreOptions"
          >
            <component :is="showMoreOptions ? ChevronUp : ChevronDown" :size="16" />
            <span>{{ showMoreOptions ? 'Menos opciones' : 'Más opciones (momento, dependencia, notas)' }}</span>
          </button>

          <div v-if="showMoreOptions" class="collapsible-body">
            <!-- Momento del día -->
            <div class="form-group">
              <label for="routine-time">Momento preferido</label>
              <select id="routine-time" v-model="fTimeOfDay">
                <option value="anytime">Cualquier momento</option>
                <option value="morning">Mañana (05:00 - 12:00)</option>
                <option value="afternoon">Tarde (12:00 - 17:00)</option>
                <option value="evening">Atardecer (17:00 - 22:00)</option>
                <option value="night">Noche (22:00 - 05:00)</option>
              </select>
            </div>

            <!-- Dependencia de otra rutina -->
            <div class="form-group">
              <label for="routine-dep">Depende de otra rutina (DAG)</label>
              <select id="routine-dep" v-model="fDependsOnId">
                <option value="">Ninguna (Independiente)</option>
                <option
                  v-for="other in otherRoutines"
                  :key="other.id"
                  :value="other.id"
                >
                  {{ other.title }}
                </option>
              </select>
            </div>

            <!-- Anclaje de hábito -->
            <div class="form-group">
              <label for="routine-anchor">Hábito disparador / Anclaje</label>
              <input
                id="routine-anchor"
                v-model="fAnchorCue"
                type="text"
                placeholder="Ej: Justo después de tomar mi primer café..."
              />
            </div>

            <!-- Notas / Descripción -->
            <div class="form-group">
              <label for="routine-desc">Notas adicionales</label>
              <textarea
                id="routine-desc"
                v-model="fDescription"
                rows="2"
                placeholder="Instrucciones, checklist mental o enlaces rápidos..."
              ></textarea>
            </div>

            <!-- Activa / Inactiva -->
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="fActive" />
                <span>Rutina activa (se incluye en el flujo y recordatorios)</span>
              </label>
            </div>
          </div>
        </div>
      </form>

      <!-- Footer del Modal -->
      <template #footer>
        <button type="button" class="btn-secondary" @click="closeFormModal">
          Cancelar
        </button>
        <button type="button" class="btn-primary" @click="handleSaveRoutine">
          {{ editingId ? 'Guardar cambios' : 'Crear rutina' }}
        </button>
      </template>
    </Modal>

    <!-- Modal Confirmar Eliminación (Ahora funcional con el nuevo Modal) -->
    <Modal
      v-if="showDeleteModal"
      title="Confirmar eliminación"
      message="¿Estás seguro de que deseas eliminar esta rutina? Se borrará su configuración y el registro histórico de rachas."
      confirm-label="Eliminar rutina"
      :destructive="true"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />

    <!-- Toast Notification -->
    <div
      class="toast-notification"
      :class="{ 'visible': toastVisible, 'is-error': toastType === 'error' }"
    >
      {{ toastMsg }}
    </div>
  </div>
</template>
