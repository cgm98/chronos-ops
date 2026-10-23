<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  Play, Pause, RotateCcw, CheckCircle2, X, Terminal,
  Clock, GitBranch, ArrowRight, ShieldCheck, Activity, Layers
} from 'lucide-vue-next';
import type { RoutineWithStatus } from '../../../../types/routine.types';

const props = defineProps<{
  routine: RoutineWithStatus;
  chainIndex?: number;
  chainTotal?: number;
  currentLayer?: number;
  lamportClock?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'complete', id: string): void;
  (e: 'nextInChain'): void;
}>();

// Configuración de duración
const targetMinutes = computed(() => props.routine.duration_mins || props.routine.parsedMetadata?.duration_mins || 15);
const totalSeconds = computed(() => targetMinutes.value * 60);

const remainingSeconds = ref(totalSeconds.value);
const isRunning = ref(false);
const isCompleted = ref(props.routine.doneToday);
const logs = ref<Array<{ timestamp: string; message: string; level: 'info' | 'success' | 'warn' }>>([]);

let timerInterval: number | null = null;
let lastTimestamp = 0;

const logEvent = (message: string, level: 'info' | 'success' | 'warn' = 'info') => {
  const time = new Date().toISOString().substring(11, 19);
  logs.value.unshift({ timestamp: time, message, level });
  if (logs.value.length > 25) logs.value.pop();
};

const formattedTime = computed(() => {
  const m = Math.floor(remainingSeconds.value / 60);
  const s = Math.floor(remainingSeconds.value % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

const progressPercent = computed(() => {
  if (totalSeconds.value === 0) return 0;
  return Math.min(100, Math.max(0, ((totalSeconds.value - remainingSeconds.value) / totalSeconds.value) * 100));
});

const circleRadius = 110;
const circumference = 2 * Math.PI * circleRadius;
const strokeDashoffset = computed(() => {
  return circumference - (progressPercent.value / 100) * circumference;
});

const toggleTimer = () => {
  if (isRunning.value) {
    pauseTimer();
  } else {
    startTimer();
  }
};

const startTimer = () => {
  isRunning.value = true;
  lastTimestamp = performance.now();
  logEvent(`Session execution started [Target: ${targetMinutes.value}m]`, 'info');

  const loop = () => {
    if (!isRunning.value) return;
    const now = performance.now();
    const delta = (now - lastTimestamp) / 1000;
    lastTimestamp = now;

    if (remainingSeconds.value > 0) {
      remainingSeconds.value = Math.max(0, remainingSeconds.value - delta);
      timerInterval = requestAnimationFrame(loop);
    } else {
      isRunning.value = false;
      logEvent('Target duration reached (100% timebox completed)', 'success');
    }
  };

  timerInterval = requestAnimationFrame(loop);
};

const pauseTimer = () => {
  isRunning.value = false;
  if (timerInterval) {
    cancelAnimationFrame(timerInterval);
    timerInterval = null;
  }
  logEvent('Execution paused', 'warn');
};

const resetTimer = () => {
  pauseTimer();
  remainingSeconds.value = totalSeconds.value;
  logEvent('Timer reset to initial state', 'info');
};

const handleComplete = () => {
  pauseTimer();
  isCompleted.value = true;
  const currentClock = (props.lamportClock || 0) + 1;
  logEvent(`State committed with Lamport logical clock L=${currentClock}: ID=${props.routine.id}`, 'success');
  emit('complete', props.routine.id);

  if (props.chainTotal && props.chainTotal > 1) {
    setTimeout(() => {
      emit('nextInChain');
    }, 1200);
  } else {
    setTimeout(() => {
      emit('close');
    }, 1400);
  }
};

onMounted(() => {
  logEvent(`Initialized Execution Context for routine: "${props.routine.title}"`, 'info');
  if (props.currentLayer !== undefined) {
    logEvent(`DAG Topological Stratification: Wave Layer ${props.currentLayer}`, 'info');
  }
});

onUnmounted(() => {
  pauseTimer();
});
</script>

<template>
  <div class="execution-modal-overlay" @click.self="emit('close')">
    <div class="execution-console-card animate-scale-in">
      <button class="console-close-btn" @click="emit('close')" title="Cerrar (Esc)">
        <X :size="18" />
      </button>

      <!-- Header del Terminal de Ejecución -->
      <div class="console-header">
        <div class="console-badge-row">
          <span class="console-tag"><Terminal :size="13" /> EXECUTION RUNNER</span>
          <span v-if="chainTotal && chainTotal > 1" class="console-chain-badge">
            <GitBranch :size="12" /> Step {{ (chainIndex || 0) + 1 }} / {{ chainTotal }}
          </span>
          <span v-if="currentLayer !== undefined" class="console-layer-badge">
            <Layers :size="12" /> Layer {{ currentLayer }}
          </span>
          <span class="console-id-badge">L: {{ lamportClock || 0 }}</span>
        </div>

        <h2 class="console-title">{{ routine.title }}</h2>

        <div v-if="routine.anchor_cue || routine.parsedMetadata?.anchor_cue" class="console-cue-box">
          <span class="cue-label">PRE-CONDITION / ANCHOR:</span>
          <span class="cue-val">{{ routine.anchor_cue || routine.parsedMetadata?.anchor_cue }}</span>
        </div>
      </div>

      <!-- Temporizador Circular de Precisión -->
      <div class="console-timer-wrapper">
        <svg class="console-svg-ring" width="260" height="260" viewBox="0 0 260 260">
          <circle
            class="console-ring-bg"
            cx="130"
            cy="130"
            :r="circleRadius"
            stroke-width="8"
          />
          <circle
            class="console-ring-progress"
            cx="130"
            cy="130"
            :r="circleRadius"
            stroke-width="8"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="strokeDashoffset"
          />
        </svg>

        <div class="console-timer-center">
          <span class="console-digits">{{ formattedTime }}</span>
          <span class="console-status-text">
            {{ isRunning ? 'STATE: ACTIVE_EXECUTION' : (isCompleted ? 'STATE: COMMITTED' : 'STATE: IDLE') }}
          </span>
        </div>
      </div>

      <!-- Controles -->
      <div class="console-actions">
        <button class="console-btn-sec" @click="resetTimer" title="Reset">
          <RotateCcw :size="16" />
        </button>

        <button class="console-btn-pri" @click="toggleTimer">
          <Pause v-if="isRunning" :size="18" />
          <Play v-else :size="18" />
          <span>{{ isRunning ? 'Pause Engine' : 'Start Execution' }}</span>
        </button>

        <button
          class="console-btn-commit"
          :class="{ 'is-committed': isCompleted }"
          @click="handleComplete"
          title="Commit state with Lamport Clock increment"
        >
          <CheckCircle2 :size="18" />
          <span>{{ isCompleted ? 'Committed ✓' : (chainTotal && chainTotal > 1 ? 'Next DAG Step →' : 'Commit State') }}</span>
        </button>
      </div>

      <!-- Telemetría & Stream de Logs -->
      <div class="console-log-panel">
        <div class="log-panel-header">
          <span><Activity :size="12" /> Runtime Event Log & Lamport Telemetry</span>
          <span class="log-mono-sub">O(1) Delta Dispatch · L={{ (lamportClock || 0) + (isCompleted ? 1 : 0) }}</span>
        </div>
        <div class="log-stream">
          <div v-for="(l, idx) in logs" :key="idx" class="log-line" :class="l.level">
            <span class="log-time">[{{ l.timestamp }}]</span>
            <span class="log-msg">{{ l.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.execution-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 15, 29, 0.88);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.execution-console-card {
  position: relative;
  width: 100%;
  max-width: 520px;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  padding: 28px;
  color: #f8fafc;
  font-family: inherit;
}

.console-close-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.console-close-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.console-header {
  margin-bottom: 16px;
}

.console-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.console-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  padding: 3px 8px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  border-radius: 6px;
}

.console-chain-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.25);
  color: #38bdf8;
  border-radius: 6px;
}

.console-layer-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.25);
  color: #c084fc;
  border-radius: 6px;
}

