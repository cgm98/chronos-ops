<script setup lang="ts">
import './style.css';
import { ref, computed, onMounted } from 'vue';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, CheckCircle2 } from 'lucide-vue-next';
import { usePersonStore } from '../../stores/person.store';
import PersonModal from '../../components/PersonModal/Index.vue';
import { useCalendar } from './composables/useCalendar';
import { todayLocal } from '../../lib/recurrence';
import type { CalendarEvent, CalendarEventType } from '../../types/calendar.types';
import type { Person } from '../../types/domain.types';

const personStore = usePersonStore();
const { currentMonth, eventsByDate, loading, fetchMonth, shiftMonth } = useCalendar();

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const TYPE_LABELS: Record<CalendarEventType, string> = {
  task: 'Tarea',
  recurring_bill: 'Pago recurrente',
  routine: 'Rutina',
  birthday: 'Cumpleaños',
  important_date: 'Fecha importante',
  follow_up: 'Seguimiento',
  code_review: 'Code review'
};

const today = todayLocal();
const selectedDate = ref(today);
const editingPerson = ref<Person | null>(null);

onMounted(async () => {
  try {
    await Promise.all([
      personStore.people.length === 0 ? personStore.fetchPeople() : Promise.resolve(),
      fetchMonth()
    ]);
  } catch (e) {
    console.error(e);
  }
});

const monthLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
});

const selectedDateLabel = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
});

const goToMonth = async (delta: number) => {
  const prevDay = Number(selectedDate.value.slice(8, 10));
  await shiftMonth(delta);
  const [y, m] = currentMonth.value.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const day = Math.min(prevDay, daysInMonth);
  selectedDate.value = `${currentMonth.value}-${String(day).padStart(2, '0')}`;
};

const goToToday = async () => {
  const [y, m] = today.split('-').map(Number);
  const targetMonth = `${y}-${String(m).padStart(2, '0')}`;
  if (targetMonth !== currentMonth.value) {
    currentMonth.value = targetMonth;
    await fetchMonth();
  }
  selectedDate.value = today;
};

const calendarCells = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: ({ date: string; day: number } | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d });
  }
  return cells;
});

const activeFilterTypes = ref<Set<CalendarEventType>>(new Set(Object.keys(TYPE_LABELS) as CalendarEventType[]));

const toggleFilterType = (type: CalendarEventType) => {
  if (activeFilterTypes.value.has(type)) {
    if (activeFilterTypes.value.size > 1) {
      activeFilterTypes.value.delete(type);
    } else {
      activeFilterTypes.value = new Set(Object.keys(TYPE_LABELS) as CalendarEventType[]);
    }
  } else {
    activeFilterTypes.value.add(type);
  }
};

const selectedEvents = computed(() => {
  const list = eventsByDate.value.get(selectedDate.value) || [];
  return list.filter(ev => activeFilterTypes.value.has(ev.type));
});

const selectDay = (date: string) => {
  selectedDate.value = date;
};

const handleEventClick = (ev: CalendarEvent) => {
  if (ev.type === 'birthday' || ev.type === 'important_date' || ev.type === 'follow_up') {
    const person = personStore.people.find(p => p.id === ev.sourceId);
    if (person) editingPerson.value = person;
  }
};
const closeFicha = () => {
  editingPerson.value = null;
};
</script>

