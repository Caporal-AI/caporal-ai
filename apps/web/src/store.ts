import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { caporalApi } from './api/caporalApi';

export const store = configureStore({
  reducer: {
    [caporalApi.reducerPath]: caporalApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(caporalApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
