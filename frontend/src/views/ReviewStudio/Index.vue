<script setup lang="ts">
import './style.css';
import { ref, computed } from 'vue';
import { useReviewStudio } from '../../composables/useReviewStudio';
import { useMarkdown } from '../../composables/useMarkdown';
import { useSound } from '../../composables/useSound';
import { useTextToSpeech } from '../../composables/useTextToSpeech';
import { useSpeedBonus } from '../../composables/useSpeedBonus';
import { useConfettiBurst } from '../../composables/useConfettiBurst';
import { gradeAnswer } from '../../lib/answerGrading';

const { playSound } = useSound();

const {
  store,
  activeFilter,
  activeFilterLabel,
  activeFilterCount,
  streakDays,
  sessionActive,
  sessionComplete,
  practiceMode,
  selectedPracticeDomain,
  currentIdx,
  rawUserAnswer,
  showAnswerReveal,
  selectedRating,
  activeQueue,
  getDueCounts,
  selectFilter,
  startSession,
  startDomainPractice,
  currentQuestion,
  currentConcept,
  activeDomainColor,
  activeDomainName,
  showIntuition,
  showExplanation,
  pressedKey,
  handleReveal,
  handleRateClick,
  ratingCounts,
  reload
} = useReviewStudio();

const { render } = useMarkdown();

const renderGhostMode = (md: string) => {
  if (!md) return '';
  const processed = md.replace(/\{\{(.*?)\}\}/g, '<span class="ghost-cloze">$1</span>');
  return render(processed);
};

// === Feature 12: Text-to-Speech ===
const { isSpeaking, speak } = useTextToSpeech();
const speakCard = () => {
  if (!currentQuestion.value) return;
  const text = `${currentQuestion.value.prompt}. ${showAnswerReveal.value ? currentQuestion.value.answer : ''}`.replace(/<[^>]+>/g, '');
  speak(text);
};

// === Feature 13: Speed Bonus Timer ===
const { speedTimeLeft, speedBonus, bonusEligible, claimSpeedBonus } = useSpeedBonus(
  currentQuestion,
  sessionActive,
  showAnswerReveal,
  () => { if (playSound) playSound('success'); }
);

// === Feature 14: Confetti ===
const { showConfetti, confettiParticles, launch: launchConfettiBurst } = useConfettiBurst();
const launchConfetti = () => {
  launchConfettiBurst();
  if (playSound) playSound('complete');
};

// === Feature 15: Leech Tracker ===
// leechData tiene que ser reactivo: si es un objeto plano mutado a mano,
// el computed `leeches` no vuelve a evaluar cuando cambia (Vue no lo está
// trackeando), así que el panel de "Conceptos más difíciles" se quedaba
// mostrando el estado de la carga de página, no los fallos de la sesión actual.
const leechData = ref<Record<string, number>>(JSON.parse(localStorage.getItem('leech-tracker') || '{}'));
const leeches = computed(() => {
  const entries = Object.entries(leechData.value)
    .map(([id, count]) => ({ id, count: count as number, concept: store.concepts.find((c: any) => c.id === id) }))
    .filter(e => e.concept)
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5);
  return entries;
});

// Grading determinístico pre-LLM (fuzzy match / cobertura de keywords): pista objetiva
// junto al intento del usuario antes de que se autocalifique 1-4 — no reemplaza el rating.
const answerGrade = computed(() => {
  if (!showAnswerReveal.value || !currentQuestion.value?.answer) return null;
  return gradeAnswer(rawUserAnswer.value, currentQuestion.value.answer);
});

// Track fails
const trackHandleRateClick = (rating: number) => {
  if (rating === 1 && currentConcept.value) {
    leechData.value[currentConcept.value.id] = (leechData.value[currentConcept.value.id] || 0) + 1;
    localStorage.setItem('leech-tracker', JSON.stringify(leechData.value));
  }
  if (rating === 3 || rating === 4) claimSpeedBonus();
  handleRateClick(rating);
  // Sesión perfecta: última tarjeta, sin fallos previos y esta tampoco falló
  const isLast = currentIdx.value >= activeQueue.value.length - 1;
  if (isLast && rating !== 1 && (ratingCounts.value?.again || 0) === 0) {
    setTimeout(launchConfetti, 800);
  }
};
</script>

