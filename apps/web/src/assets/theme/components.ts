import type { ThemeOptions } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import type { ColorMode, UiDensity } from '../../store/slices/preferencesSlice';
import { colorTokens, radii } from './tokens';

interface ComponentThemeOptions {
  mode: ColorMode;
  uiDensity: UiDensity;
}

export function createComponentOverrides({
  mode,
  uiDensity,
}: ComponentThemeOptions): ThemeOptions['components'] {
  const isDark = mode === 'dark';
  const inputSize = uiDensity === 'small' ? 'small' : 'medium';
  const buttonSize = uiDensity === 'large' ? 'large' : uiDensity;
  const chipSize = uiDensity === 'small' ? 'small' : 'medium';

  const surface = isDark ? '#231b16' : colorTokens.canvas;
  const bodyBackground = isDark
    ? 'radial-gradient(circle at 16% 0%, rgba(194,122,44,0.2), transparent 36%), radial-gradient(circle at 88% 10%, rgba(94,127,59,0.16), transparent 28%), #17120f'
    : 'radial-gradient(circle at 12% 0%, rgba(223,175,122,0.32), transparent 34%), radial-gradient(circle at 92% 12%, rgba(194,122,44,0.18), transparent 32%), #fbf7f1';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: bodyBackground,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: surface,
          border: `1px solid ${alpha(isDark ? '#d3b28e' : colorTokens.mud, isDark ? 0.18 : 0.16)}`,
          borderRadius: radii.md,
          boxShadow: isDark
            ? '0 12px 28px rgba(0, 0, 0, 0.38)'
            : '0 8px 24px rgba(60, 38, 20, 0.08)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        size: buttonSize,
      },
      styleOverrides: {
        root: {
          borderRadius: radii.md,
          fontWeight: 700,
          textTransform: 'none',
          paddingInline: 18,
        },
        containedPrimary: {
          backgroundColor: colorTokens.soil,
          color: colorTokens.canvas,
          '&:hover': {
            backgroundColor: '#7A4D25',
          },
        },
        containedSecondary: {
          backgroundColor: colorTokens.amber,
          color: colorTokens.canvas,
          '&:hover': {
            backgroundColor: '#A36521',
          },
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        size: buttonSize,
      },
    },
    MuiChip: {
      defaultProps: {
        size: chipSize,
      },
      styleOverrides: {
        root: {
          borderRadius: radii.pill,
        },
        outlined: {
          borderColor: alpha(isDark ? '#d3b28e' : colorTokens.mud, isDark ? 0.28 : 0.34),
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: inputSize,
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: inputSize,
      },
    },
    MuiSelect: {
      defaultProps: {
        size: inputSize,
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radii.md,
          backgroundColor: isDark
            ? alpha('#2b221c', 0.88)
            : alpha(colorTokens.canvas, 0.88),
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(colorTokens.soil, 0.5),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colorTokens.soil,
            borderWidth: 1.5,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: alpha(isDark ? '#e8d7c1' : colorTokens.mud, isDark ? 0.82 : 0.86),
        },
      },
    },
    MuiMenuItem: {
      defaultProps: {
        dense: uiDensity === 'small',
      },
    },
    MuiToggleButtonGroup: {
      defaultProps: {
        size: buttonSize,
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radii.sm,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: radii.md,
          border: `1px solid ${alpha(isDark ? '#d3b28e' : colorTokens.mud, isDark ? 0.22 : 0.18)}`,
          boxShadow: 'none',
          '&::before': {
            display: 'none',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: radii.lg,
          border: `1px solid ${alpha(isDark ? '#d3b28e' : colorTokens.mud, isDark ? 0.28 : 0.24)}`,
        },
      },
    },
  };
}
