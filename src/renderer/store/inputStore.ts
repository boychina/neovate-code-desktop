import { create } from 'zustand';

export type InputMode = 'prompt' | 'bash' | 'memory';
export type PlanMode = 'normal' | 'plan' | 'brainstorm';
export type ThinkingLevel = null | 'low' | 'medium' | 'high';

interface InputState {
  value: string;
  cursorPosition: number;
  historyIndex: number | null;
  draftInput: string;
  history: string[];
  queuedMessages: string[];
  planMode: PlanMode;
  thinking: ThinkingLevel;
  pastedTextMap: Record<string, string>;
  pastedImageMap: Record<string, string>;
}

interface InputActions {
  setValue: (value: string) => void;
  setCursorPosition: (pos: number) => void;
  setHistoryIndex: (index: number | null) => void;
  setDraftInput: (input: string) => void;
  addToHistory: (input: string) => void;
  clearQueue: () => void;
  togglePlanMode: () => void;
  toggleThinking: () => void;
  setPastedTextMap: (map: Record<string, string>) => void;
  setPastedImageMap: (map: Record<string, string>) => void;
  reset: () => void;
}

export const useInputStore = create<InputState & InputActions>((set) => ({
  value: '',
  cursorPosition: 0,
  historyIndex: null,
  draftInput: '',
  history: [],
  queuedMessages: [],
  planMode: 'normal',
  thinking: null,
  pastedTextMap: {},
  pastedImageMap: {},

  setValue: (value) => set({ value }),
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
  setHistoryIndex: (historyIndex) => set({ historyIndex }),
  setDraftInput: (draftInput) => set({ draftInput }),
  addToHistory: (input) =>
    set((state) => ({ history: [...state.history, input] })),
  clearQueue: () => set({ queuedMessages: [] }),
  togglePlanMode: () =>
    set((state) => ({
      planMode:
        state.planMode === 'normal'
          ? 'plan'
          : state.planMode === 'plan'
            ? 'brainstorm'
            : 'normal',
    })),
  toggleThinking: () =>
    set((state) => ({
      thinking:
        state.thinking === null
          ? 'low'
          : state.thinking === 'low'
            ? 'medium'
            : state.thinking === 'medium'
              ? 'high'
              : null,
    })),
  setPastedTextMap: (pastedTextMap) => set({ pastedTextMap }),
  setPastedImageMap: (pastedImageMap) => set({ pastedImageMap }),
  reset: () =>
    set({
      value: '',
      cursorPosition: 0,
      historyIndex: null,
      draftInput: '',
    }),
}));

export function getInputMode(value: string): InputMode {
  if (value.startsWith('!')) return 'bash';
  if (value.startsWith('#')) return 'memory';
  return 'prompt';
}