<template>
  <div class="review-studio-container">
    
    <!-- 1. DASHBOARD PRINCIPAL (SELECTOR DE SESIÓN) -->
    <div v-if="!sessionActive && !sessionComplete" class="dashboard-layout animate-fade-in">
      <header class="dashboard-header review-dashboard-header">
        <div>
          <h1>Decision Logs & Trade-offs Review</h1>
          <p>Audita las decisiones arquitectónicas del sistema, analiza post-mortems y refuerza el entendimiento de contratos de dominio.</p>
        </div>
        <div v-if="streakDays > 0" class="streak-badge" title="Racha de revisiones arquitectónicas continuas">
          <span class="streak-icon">⚡</span>
          <div class="streak-info">
            <span class="streak-count">{{ streakDays }} {{ streakDays === 1 ? 'Día' : 'Días' }}</span>
            <span class="streak-label">Racha de Auditoría</span>
          </div>
        </div>
      </header>

      <div class="dashboard-grid">
        <!-- Panel de Filtros -->
        <div class="filters-panel">
          <h3 class="panel-section-title">Filtros Inteligentes</h3>
          <div class="selectors-grid">
            <button @click="selectFilter('all')" class="selector-card" :class="{ 'active': activeFilter === 'all' }">
              <span class="dot all"></span>
              <div class="info">
                <span class="title">Todos los vencidos</span>
                <span class="count">{{ getDueCounts.all }} pendientes</span>
              </div>
            </button>
            <button @click="selectFilter('critical')" class="selector-card" :class="{ 'active': activeFilter === 'critical' }">
              <span class="dot critical"></span>
              <div class="info">
                <span class="title">Prioridad Crítica</span>
                <span class="count">{{ getDueCounts.critical }} pendientes</span>
              </div>
            </button>
            <button @click="selectFilter('due')" class="selector-card" :class="{ 'active': activeFilter === 'due' }">
              <span class="dot due"></span>
              <div class="info">
                <span class="title">Vencen hoy</span>
                <span class="count">{{ getDueCounts.dueToday }} pendientes</span>
              </div>
            </button>
            <button @click="selectFilter('tomorrow')" class="selector-card" :class="{ 'active': activeFilter === 'tomorrow' }">
              <span class="dot tomorrow"></span>
              <div class="info">
                <span class="title">Vencen mañana</span>
                <span class="count">{{ getDueCounts.dueTomorrow }} pendientes</span>
              </div>
            </button>
          </div>

          <h3 class="panel-section-title u-mt-xl">Filtrar por Dominio</h3>
          <div class="selectors-grid">
            <button v-for="d in store.domains" :key="d.id" @click="selectFilter(d.id)" class="selector-card" :class="{ 'active': activeFilter === d.id }">
              <span class="dot" :style="{ backgroundColor: d.color }"></span>
              <div class="info">
                <span class="title">{{ d.name }}</span>
                <span class="count">{{ getDueCounts.domains[d.id] || 0 }} conceptos</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Panel de Acción Principal -->
        <div class="action-panel">
          <div class="action-box">
            <div class="box-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" class="u-text-accent">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <h2>Comenzar Sesión</h2>
            <p>Se generará una sesión de revisión de decisiones y conceptos arquitectónicos pendientes según el filtro.</p>
            
            <div class="filter-pill">
              <span class="pill-label">Filtro:</span>
              <span class="pill-value">{{ activeFilterLabel }}</span>
              <span class="pill-count">{{ activeFilterCount }} pendientes</span>
            </div>

            <button @click="startSession" class="btn-primary-start" :disabled="activeFilterCount === 0">
              {{ activeFilterCount === 0 ? 'Sin decisiones pendientes' : 'Iniciar Revisión de Decisiones' }}
            </button>
          </div>
        </div>
      </div>

      <!-- SECCIÓN: PRÁCTICA ACTIVA POR DOMINIO -->
      <section class="domain-practice-section u-mt-xxl">
        <h3 class="panel-section-title">Revisión y Retos Arquitectónicos por Dominio</h3>
        
        <div class="domain-cards-grid">
          <div 
            v-for="d in store.domains" 
            :key="d.id"
            class="domain-practice-card"
            :style="{ '--dom-color': d.color }"
            @click="startDomainPractice(d.id)"
          >
            <div class="d-card-header">
              <span class="d-card-dot" :style="{ backgroundColor: d.color }"></span>
              <span class="d-card-count">{{ store.concepts.filter(c => c.domain === d.id).length }} conceptos</span>
            </div>
            <h4 class="d-card-name">{{ d.name }}</h4>
            <p class="d-card-desc">{{ d.description || 'Repaso de tarjetas y conceptos de este dominio.' }}</p>
            <div class="d-card-footer">
              <span class="d-card-btn" :style="{ color: d.color }">Estudiar Cards &rarr;</span>
            </div>
          </div>
        </div>
      </section>

    </div>

    <!-- 2. PANTALLA ENFOCADA DE SESIÓN ACTIVA O COMPLETADA (OVERLAY) -->
    <div v-else class="focused-session-overlay">
      <div class="session-modal-card">
        
        <!-- Header -->
        <header class="session-modal-header">
          <div class="left-controls">
            <button @click="reload" class="btn-exit" title="Cancelar sesión y salir">✕ Salir</button>
            <span v-if="practiceMode && selectedPracticeDomain" class="practice-domain-indicator" :style="{ borderColor: selectedPracticeDomain.color, color: selectedPracticeDomain.color, backgroundColor: selectedPracticeDomain.color + '15' }">
              Práctica: {{ selectedPracticeDomain.name }}
            </span>
            <span v-else-if="sessionActive && currentQuestion" class="tag-badge" :style="{ backgroundColor: activeDomainColor + '20', color: activeDomainColor, borderColor: activeDomainColor + '40' }">
              {{ activeDomainName }}
            </span>
          </div>
          <div class="right-progress" v-if="sessionActive">
            <span class="progress-fraction">{{ currentIdx + 1 }} / {{ activeQueue.length }}</span>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" :style="{ width: ((currentIdx + 1) / (activeQueue.length || 1) * 100) + '%' }"></div>
            </div>
            <!-- TTS Button -->
            <button @click="speakCard" class="btn-tts" :class="{ speaking: isSpeaking }" title="Leer en voz alta">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" v-if="!isSpeaking"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" v-else/>
              </svg>
            </button>
          </div>
        </header>

        <!-- Flashcard Interactiva -->
        <div v-if="sessionActive && currentQuestion" class="session-modal-body">
          <!-- Speed Bonus Bar -->
          <div class="speed-bonus-bar" v-if="!showAnswerReveal">
            <div
              class="speed-bonus-fill"
              :style="{ width: (speedTimeLeft / 10 * 100) + '%', background: speedTimeLeft > 5 ? 'var(--success)' : speedTimeLeft > 2 ? 'var(--warning)' : 'var(--danger)' }"
            ></div>
            <span class="speed-bonus-label">{{ speedTimeLeft > 0 ? `${speedTimeLeft}s para Speed Bonus` : 'Sin bonus — tómate tu tiempo' }}</span>
          </div>
          <div class="card-scene">
            <div class="flashcard" :class="{ 'flipped': showAnswerReveal }" :style="{ '--domain-color': activeDomainColor }">
              
              <!-- Frente de Tarjeta -->
              <div class="card-face card-front" :style="{ borderTop: '4px solid ' + activeDomainColor }" @click="!showAnswerReveal && handleReveal()">
                <div class="card-title-row">
                  <span class="face-tag">PREGUNTA</span>
                  <span class="face-icon">❓</span>
                </div>
                <div class="face-body">
                  <p class="question-text">{{ currentQuestion.prompt }}</p>
                </div>
                <div class="face-footer">
                  Intenta explicar el concepto mentalmente. Presiona <strong>Espacio</strong> para revelar.
                </div>
              </div>

              <!-- Reverso de Tarjeta -->
              <div class="card-face card-back" :style="{ borderTop: '4px solid ' + activeDomainColor }">
                <div class="card-title-row">
                  <span class="face-tag">RESPUESTA CORRECTA</span>
                  <span class="face-icon">✓</span>
                </div>
                <div class="face-body scrollable">
                  <div class="answer-markdown-content" v-html="renderGhostMode(currentQuestion.answer)"></div>

                  <!-- Cognitive support panels (Intuition, Full Notes) -->
                  <div v-if="currentConcept" class="cognitive-support-wrapper">
                    
                    <div class="cognitive-toggle-section">
                      <button @click="showIntuition = !showIntuition" class="btn-cognitive-toggle" :class="{ active: showIntuition }">
                        💡 Intuición <kbd class="inline-kbd">I</kbd>
                      </button>
                      <transition name="slide-down">
                        <div v-if="showIntuition" class="cognitive-content-box intuition-box">
                          {{ currentConcept.intuition || 'Sin intuición registrada.' }}
                        </div>
                      </transition>
                    </div>

                    <div class="cognitive-toggle-section">
                      <button @click="showExplanation = !showExplanation" class="btn-cognitive-toggle" :class="{ active: showExplanation }">
                        📖 Nota Completa <kbd class="inline-kbd">C</kbd>
                      </button>
                      <transition name="slide-down">
                        <div v-if="showExplanation" class="cognitive-content-box explanation-box" v-html="render(currentConcept.explanation)">
                        </div>
                      </transition>
                    </div>

                    <div class="cognitive-toggle-section">
                      <RouterLink :to="'/notes?id=' + currentConcept.id" class="btn-cognitive-toggle u-no-decor-flex">
                        📁 Nota de Origen <kbd class="inline-kbd">M</kbd>
                      </RouterLink>
                    </div>

                  </div>
                </div>
                
                <div v-if="rawUserAnswer.trim()" class="user-comparison-box">
                  <h5>
                    Tu Intento:
                    <span v-if="answerGrade" class="grade-hint" :class="'grade-' + answerGrade.verdict">
                      {{ answerGrade.verdict === 'match' ? '✓ parece correcto' : answerGrade.verdict === 'partial' ? '~ parcial' : '✕ no matchea' }}
                    </span>
                  </h5>
                  <p class="user-attempt-text">"{{ rawUserAnswer }}"</p>
                </div>
              </div>

            </div>
          </div>

          <!-- Controles de Respuesta / Calificación -->
          <div class="session-controls">
            <!-- Caso: Pendiente revelar -->
            <div v-if="!showAnswerReveal" class="input-container">
              <textarea 
                v-model="rawUserAnswer" 
                placeholder="Escribe tu respuesta aquí para contrastar al final (opcional)..."
                rows="3"
              ></textarea>
              <div class="submit-row">
                <span class="shortcut-tip-text">Atajo: Presiona <strong>Enter</strong> o <strong>Espacio</strong> para revelar</span>
                <button @click="handleReveal" class="btn-reveal-now" :class="{ 'active-press': pressedKey === 'space' }">
                  Revelar Respuesta <kbd class="inline-kbd inline-kbd-reveal">Espacio</kbd>
                </button>
              </div>
            </div>

            <!-- Caso: Calificar comprensión arquitectónica -->
            <div v-else class="rating-container">
              <p class="rating-prompt-text">¿Cómo evalúas tu dominio de los trade-offs y contratos de esta decisión?</p>
              <div class="rating-buttons-grid">
                <button
                  @click="trackHandleRateClick(1)"
                  class="btn-rating-item rate-again"
                  :class="{ 'selected': selectedRating === 1, 'dimmed': selectedRating !== null && selectedRating !== 1, 'active-press': pressedKey === '1' }"
                  :disabled="selectedRating !== null"
                >
                  <span class="r-icon-placeholder">🔄</span>
                  <span class="r-name">Revisar</span>
                  <span class="r-desc">Brecha de diseño</span>
                  <kbd class="r-kbd">1</kbd>
                </button>
                <button
                  @click="trackHandleRateClick(2)"
                  class="btn-rating-item rate-hard"
                  :class="{ 'selected': selectedRating === 2, 'dimmed': selectedRating !== null && selectedRating !== 2, 'active-press': pressedKey === '2' }"
                  :disabled="selectedRating !== null"
                >
                  <span class="r-icon-placeholder">⚡</span>
                  <span class="r-name">Complejo</span>
                  <span class="r-desc">Trade-offs dudosos</span>
                  <kbd class="r-kbd">2</kbd>
                </button>
                <button
                  @click="trackHandleRateClick(3)"
                  class="btn-rating-item rate-good"
                  :class="{ 'selected': selectedRating === 3, 'dimmed': selectedRating !== null && selectedRating !== 3, 'active-press': pressedKey === '3' }"
                  :disabled="selectedRating !== null"
                >
                  <span class="r-icon-placeholder">✓</span>
                  <span class="r-name">Claro</span>
                  <span class="r-desc">Contrato asimilado</span>
                  <kbd class="r-kbd">3</kbd>
                </button>
                <button
                  @click="trackHandleRateClick(4)"
                  class="btn-rating-item rate-easy"
                  :class="{ 'selected': selectedRating === 4, 'dimmed': selectedRating !== null && selectedRating !== 4, 'active-press': pressedKey === '4' }"
                  :disabled="selectedRating !== null"
                >
                  <span class="r-icon-placeholder">★</span>
                  <span class="r-name">Dominado {{ speedBonus ? '⚡' : '' }}</span>
                  <span class="r-desc">Patrón sólido</span>
                  <kbd class="r-kbd">4</kbd>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Cola vacía: el filtro no produjo preguntas -->
        <div v-else-if="sessionActive && !currentQuestion" class="session-empty-view">
          <span class="empty-icon">🗂️</span>
          <h2>No hay preguntas para repasar</h2>
          <p>El filtro seleccionado no tiene conceptos con preguntas pendientes. Prueba con otro filtro o crea preguntas desde tus notas.</p>
          <button @click="reload" class="btn-dismiss">Volver al panel</button>
        </div>

        <!-- Sesión Completada -->
        <div v-else-if="sessionComplete" class="session-complete-view">
          <div class="trophy-badge">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" class="u-text-success">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2 v-if="practiceMode && selectedPracticeDomain">¡Práctica de {{ selectedPracticeDomain.name }} Completada!</h2>
          <h2 v-else>¡Repaso Finalizado!</h2>
          
          <p v-if="practiceMode">Has finalizado tu sesión de recuerdo activo para este dominio. Tus calificaciones han sido procesadas por el algoritmo SM2 para optimizar futuros repasos.</p>
          <p v-else>Tu grafo de conocimiento se ha actualizado. Los intervalos para estos conceptos han sido recalculados de forma óptima.</p>

          <div class="stats-summary-grid">
            <div class="review-stat-card stat-easy">
              <span class="s-val">{{ ratingCounts.easy }}</span>
              <span class="s-lbl">Fácil</span>
            </div>
            <div class="review-stat-card stat-good">
              <span class="s-val">{{ ratingCounts.good }}</span>
              <span class="s-lbl">Bien</span>
            </div>
            <div class="review-stat-card stat-hard">
              <span class="s-val">{{ ratingCounts.hard }}</span>
              <span class="s-lbl">Difícil</span>
            </div>
            <div class="review-stat-card stat-again">
              <span class="s-val">{{ ratingCounts.again }}</span>
              <span class="s-lbl">Repetir</span>
            </div>
          </div>

          <button @click="reload" class="btn-dismiss">Terminar y Volver</button>

          <!-- Leech Tracker -->
          <div v-if="leeches.length > 0" class="leech-section">
            <h4 class="leech-title">🦥 Conceptos más difíciles</h4>
            <div class="leech-list">
              <div v-for="l in leeches" :key="l.id" class="leech-row">
                <span class="leech-name">{{ l.concept?.title }}</span>
                <span class="leech-count">{{ l.count }}x fallos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confetti Overlay -->
    <div v-if="showConfetti" class="confetti-overlay" aria-hidden="true">
      <div 
        v-for="(p, i) in confettiParticles" 
        :key="i" 
        class="confetti-particle"
        :style="{
          left: p.x + '%',
          top: '-10px',
          width: p.size + 'px',
          height: p.size + 'px',
          background: p.color,
          animationDuration: (2 + Math.random()) + 's',
          animationDelay: (Math.random() * 0.5) + 's',
        }"
      ></div>
    </div>

  </div>
</template>
