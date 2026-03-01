import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { createAppTheme } from './assets/theme';
import './i18n';
import { useAppSelector } from './store/hooks';
import { store } from './store';

function ThemedApplication(): JSX.Element {
  const uiDensity = useAppSelector((state) => state.preferences.uiDensity);
  const colorMode = useAppSelector((state) => state.preferences.colorMode);

  const theme = useMemo(
    () =>
      createAppTheme({
        uiDensity,
        colorMode,
      }),
    [colorMode, uiDensity],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemedApplication />
    </Provider>
  </React.StrictMode>,
);