.console-id-badge {
  font-size: 10px;
  font-family: monospace;
  color: #64748b;
  margin-left: auto;
}

.console-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  color: #ffffff;
}

.console-cue-box {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 10px;
  border-radius: 6px;
}

.cue-label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
}

.cue-val {
  color: #38bdf8;
  font-family: monospace;
}

/* Timer */
.console-timer-wrapper {
  position: relative;
  width: 260px;
  height: 260px;
  margin: 12px auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.console-svg-ring {
  transform: rotate(-90deg);
  position: absolute;
  inset: 0;
}

.console-ring-bg {
  fill: transparent;
  stroke: rgba(255, 255, 255, 0.06);
}

.console-ring-progress {
  fill: transparent;
  stroke: #6366f1;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear;
}

.console-timer-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.console-digits {
  font-size: 48px;
  font-weight: 800;
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  color: #ffffff;
}

.console-status-text {
  font-size: 10px;
  font-weight: 700;
  font-family: monospace;
  letter-spacing: 0.06em;
  color: #94a3b8;
}

/* Actions */
.console-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 18px;
}

.console-btn-pri {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #6366f1;
  color: #ffffff;
  border: 0;
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.console-btn-pri:hover {
  background: #4f46e5;
  transform: translateY(-1px);
}

.console-btn-sec {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.console-btn-sec:hover {
  color: #ffffff;
}

.console-btn-commit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
}
.console-btn-commit:hover {
  background: #10b981;
  color: #ffffff;
}
.console-btn-commit.is-committed {
  background: #10b981;
  color: #ffffff;
}

/* Log Panel */
.console-log-panel {
  background: #020617;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  text-align: left;
  font-family: monospace;
}

.log-panel-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 8px;
}

.log-mono-sub {
  font-size: 10px;
  color: #64748b;
}

.log-stream {
  max-height: 90px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-line {
  font-size: 11px;
  display: flex;
  gap: 6px;
}

.log-time {
  color: #64748b;
  flex-shrink: 0;
}

.log-line.info .log-msg { color: #cbd5e1; }
.log-line.success .log-msg { color: #34d399; }
.log-line.warn .log-msg { color: #fbbf24; }
</style>