<template>
  <div class="calendar-container animate-fade-in">
    <!-- Header Principal -->
    <header class="calendar-header">
      <div class="header-titles">
        <span class="eyebrow">AGENDA & OPERACIONES</span>
        <h1>Calendario</h1>
        <p>Vencimientos de tareas, rutinas y compromisos en una vista expansiva.</p>
      </div>

      <!-- Selector de Mes y Acciones -->
      <div class="month-selector">
        <button class="month-arrow" @click="goToMonth(-1)" title="Mes anterior">
          <ChevronLeft :size="18" />
        </button>
        <span class="month-label">{{ monthLabel }}</span>
        <button class="month-arrow" @click="goToMonth(1)" title="Mes siguiente">
          <ChevronRight :size="18" />
        </button>
        <button class="today-btn" @click="goToToday" title="Ir a hoy">
          <CalendarDays :size="14" />
          <span>Hoy</span>
        </button>
      </div>
    </header>

    <!-- Filtros de Tipos de Eventos -->
    <div class="calendar-legend">
      <span
        v-for="(label, type) in TYPE_LABELS"
        :key="type"
        class="legend-item"
        :class="{ active: activeFilterTypes.has(type as CalendarEventType) }"
        @click="toggleFilterType(type as CalendarEventType)"
        title="Clic para activar/desactivar filtro"
      >
        <span class="legend-dot" :class="`cal-dot-${type}`"></span>
        <span>{{ label }}</span>
      </span>
    </div>

    <!-- Layout Expansivo (Ocupa la pantalla completa) -->
    <div class="calendar-layout">
      <!-- Cuadrícula Mensual Principal -->
      <div class="calendar-grid">
        <div v-for="d in WEEKDAY_LABELS" :key="d" class="calendar-weekday">
          {{ d }}
        </div>
        <div
          v-for="(cell, idx) in calendarCells"
          :key="idx"
          class="calendar-cell"
          :class="{
            empty: !cell,
            'is-today': cell && cell.date === today,
            selected: cell && cell.date === selectedDate
          }"
          @click="cell && selectDay(cell.date)"
        >
          <template v-if="cell">
            <div class="cell-top-bar">
              <span class="cell-day-number">{{ cell.day }}</span>
              <span v-if="cell.date === today" class="cell-today-pill">Hoy</span>
            </div>

            <!-- Previsualización de Chips de Eventos -->
            <div class="cell-chips-container">
              <div
                v-for="(ev, i) in (eventsByDate.get(cell.date) || []).slice(0, 3)"
                :key="i"
                class="cell-event-chip"
                :class="`cal-chip-${ev.type}`"
                :title="`${TYPE_LABELS[ev.type]}: ${ev.title}`"
              >
                <span class="chip-dot" :class="`cal-dot-${ev.type}`"></span>
                <span class="chip-text">{{ ev.title }}</span>
              </div>
              <span
                v-if="(eventsByDate.get(cell.date) || []).length > 3"
                class="cell-overflow-badge"
              >
                +{{ (eventsByDate.get(cell.date) || []).length - 3 }} más
              </span>
            </div>
          </template>
        </div>
      </div>

      <!-- Panel de Detalle del Día Seleccionado -->
      <aside class="calendar-detail">
        <div class="detail-header">
          <span class="eyebrow">DÍA SELECCIONADO</span>
          <h2>{{ selectedDateLabel }}</h2>
          <span class="detail-count-badge">
            {{ selectedEvents.length }} {{ selectedEvents.length === 1 ? 'evento' : 'eventos' }}
          </span>
        </div>

        <div class="detail-body">
          <div v-if="loading" class="calendar-empty">
            <span>Cargando eventos…</span>
          </div>
          <div v-else-if="selectedEvents.length === 0" class="calendar-empty">
            <p>Nada programado para este día.</p>
          </div>
          <div v-else class="detail-event-list">
            <div
              v-for="(ev, i) in selectedEvents"
              :key="i"
              class="detail-event-card"
              :class="{ clickable: ev.type === 'birthday' || ev.type === 'important_date' || ev.type === 'follow_up' }"
              @click="handleEventClick(ev)"
            >
              <div class="event-card-stripe" :class="`cal-dot-${ev.type}`"></div>
              <div class="detail-event-info">
                <span class="detail-event-title">{{ ev.title }}</span>
                <div class="detail-event-sub">
                  <span class="event-type-pill" :class="`cal-chip-${ev.type}`">
                    {{ TYPE_LABELS[ev.type] }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Modal de Contacto -->
    <PersonModal
      v-if="editingPerson"
      :person="editingPerson"
      @close="closeFicha"
      @saved="() => {}"
    />
  </div>
</template>
