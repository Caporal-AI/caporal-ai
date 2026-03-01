import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { preferencesReducer } from './slices/preferencesSlice';
import { uiReducer } from './slices/uiSlice';
import { caporalApi } from './services/caporalApi';

export const store = configureStore({
  reducer: {
    preferences: preferencesReducer,
    ui: uiReducer,
    [caporalApi.reducerPath]: caporalApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(caporalApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
