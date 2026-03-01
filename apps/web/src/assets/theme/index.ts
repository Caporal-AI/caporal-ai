import { esES } from '@mui/material/locale';
import { createTheme } from '@mui/material/styles';
import type { ColorMode, UiDensity } from '../../store/slices/preferencesSlice';
import { createComponentOverrides } from './components';
import { colorTokens, radii } from './tokens';

interface AppThemeSettings {
  colorMode: ColorMode;
  uiDensity: UiDensity;
}

export function createAppTheme({
  colorMode,
  uiDensity,
}: AppThemeSettings) {
  const isDark = colorMode === 'dark';

  return createTheme(
    {
      palette: {
        mode: colorMode,
        primary: {
          main: colorTokens.soil,
          dark: '#7A4D25',
          light: '#A4703E',
          contrastText: colorTokens.canvas,
        },
        secondary: {
          main: colorTokens.amber,
          dark: '#A36521',
          light: '#D18D43',
          contrastText: colorTokens.canvas,
        },
        background: {
          default: isDark ? '#17120f' : colorTokens.cream,
          paper: isDark ? '#231b16' : colorTokens.canvas,
        },
        text: {
          primary: isDark ? '#f5e7d5' : colorTokens.bark,
          secondary: isDark ? '#cab8a2' : colorTokens.mud,
        },
        success: {
          main: colorTokens.pasture,
        },
        warning: {
          main: colorTokens.amber,
        },
        error: {
          main: colorTokens.ember,
        },
        divider: isDark ? 'rgba(220, 192, 162, 0.18)' : 'rgba(108, 82, 57, 0.2)',
      },
      shape: {
        borderRadius: radii.md,
      },
      typography: {
        fontFamily: '"Sora", "Nunito Sans", "Segoe UI", sans-serif',
        fontSize: uiDensity === 'small' ? 13 : uiDensity === 'large' ? 16 : 14,
        h3: {
          fontWeight: 800,
          letterSpacing: '-0.02em',
        },
        h4: {
          fontWeight: 800,
        },
        h5: {
          fontWeight: 800,
        },
        h6: {
          fontWeight: 700,
        },
        button: {
          fontWeight: 700,
        },
      },
      components: createComponentOverrides({
        mode: colorMode,
        uiDensity,
      }),
    },
    esES,
  );
}
