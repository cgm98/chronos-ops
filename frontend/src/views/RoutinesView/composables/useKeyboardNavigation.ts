import { ref, onMounted, onUnmounted } from 'vue';
import type { RoutineWithStatus, RoutineTimeOfDay } from '../../../types/routine.types';

export interface KeyboardNavHandlers {
  onToggleToday: (id: string) => void;
  onStartFlow: (routine: RoutineWithStatus) => void;
  onStartEdit: (routine: RoutineWithStatus) => void;
  onFocusNew: () => void;
  onSetFilter: (filter: RoutineTimeOfDay | 'all') => void;
  onCloseModals: () => void;
}

export function useKeyboardNavigation(
  filteredRoutines: () => RoutineWithStatus[],
  handlers: KeyboardNavHandlers
) {
  const selectedIndex = ref<number>(0);
  const showHelpModal = ref(false);

  const handleKeyDown = (e: KeyboardEvent) => {
    // Si el usuario está escribiendo en un input, textarea o select, ignorar teclas normales
    const target = e.target as HTMLElement | null;
    const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

    if (e.key === 'Escape') {
      handlers.onCloseModals();
      showHelpModal.value = false;
      if (isTyping && target) {
        target.blur();
      }
      return;
    }

    if (isTyping) return;

    const list = filteredRoutines();
    if (list.length === 0 && !['1', '2', '3', '4', '5', 'n', '?'].includes(e.key)) return;

    // Normalizar selectedIndex
    if (selectedIndex.value >= list.length) {
      selectedIndex.value = Math.max(0, list.length - 1);
    }

    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        if (list.length > 0) {
          selectedIndex.value = (selectedIndex.value + 1) % list.length;
        }
        break;

      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        if (list.length > 0) {
          selectedIndex.value = (selectedIndex.value - 1 + list.length) % list.length;
        }
        break;

      case ' ':
        e.preventDefault();
        if (list[selectedIndex.value]) {
          handlers.onToggleToday(list[selectedIndex.value].id);
        }
        break;

      case 'f':
      case 'F':
        e.preventDefault();
        if (list[selectedIndex.value]) {
          handlers.onStartFlow(list[selectedIndex.value]);
        }
        break;

      case 'e':
      case 'E':
        e.preventDefault();
        if (list[selectedIndex.value]) {
          handlers.onStartEdit(list[selectedIndex.value]);
        }
        break;

      case 'n':
      case 'N':
        e.preventDefault();
        handlers.onFocusNew();
        break;

      case '1':
        e.preventDefault();
        handlers.onSetFilter('all');
        break;
      case '2':
        e.preventDefault();
        handlers.onSetFilter('morning');
        break;
      case '3':
        e.preventDefault();
        handlers.onSetFilter('afternoon');
        break;
      case '4':
        e.preventDefault();
        handlers.onSetFilter('evening');
        break;
      case '5':
        e.preventDefault();
        handlers.onSetFilter('night');
        break;

      case '?':
        e.preventDefault();
        showHelpModal.value = !showHelpModal.value;
        break;
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  return {
    selectedIndex,
    showHelpModal
  };
}
