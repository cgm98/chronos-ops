<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { ArrowUpRight, ArrowRight, CheckCircle2, Circle, CalendarDays, Workflow, ListTodo, Sparkles } from 'lucide-vue-next';
import { useTaskStore } from '../stores/task.store';
import { useRoutineStore } from '../stores/routine.store';
import { todayLocal } from '../lib/recurrence';

const tasks = useTaskStore();
const routines = useRoutineStore();
const today = todayLocal();
const openTasks = computed(() => tasks.tasks.filter(t => t.status !== 'done'));
const dueTasks = computed(() => openTasks.value.filter(t => t.due_date && t.due_date <= today).sort((a,b) => (a.due_date || '').localeCompare(b.due_date || '')).slice(0,5));
const todayRoutines = computed(() => routines.routines.filter(r => r.active && r.dueToday));
const doneRoutines = computed(() => todayRoutines.value.filter(r => r.doneToday).length);
const completedTasks = computed(() => tasks.tasks.filter(t => t.status === 'done').length);
const progress = computed(() => todayRoutines.value.length ? Math.round(doneRoutines.value / todayRoutines.value.length * 100) : 0);
const dateLabel = new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
onMounted(() => { void Promise.all([tasks.fetchTasks(), routines.fetchRoutines()]); });
</script>

<template>
  <div class="overview-page">
    <div class="overview-heading"><div><span class="eyebrow">CENTRO DE OPERACIONES / HOY</span><h1>Tu día, con claridad.</h1><p>Una vista simple de lo que avanza y de lo que necesita tu atención.</p></div><RouterLink to="/calendar" class="date-link"><CalendarDays :size="17" /> {{ dateLabel }} <ArrowUpRight :size="16" /></RouterLink></div>

    <section class="overview-hero" aria-label="Progreso de hoy"><div class="hero-copy"><span class="hero-kicker"><Sparkles :size="15" /> RITMO DEL DÍA</span><h2>{{ progress }}<span>%</span></h2><p>de tus rutinas programadas para hoy están completas.</p><div class="hero-progress"><span :style="{width: `${progress}%`}"></span></div><RouterLink to="/routines">Continuar con rutinas <ArrowRight :size="17" /></RouterLink></div><div class="hero-orbit" aria-hidden="true"><div class="orbit-ring orbit-ring-outer"></div><div class="orbit-ring orbit-ring-inner"></div><div class="orbit-core"><Workflow :size="48" :stroke-width="1.3" /></div></div></section>

    <div class="overview-metrics"><article class="metric-card"><div class="metric-icon coral"><ListTodo :size="20" /></div><span class="metric-label">Tareas abiertas</span><strong>{{ openTasks.length }}</strong><p>Elementos por resolver</p></article><article class="metric-card"><div class="metric-icon mint"><CheckCircle2 :size="20" /></div><span class="metric-label">Tareas completadas</span><strong>{{ completedTasks }}</strong><p>Avances registrados</p></article><article class="metric-card"><div class="metric-icon lavender"><Workflow :size="20" /></div><span class="metric-label">Rutinas de hoy</span><strong>{{ doneRoutines }}<small> / {{ todayRoutines.length }}</small></strong><p>Pasos completados</p></article></div>

    <div class="overview-columns"><section class="overview-panel"><div class="panel-head"><div><span class="eyebrow">PRIORIDADES</span><h2>En tu radar</h2></div><RouterLink to="/tasks">Ver tareas <ArrowUpRight :size="16" /></RouterLink></div><p v-if="tasks.loading && !tasks.tasks.length" class="overview-empty">Cargando tareas…</p><p v-else-if="!dueTasks.length" class="overview-empty">Todo despejado por ahora. Las tareas con fecha límite aparecerán aquí.</p><div v-else class="overview-list"><RouterLink v-for="task in dueTasks" :key="task.id" to="/tasks" class="overview-list-item"><span class="list-icon"><Circle :size="18" /></span><span class="list-copy"><strong>{{ task.title }}</strong><small>{{ task.due_date === today ? 'Vence hoy' : `Fecha límite · ${task.due_date}` }}</small></span><span class="priority-tag" :class="task.priority">{{ task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baja' : 'Media' }}</span></RouterLink></div></section>
      <section class="overview-panel"><div class="panel-head"><div><span class="eyebrow">HÁBITOS</span><h2>Cadena de hoy</h2></div><RouterLink to="/routines">Ver rutinas <ArrowUpRight :size="16" /></RouterLink></div><p v-if="routines.loading && !routines.routines.length" class="overview-empty">Cargando rutinas…</p><p v-else-if="!todayRoutines.length" class="overview-empty">No hay rutinas programadas para hoy.</p><div v-else class="overview-list"><RouterLink v-for="routine in todayRoutines.slice(0,5)" :key="routine.id" to="/routines" class="overview-list-item"><span class="list-icon" :class="{ done: routine.doneToday }"><CheckCircle2 v-if="routine.doneToday" :size="18" /><Circle v-else :size="18" /></span><span class="list-copy"><strong>{{ routine.title }}</strong><small>{{ routine.duration_mins }} min · {{ routine.currentStreak }} días de racha</small></span><span class="routine-state">{{ routine.doneToday ? 'Hecha' : 'Pendiente' }}</span></RouterLink></div></section></div>
  </div>
</template>
