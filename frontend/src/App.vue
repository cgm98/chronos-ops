<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  LayoutDashboard, CheckSquare2, Workflow, CalendarDays,
  Activity, ArrowUpRight, Command, Sun, Moon
} from 'lucide-vue-next';

const route = useRoute();
const healthOk = ref(true);
const dateLabel = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
const sectionName = computed(() => ({
  overview: 'Vista general',
  tasks: 'Tareas',
  routines: 'Rutinas',
  calendar: 'Calendario'
})[String(route.name)] || 'Vista general');

let healthTimer: ReturnType<typeof setInterval> | undefined;

// --- Sidebar Colapsable ---
const isSidebarCollapsed = ref(localStorage.getItem('chronos_sidebar_collapsed') === 'true');
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem('chronos_sidebar_collapsed', String(isSidebarCollapsed.value));
};

// --- Tema Oscuro / Claro ---
const theme = ref<'dark' | 'light'>('dark');

const applyTheme = (t: 'dark' | 'light') => {
  theme.value = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('chronos_theme', t);
};

const toggleTheme = () => {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark');
};

const checkHealth = async () => {
  try {
    healthOk.value = (await fetch('/api/health')).ok;
  } catch {
    healthOk.value = false;
  }
};

onMounted(() => {
  const storedTheme = localStorage.getItem('chronos_theme') as 'dark' | 'light' | null;
  if (storedTheme) {
    applyTheme(storedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    applyTheme('light');
  } else {
    applyTheme('dark');
  }

  checkHealth();
  healthTimer = setInterval(checkHealth, 30000);
});

onUnmounted(() => {
  if (healthTimer) clearInterval(healthTimer);
});
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <!-- Sidebar Navegación Principal -->
    <aside class="sidebar" aria-label="Navegación principal">
      <!-- Logo interactivo para colapsar/desplegar sidebar -->
      <div
        class="brand-lockup cursor-pointer"
        role="button"
        tabindex="0"
        @click="toggleSidebar"
        @keydown.enter="toggleSidebar"
        title="Clic en el logo para contraer o desplegar el menú lateral"
        aria-label="Contraer o desplegar menú lateral"
      >
        <span class="brand-mark">
          <Activity :size="23" :stroke-width="2.4" />
        </span>
        <span v-if="!isSidebarCollapsed" class="brand-copy">
          <strong>chronos<span>.ops</span></strong>
          <small>WORKSPACE / 01</small>
        </span>
      </div>

      <div v-if="!isSidebarCollapsed" class="sidebar-section-label">ESPACIO DE TRABAJO</div>
      <nav class="sidebar-nav">
        <RouterLink
          to="/"
          class="sidebar-link"
          active-class="active"
          exact-active-class="active"
          :title="isSidebarCollapsed ? 'Resumen' : undefined"
        >
          <LayoutDashboard :size="19" />
          <span v-if="!isSidebarCollapsed">Resumen</span>
        </RouterLink>

        <RouterLink
          to="/tasks"
          class="sidebar-link"
          active-class="active"
          :title="isSidebarCollapsed ? 'Tareas' : undefined"
        >
          <CheckSquare2 :size="19" />
          <span v-if="!isSidebarCollapsed">Tareas</span>
        </RouterLink>

        <RouterLink
          to="/routines"
          class="sidebar-link"
          active-class="active"
          :title="isSidebarCollapsed ? 'Rutinas' : undefined"
        >
          <Workflow :size="19" />
          <span v-if="!isSidebarCollapsed">Rutinas</span>
        </RouterLink>

        <RouterLink
          to="/calendar"
          class="sidebar-link"
          active-class="active"
          :title="isSidebarCollapsed ? 'Calendario' : undefined"
        >
          <CalendarDays :size="19" />
          <span v-if="!isSidebarCollapsed">Calendario</span>
        </RouterLink>
      </nav>

      <div class="sidebar-spacer"></div>

      <div v-if="!isSidebarCollapsed" class="sidebar-note">
        <span class="note-kicker"><Command :size="14" /> SISTEMA DE EJECUCIÓN</span>
        <p>Del plan a la acción, con cada dependencia a la vista.</p>
        <RouterLink to="/routines">Explorar rutinas <ArrowUpRight :size="15" /></RouterLink>
      </div>

      <div class="sidebar-footer">
        <span class="status-light" :class="{ online: healthOk }" :title="healthOk ? 'Conectado al servidor' : 'Sin conexión'"></span>
        <span v-if="!isSidebarCollapsed">{{ healthOk ? 'Sistema conectado' : 'Sin conexión' }}</span>
        <span v-if="!isSidebarCollapsed" class="sidebar-version">v0.1</span>
      </div>
    </aside>

    <!-- Contenido Principal -->
    <div class="shell-main">
      <header class="topbar">
        <div class="topbar-context">
          <span>CHRONOS OPS</span>
          <span class="breadcrumb-slash">/</span>
          <strong>{{ sectionName }}</strong>
        </div>

        <div class="topbar-right">
          <span class="topbar-date">{{ dateLabel }}</span>

          <!-- Botón de Tema Oscuro / Claro -->
          <button
            type="button"
            class="theme-toggle-btn"
            @click="toggleTheme"
            :title="theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            aria-label="Alternar tema de interfaz"
          >
            <Sun v-if="theme === 'dark'" :size="18" />
            <Moon v-else :size="18" />
          </button>
        </div>
      </header>

      <main class="app-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
@import './assets/styles/chronos-design.css';
</style>
