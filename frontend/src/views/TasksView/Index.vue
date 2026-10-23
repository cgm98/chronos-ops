<script setup lang="ts">
import './style.css';
import { ref, computed, onMounted } from 'vue';
import {
  Plus, ChevronLeft, ChevronRight, Trash2, Loader2,
  AlertCircle, ChevronDown, ChevronUp, Edit3, Check, X
} from 'lucide-vue-next';
import { useTaskStore } from '../../stores/task.store';
import { usePersonStore } from '../../stores/person.store';
import { useProjectStore } from '../../stores/project.store';
import Modal from '../../components/Modal/Index.vue';
import { useTaskKpis } from './composables/useTaskKpis';
import type { Task, TaskStatus, TaskPriority } from '../../types/task.types';

const taskStore = useTaskStore();
const personStore = usePersonStore();
const projectStore = useProjectStore();
const { kpis, fetchKpis } = useTaskKpis();

// Columnas base
const DEFAULT_COLUMN_LABELS: Record<TaskStatus, string> = {
  todo: 'Pendiente',
  in_progress: 'En curso',
  blocked: 'Bloqueada',
  done: 'Hecha'
};

const columnLabels = ref<Record<TaskStatus, string>>({ ...DEFAULT_COLUMN_LABELS });

// Persistencia local de nombres personalizados de columnas
const savedLabels = localStorage.getItem('chronos_column_labels');
if (savedLabels) {
  try {
    columnLabels.value = { ...DEFAULT_COLUMN_LABELS, ...JSON.parse(savedLabels) };
  } catch (e) {
    console.error(e);
  }
}

const COLUMNS: { status: TaskStatus }[] = [
  { status: 'todo' },
  { status: 'in_progress' },
  { status: 'blocked' },
  { status: 'done' }
];
const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];

// Edición de nombre de columna
const editingColStatus = ref<TaskStatus | null>(null);
const tempColName = ref('');

const startEditColName = (status: TaskStatus) => {
  editingColStatus.value = status;
  tempColName.value = columnLabels.value[status];
};

const saveColName = (status: TaskStatus) => {
  const trimmed = tempColName.value.trim();
  if (trimmed) {
    columnLabels.value[status] = trimmed;
    localStorage.setItem('chronos_column_labels', JSON.stringify(columnLabels.value));
  }
  editingColStatus.value = null;
};

const cancelEditColName = () => {
  editingColStatus.value = null;
};

const initialLoading = computed(() => taskStore.loading && taskStore.tasks.length === 0);
const PRIORITY_LABELS: Record<TaskPriority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };

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

onMounted(async () => {
  try {
    await Promise.all([taskStore.fetchTasks(), personStore.fetchPeople(), projectStore.fetchProjects(), fetchKpis()]);
  } catch (e) {
    console.error(e);
  }
});

const ringOffset = (pct: number) => {
  const clamped = Math.max(0, Math.min(100, pct));
  return 138 - (138 * clamped) / 100;
};

// --- Formulario Modal con Progressive Disclosure ---
const showFormModal = ref(false);
const editingId = ref<string | null>(null);
const showMoreOptions = ref(false);

const fTitle = ref('');
const fDueDate = ref('');
const fPriority = ref<TaskPriority>('medium');
const fStatus = ref<TaskStatus>('todo');
const fDescription = ref('');
const fAssigneeId = ref('');
const fProjectId = ref('');

const errors = ref<{ title?: string }>({});

// Apertura con preselección rápida de columna
const openCreate = (defaultStatus: TaskStatus = 'todo') => {
  editingId.value = null;
  fTitle.value = '';
  fDueDate.value = '';
  fPriority.value = 'medium';
  fStatus.value = defaultStatus;
  fDescription.value = '';
  fAssigneeId.value = '';
  fProjectId.value = '';
  showMoreOptions.value = false;
  errors.value = {};
  showFormModal.value = true;
};

const startEdit = (t: Task) => {
  editingId.value = t.id;
  fTitle.value = t.title;
  fDueDate.value = t.due_date || '';
  fPriority.value = t.priority;
  fStatus.value = t.status;
  fDescription.value = t.description || '';
  fAssigneeId.value = t.assignee_id || '';
  fProjectId.value = t.project_id || '';
  showMoreOptions.value = !!(t.description || t.assignee_id || t.project_id);
  errors.value = {};
  showFormModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
};

