import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AgentMode } from '../../types';

export interface AssistantPrompt {
  id: number;
  message: string;
  mode?: AgentMode;
}

interface UiState {
  selectedDietRunId: string | null;
  assistantOpen: boolean;
  pendingAssistantPrompt: AssistantPrompt | null;
}

const initialState: UiState = {
  selectedDietRunId: null,
  assistantOpen: false,
  pendingAssistantPrompt: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedDietRunId(state, action: PayloadAction<string | null>) {
      state.selectedDietRunId = action.payload;
    },
    setAssistantOpen(state, action: PayloadAction<boolean>) {
      state.assistantOpen = action.payload;
    },
    queueAssistantPrompt(
      state,
      action: PayloadAction<{ message: string; mode?: AgentMode }>,
    ) {
      state.pendingAssistantPrompt = {
        id: Date.now(),
        message: action.payload.message,
        mode: action.payload.mode,
      };
    },
    consumeAssistantPrompt(state, action: PayloadAction<number>) {
      if (state.pendingAssistantPrompt?.id === action.payload) {
        state.pendingAssistantPrompt = null;
      }
    },
  },
});

export const {
  setSelectedDietRunId,
  setAssistantOpen,
  queueAssistantPrompt,
  consumeAssistantPrompt,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
