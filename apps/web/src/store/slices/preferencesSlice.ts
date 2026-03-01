import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type UiDensity = 'small' | 'medium' | 'large';
export type ColorMode = 'light' | 'dark';

interface PreferencesState {
  uiDensity: UiDensity;
  colorMode: ColorMode;
}

const initialState: PreferencesState = {
  uiDensity: 'small',
  colorMode: 'light',
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setUiDensity(state, action: PayloadAction<UiDensity>) {
      state.uiDensity = action.payload;
    },
    setColorMode(state, action: PayloadAction<ColorMode>) {
      state.colorMode = action.payload;
    },
    toggleColorMode(state) {
      state.colorMode = state.colorMode === 'light' ? 'dark' : 'light';
    },
  },
});

export const { setUiDensity, setColorMode, toggleColorMode } = preferencesSlice.actions;
export const preferencesReducer = preferencesSlice.reducer;