const validateForm = (): boolean => {
  const errs: typeof errors.value = {};
  if (!fTitle.value.trim()) {
    errs.title = 'El nombre de la tarea es obligatorio.';
  }
  errors.value = errs;
  return Object.keys(errs).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  const payload = {
    title: fTitle.value.trim(),
    due_date: fDueDate.value || null,
    priority: fPriority.value,
    status: fStatus.value,
    description: fDescription.value.trim() || null,
    assignee_id: fAssigneeId.value || null,
    project_id: fProjectId.value || null
  };

  try {
    if (editingId.value) {
      await taskStore.updateTask(editingId.value, payload);
      triggerToast('Tarea actualizada correctamente');
    } else {
      const created = await taskStore.createTask(payload);
      triggerToast('Tarea creada con éxito');
      const matchesFilter = !personFilter.value
        || (personFilter.value === 'mine' ? !created.assignee_id : created.assignee_id === personFilter.value);
      if (!matchesFilter) personFilter.value = '';
    }
    showFormModal.value = false;
    fetchKpis();
  } catch (e: any) {
    triggerToast(e.message || 'Error al guardar la tarea', 'error');
  }
};

// --- Filtro por persona ---
const personFilter = ref('');
const assignedPersonIds = computed(() => new Set(taskStore.tasks.map(t => t.assignee_id).filter(Boolean)));
const teamPeople = computed(() => personStore.people.filter(p => assignedPersonIds.value.has(p.id)));

const filteredTasks = computed(() => {
  if (!personFilter.value) return taskStore.tasks;
  if (personFilter.value === 'mine') return taskStore.tasks.filter(t => !t.assignee_id);
  return taskStore.tasks.filter(t => t.assignee_id === personFilter.value);
});

const tasksByStatus = (status: TaskStatus) =>
  filteredTasks.value
    .filter(t => t.status === status)
    .sort((a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1);

const personName = (id: string | null) => {
  if (!id) return null;
  return personStore.people.find(p => p.id === id)?.name || '?';
};
const projectName = (id: string | null) => {
  if (!id) return null;
  return projectStore.projects.find(p => p.id === id)?.name || null;
};

const today = new Date().toISOString().slice(0, 10);
const isOverdue = (t: Task) => t.due_date !== null && t.due_date < today && t.status !== 'done';
const isDueSoon = (t: Task) => {
  if (!t.due_date || t.status === 'done' || isOverdue(t)) return false;
  const limit = new Date(); limit.setDate(limit.getDate() + 3);
  return t.due_date <= limit.toISOString().slice(0, 10);
};
const formatDue = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

// --- Drag & Drop Robusto ---
const draggingId = ref<string | null>(null);
const dragOverStatus = ref<TaskStatus | null>(null);

const onDragStart = (e: DragEvent, t: Task) => {
  draggingId.value = t.id;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', t.id);
  }
};

const onDragEnd = () => {
  draggingId.value = null;
  dragOverStatus.value = null;
};

const onDragOver = (e: DragEvent, status: TaskStatus) => {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  if (dragOverStatus.value !== status) {
    dragOverStatus.value = status;
  }
};

const onColumnDragLeave = (e: DragEvent, status: TaskStatus) => {
  const related = e.relatedTarget as Node | null;
  const column = e.currentTarget as Node;
  if (related && column.contains(related)) return;
  if (dragOverStatus.value === status) dragOverStatus.value = null;
};

const onDrop = async (e: DragEvent, status: TaskStatus) => {
  e.preventDefault();
  const id = draggingId.value || e.dataTransfer?.getData('text/plain');
  dragOverStatus.value = null;
  draggingId.value = null;
  if (!id) return;
  const task = taskStore.tasks.find(t => t.id === id);
  if (!task || task.status === status) return;
  try {
    await taskStore.updateTask(id, { status });
    triggerToast(`Tarea movida a ${columnLabels.value[status]}`);
    fetchKpis();
  } catch (e: any) {
    triggerToast(e.message || 'Error al mover tarea', 'error');
  }
};

