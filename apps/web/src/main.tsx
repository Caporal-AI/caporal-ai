import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { esES } from '@mui/material/locale';
import { Provider } from 'react-redux';
import { App } from './App';
import { store } from './store';

const theme = createTheme(
  {
    palette: {
      mode: 'dark',
      primary: {
        main: '#4ce0b3',
      },
      secondary: {
        main: '#f4b45f',
      },
      background: {
        default: '#0b1117',
        paper: '#131b23',
      },
      text: {
        primary: '#ecf3fb',
        secondary: '#9cb0c5',
      },
      success: {
        main: '#6be69e',
      },
      warning: {
        main: '#f4b45f',
      },
      error: {
        main: '#ff6d7a',
      },
    },
    typography: {
      fontFamily: '"Space Grotesk", "IBM Plex Sans", "Segoe UI", sans-serif',
      h3: {
        letterSpacing: '-0.03em',
        fontWeight: 800,
      },
      h4: {
        letterSpacing: '-0.02em',
        fontWeight: 700,
      },
    },
    shape: {
      borderRadius: 14,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid rgba(156,176,197,0.16)',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 700,
          },
        },
      },
    },
  },
  esES,
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
);