const moveTask = async (t: Task, direction: -1 | 1) => {
  const nextIndex = STATUS_ORDER.indexOf(t.status) + direction;
  if (nextIndex < 0 || nextIndex >= STATUS_ORDER.length) return;
  try {
    await taskStore.updateTask(t.id, { status: STATUS_ORDER[nextIndex] });
    fetchKpis();
  } catch (e: any) {
    triggerToast(e.message || 'Error al mover', 'error');
  }
};

// --- Eliminar ---
const showDeleteModal = ref(false);
const taskToDeleteId = ref('');
const clickDelete = (id: string) => {
  taskToDeleteId.value = id;
  showDeleteModal.value = true;
};
const confirmDelete = async () => {
  showDeleteModal.value = false;
  try {
    await taskStore.deleteTask(taskToDeleteId.value);
    triggerToast('Tarea eliminada');
    fetchKpis();
  } catch (e: any) {
    triggerToast(e.message || 'Error al eliminar', 'error');
  }
};
</script>

<template>
  <div class="tasks-container animate-fade-in">
    <!-- Header Principal -->
    <header class="tasks-header">
      <div class="header-titles">
        <span class="eyebrow">FLUJO DE TRABAJO / KANBAN</span>
        <h1>Tareas</h1>
        <p>Gestiona prioridades, responsables y fechas de entrega con claridad.</p>
      </div>
      <div class="header-actions">
        <button class="btn-primary" @click="openCreate('todo')">
          <Plus :size="16" />
          <span>Nueva tarea</span>
        </button>
      </div>
    </header>

    <!-- Fila de Indicadores Operativos -->
    <section v-if="kpis" class="task-kpi-row">
      <div class="task-kpi-card">
        <div class="task-kpi-info">
          <span class="label">Total</span>
          <span class="value">{{ kpis.total }}</span>
          <span class="desc">{{ kpis.byStatus.done }} hechas, {{ kpis.byStatus.todo }} pendientes</span>
        </div>
      </div>

      <div class="task-kpi-card">
        <div class="task-kpi-info">
          <span class="label">Vencidas</span>
          <span class="value" :class="{ 'warning-text': kpis.overdueCount > 0 }">{{ kpis.overdueCount }}</span>
          <span class="desc">Sin completar, fecha límite pasada</span>
        </div>
      </div>

      <div class="task-kpi-card">
        <div class="task-kpi-info">
          <span class="label">En curso</span>
          <span class="value">{{ kpis.byStatus.in_progress }}</span>
          <span class="desc">{{ kpis.byStatus.blocked }} bloqueadas</span>
        </div>
      </div>

      <div class="task-kpi-card">
        <div class="task-kpi-info">
          <span class="label">Cumplimiento (30d)</span>
          <span class="value">{{ kpis.completionRate30d !== null ? kpis.completionRate30d + '%' : '—' }}</span>
          <span class="desc">{{ kpis.completionRate30d !== null ? 'De lo tocado en 30 días' : 'Sin actividad reciente' }}</span>
        </div>
        <div v-if="kpis.completionRate30d !== null" class="task-kpi-visual">
          <svg class="task-ring" width="56" height="56">
            <circle class="task-ring-bg" cx="28" cy="28" r="22" />
            <circle class="task-ring-fill" cx="28" cy="28" r="22" stroke-dasharray="138" :stroke-dashoffset="ringOffset(kpis.completionRate30d)" />
          </svg>
        </div>
      </div>
    </section>

    <!-- Filtros de Responsable -->
    <div class="tasks-filters">
      <button class="filter-chip" :class="{ active: personFilter === '' }" @click="personFilter = ''">
        Todas ({{ taskStore.tasks.length }})
      </button>
      <button class="filter-chip" :class="{ active: personFilter === 'mine' }" @click="personFilter = 'mine'">
        Mías
      </button>
      <button
        v-for="p in teamPeople" :key="p.id"
        class="filter-chip" :class="{ active: personFilter === p.id }"
        @click="personFilter = p.id"
      >{{ p.name }}</button>
    </div>

    <!-- Tablero Kanban de Altura Completa (100dvh) con Scroll Desacoplado -->
    <div class="kanban-viewport-wrap">
      <div class="kanban" v-if="initialLoading">
        <div v-for="col in COLUMNS" :key="col.status" class="kanban-col" :class="col.status">
          <div class="kanban-col-header">
            <span class="col-title">{{ columnLabels[col.status] }}</span>
          </div>
          <div class="kanban-col-body">
            <div class="task-card-skeleton" v-for="n in 3" :key="n"></div>
          </div>
        </div>
      </div>

      <div class="kanban" v-else>
        <div
          v-for="col in COLUMNS" :key="col.status"
          class="kanban-col"
          :class="[col.status, { 'drag-over': dragOverStatus === col.status }]"
          @dragover="onDragOver($event, col.status)"
          @dragleave="onColumnDragLeave($event, col.status)"
          @drop="onDrop($event, col.status)"
        >
          <!-- Encabezado de Columna con Nombre Editable -->
          <div class="kanban-col-header">
            <div class="col-title-wrap">
              <template v-if="editingColStatus === col.status">
                <input
                  v-model="tempColName"
                  class="col-title-input"
                  autofocus
                  @keydown.enter="saveColName(col.status)"
                  @keydown.esc="cancelEditColName"
                  @blur="saveColName(col.status)"
                />
                <button type="button" class="col-btn-icon" @click="saveColName(col.status)" title="Guardar nombre">
                  <Check :size="12" />
                </button>
                <button type="button" class="col-btn-icon" @click="cancelEditColName" title="Cancelar">
                  <X :size="12" />
                </button>
              </template>
              <template v-else>
                <span class="col-title" @dblclick="startEditColName(col.status)" title="Doble clic para editar nombre">
                  {{ columnLabels[col.status] }}
                </span>
                <button
                  type="button"
                  class="col-edit-btn"
                  @click="startEditColName(col.status)"
                  title="Editar nombre de la columna"
                >
                  <Edit3 :size="11" />
                </button>
              </template>
            </div>
            <span class="col-count">{{ tasksByStatus(col.status).length }}</span>
          </div>

          <!-- Cuerpo con Scroll Desacoplado y Drag & Drop -->
          <div class="kanban-col-body">
            <div
              v-for="t in tasksByStatus(col.status)" :key="t.id"
              class="task-card"
              :class="[`priority-${t.priority}`, { dragging: draggingId === t.id, done: t.status === 'done' }]"
              draggable="true"
              @dragstart="onDragStart($event, t)"
              @dragend="onDragEnd"
              @click="startEdit(t)"
            >
              <div class="task-top">
                <span class="priority-dot" :class="t.priority" :title="`Prioridad ${PRIORITY_LABELS[t.priority]}`"></span>
                <span class="task-title">{{ t.title }}</span>
              </div>
              <p v-if="t.description" class="task-desc">{{ t.description }}</p>
              <div class="task-meta">
                <span v-if="t.due_date" class="due-badge" :class="{ overdue: isOverdue(t), soon: isDueSoon(t) }">
                  {{ formatDue(t.due_date) }}
                </span>
                <span v-if="projectName(t.project_id)" class="project-badge">{{ projectName(t.project_id) }}</span>
                <span class="assignee-badge" :class="{ mine: !t.assignee_id }">{{ personName(t.assignee_id) || 'Yo' }}</span>

                <span class="task-actions">
                  <button
                    v-if="STATUS_ORDER.indexOf(t.status) > 0"
                    class="task-move" title="Mover a columna anterior"
                    @click.stop="moveTask(t, -1)"
                  ><ChevronLeft :size="14" /></button>
                  <button
                    v-if="STATUS_ORDER.indexOf(t.status) < STATUS_ORDER.length - 1"
                    class="task-move" title="Mover a siguiente columna"
                    @click.stop="moveTask(t, 1)"
                  ><ChevronRight :size="14" /></button>
                  <button class="task-delete" title="Eliminar" @click.stop="clickDelete(t.id)"><Trash2 :size="14" /></button>
                </span>
              </div>
            </div>

            <!-- Estado Vacío por Columna -->
            <div v-if="tasksByStatus(col.status).length === 0" class="col-empty">
              <span>Sin tareas en esta etapa</span>
            </div>
          </div>

          <!-- Pie de Columna: Botón Rápido "+ Añadir tarea" -->
          <div class="kanban-col-footer">
            <button
              type="button"
              class="quick-add-btn"
              @click="openCreate(col.status)"
            >
              <Plus :size="14" />
              <span>Añadir tarea</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Formulario de Tarea (Campos Esenciales + Plegable) -->
    <Modal
      :show="showFormModal"
      :title="editingId ? 'Editar tarea' : 'Nueva tarea'"
      max-width="520px"
      @close="closeFormModal"
    >
      <form @submit.prevent="handleSubmit" class="form-stack">
        <!-- 1. Nombre (Esencial) -->
        <div class="form-group">
          <label for="task-title">Nombre de la tarea *</label>
          <input
            id="task-title"
            v-model="fTitle"
            type="text"
            placeholder="Ej: Revisar especificaciones de arquitectura"
            :class="{ 'has-error': errors.title }"
            @input="delete errors.title"
            autofocus
          />
          <span v-if="errors.title" class="field-error">
            <AlertCircle :size="13" /> {{ errors.title }}
          </span>
        </div>

        <!-- 2. Fecha, Prioridad y Estado (Esenciales en fila) -->
        <div class="form-row">
          <div class="form-group">
            <label for="task-due">Fecha límite</label>
            <input id="task-due" v-model="fDueDate" type="date" />
          </div>

          <div class="form-group">
            <label for="task-priority">Prioridad</label>
            <select id="task-priority" v-model="fPriority">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div class="form-group">
            <label for="task-col-status">Estado / Columna</label>
            <select id="task-col-status" v-model="fStatus">
              <option v-for="col in COLUMNS" :key="col.status" :value="col.status">
                {{ columnLabels[col.status] }}
              </option>
            </select>
          </div>
        </div>

        <!-- 3. Sección Plegable: Más Detalles -->
        <div class="form-collapsible">
          <button
            type="button"
            class="collapsible-trigger"
            @click="showMoreOptions = !showMoreOptions"
          >
            <component :is="showMoreOptions ? ChevronUp : ChevronDown" :size="16" />
            <span>{{ showMoreOptions ? 'Menos detalles' : 'Más detalles (responsable, proyecto, notas)' }}</span>
          </button>

          <div v-if="showMoreOptions" class="collapsible-body">
            <!-- Responsable -->
            <div class="form-group">
              <label for="task-assignee">Responsable</label>
              <select id="task-assignee" v-model="fAssigneeId">
                <option value="">Yo (sin asignar)</option>
                <option v-for="p in personStore.people" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>

            <!-- Proyecto -->
            <div class="form-group">
              <label for="task-project">Proyecto</label>
              <select id="task-project" v-model="fProjectId">
                <option value="">Sin proyecto</option>
                <option v-for="p in projectStore.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>

            <!-- Notas / Descripción -->
            <div class="form-group">
              <label for="task-desc">Notas adicionales</label>
              <textarea
                id="task-desc"
                v-model="fDescription"
                rows="3"
                placeholder="Detalles técnicos, contexto o enlaces relevantes..."
              ></textarea>
            </div>
          </div>
        </div>
      </form>

      <!-- Footer del Modal -->
      <template #footer>
        <button type="button" class="btn-secondary" @click="closeFormModal">
          Cancelar
        </button>
        <button type="button" class="btn-primary" @click="handleSubmit">
          {{ editingId ? 'Guardar cambios' : 'Crear tarea' }}
        </button>
      </template>
    </Modal>

    <!-- Modal Confirmar Eliminación (Funcional con el nuevo Modal) -->
    <Modal
      v-if="showDeleteModal"
      title="Confirmar eliminación"
      message="¿Estás seguro de que deseas eliminar esta tarea de forma permanente?"
      confirm-label="Eliminar tarea"
      :destructive="true"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />

    <!-- Toast Notification -->
    <div class="toast-notification" :class="{ 'visible': toastVisible, 'is-error': toastType === 'error' }">
      {{ toastMsg }}
    </div>
  </div>
</template>
