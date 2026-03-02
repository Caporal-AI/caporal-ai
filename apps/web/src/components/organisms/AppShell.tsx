import { styled } from '@mui/material/styles';
import { keyframes } from '@emotion/react';
import AgricultureRoundedIcon from '@mui/icons-material/AgricultureRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import type { ColorMode, UiDensity } from '../../store/slices/preferencesSlice';
import { SectionCard } from '../atoms/SectionCard';

export interface ShellNavItem {
  path: string;
  label: string;
  icon: ReactNode;
}

interface AppShellProps {
  appName: string;
  sectionLabel: string;
  assistantNavLabel: string;
  settingsTitle: string;
  settingsDensityLabel: string;
  settingsThemeLabel: string;
  settingsSizeSmallLabel: string;
  settingsSizeMediumLabel: string;
  settingsSizeLargeLabel: string;
  settingsThemeLightLabel: string;
  settingsThemeDarkLabel: string;
  uiDensity: UiDensity;
  colorMode: ColorMode;
  onUiDensityChange: (next: UiDensity) => void;
  onColorModeChange: (next: ColorMode) => void;
  runLabel: string;
  hasRun: boolean;
  navItems: ShellNavItem[];
  activePath: string;
  isDesktop: boolean;
  mobileAssistantOpen: boolean;
  onNavigate: (path: string) => void;
  onOpenAssistant: () => void;
  onCloseAssistant: () => void;
  content: ReactNode;
  assistant: ReactNode;
}

const ShellRoot = styled(Box)`
  min-height: 100vh;
  padding: 1rem 0 6.9rem;
`;

const HeaderCard = styled(SectionCard)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const HeaderActions = styled(Box)`
  display: flex;
  align-items: center;
  gap: 0.35rem;
`;

const HeaderBrand = styled(Box)`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
`;

const HeaderIcon = styled(Box)(({ theme }) => ({
  width: '2.2rem',
  height: '2.2rem',
  borderRadius: '0.75rem',
  display: 'grid',
  placeItems: 'center',
  background:
    theme.palette.mode === 'dark'
      ? 'rgba(194, 122, 44, 0.24)'
      : 'rgba(143, 92, 46, 0.14)',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(194, 122, 44, 0.48)'
      : '1px solid rgba(143, 92, 46, 0.38)',
  color: theme.palette.mode === 'dark' ? '#d6a96f' : '#8f5c2e',
  flexShrink: 0,
}));

const HeaderTextWrap = styled(Box)`
  min-width: 0;
`;

const HeaderTitle = styled(Typography)`
  font-weight: 800;
  line-height: 1.15;
`;

const HeaderSubtitle = styled(Typography)`
  line-height: 1.2;
`;

const LayoutGrid = styled(Box)<{ isDesktop: boolean }>`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  align-items: start;

  ${({ isDesktop }) =>
    isDesktop
      ? `
    grid-template-columns: 5.25rem minmax(0, 1fr) 27rem;
  `
      : ''}
`;

const RailCard = styled(SectionCard)`
  position: sticky;
  top: 1rem;
  padding: 0.65rem;
`;

const RailStack = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
`;

const RailButton = styled(IconButton)<{ selected: boolean }>(({ theme, selected }) => ({
  width: '3rem',
  height: '3rem',
  borderRadius: '0.8rem',
  border:
    selected
      ? '1px solid rgba(143, 92, 46, 0.58)'
      : theme.palette.mode === 'dark'
        ? '1px solid rgba(220, 192, 162, 0.28)'
        : '1px solid rgba(108, 82, 57, 0.28)',
  background: selected ? 'rgba(143, 92, 46, 0.12)' : 'transparent',
  color: selected
    ? '#8f5c2e'
    : theme.palette.mode === 'dark'
      ? 'rgba(238, 219, 198, 0.78)'
      : 'rgba(59, 42, 28, 0.72)',
}));

const MainPanel = styled(SectionCard)`
  padding: 1rem;
  min-width: 0;
`;

const AsidePanel = styled(Box)`
  position: sticky;
  top: 1rem;
`;

const MobileFooter = styled(Box)`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0.8rem;
  z-index: 1200;
  display: flex;
  justify-content: center;
  pointer-events: none;
`;

const MobileFooterInner = styled(SectionCard)`
  position: relative;
  width: min(95vw, 29rem);
  padding: 0.45rem;
  border-radius: 1.2rem;
  pointer-events: auto;
  backdrop-filter: blur(6px);
`;

const MobileFooterGrid = styled(Box)`
  display: grid;
  align-items: stretch;
  gap: 0.28rem;
  min-height: 4.75rem;
`;

const selectedPulse = keyframes`
  0% {
    transform: translateY(0) scale(0.98);
  }
  60% {
    transform: translateY(-2px) scale(1.04);
  }
  100% {
    transform: translateY(-1px) scale(1);
  }
`;

const assistantIdle = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-1px);
  }
`;

const MobileNavButton = styled(Button)<{ selected: boolean }>(({ theme, selected }) => ({
  minWidth: 0,
  width: '100%',
  height: '100%',
  borderRadius: '0.95rem',
  border: selected ? '1px solid rgba(143, 92, 46, 0.58)' : '1px solid transparent',
  background: selected ? 'rgba(143, 92, 46, 0.14)' : 'transparent',
  color: selected
    ? '#8f5c2e'
    : theme.palette.mode === 'dark'
      ? 'rgba(238, 219, 198, 0.82)'
      : 'rgba(59, 42, 28, 0.78)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.24rem',
  padding: '0.35rem 0.2rem',
  textTransform: 'none',
  lineHeight: 1,
  transition: 'border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, transform 0.2s ease',
  ...(selected
    ? {
        animation: `${selectedPulse} 320ms ease-out`,
        transform: 'translateY(-1px)',
      }
    : {}),
  '&:hover': {
    borderColor: 'rgba(143, 92, 46, 0.34)',
    background: 'rgba(143, 92, 46, 0.08)',
  },
}));

const MobileItemIcon = styled(Box)<{ selected: boolean; assistant?: boolean }>(({ theme, selected, assistant }) => ({
  width: '2.2rem',
  height: '2.2rem',
  borderRadius: '999px',
  display: 'grid',
  placeItems: 'center',
  border: selected
    ? '1px solid rgba(143, 92, 46, 0.54)'
    : theme.palette.mode === 'dark'
      ? '1px solid rgba(220, 192, 162, 0.24)'
      : '1px solid rgba(108, 82, 57, 0.24)',
  background: selected
    ? 'rgba(143, 92, 46, 0.16)'
    : theme.palette.mode === 'dark'
      ? 'rgba(35, 27, 22, 0.8)'
      : 'rgba(251, 247, 241, 0.72)',
  boxShadow: selected ? '0 6px 16px rgba(143, 92, 46, 0.2)' : 'none',
  ...(assistant && !selected
    ? {
        animation: `${assistantIdle} 2.2s ease-in-out infinite`,
      }
    : {}),
}));

const MobileItemLabel = styled(Typography)<{ selected: boolean }>(({ theme, selected }) => ({
  fontSize: '0.62rem',
  fontWeight: selected ? 800 : 600,
  letterSpacing: '0.02em',
  color: selected
    ? '#8f5c2e'
    : theme.palette.mode === 'dark'
      ? 'rgba(238, 219, 198, 0.8)'
      : 'rgba(59, 42, 28, 0.76)',
  textAlign: 'center',
  whiteSpace: 'normal',
  lineHeight: 1.08,
  minHeight: '1.2rem',
}));

const AssistantDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    height: '92vh',
    borderRadius: '1.2rem 1.2rem 0 0',
    borderTop:
      theme.palette.mode === 'dark'
        ? '1px solid rgba(220, 192, 162, 0.24)'
        : '1px solid rgba(108, 82, 57, 0.24)',
    padding: '0.8rem',
    background: theme.palette.background.paper,
  },
}));

const DrawerHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.7rem;
`;

export function AppShell({
  appName,
  sectionLabel,
  assistantNavLabel,
  settingsTitle,
  settingsDensityLabel,
  settingsThemeLabel,
  settingsSizeSmallLabel,
  settingsSizeMediumLabel,
  settingsSizeLargeLabel,
  settingsThemeLightLabel,
  settingsThemeDarkLabel,
  uiDensity,
  colorMode,
  onUiDensityChange,
  onColorModeChange,
  runLabel,
  hasRun,
  navItems,
  activePath,
  isDesktop,
  mobileAssistantOpen,
  onNavigate,
  onOpenAssistant,
  onCloseAssistant,
  content,
  assistant,
}: AppShellProps): JSX.Element {
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const settingsOpen = Boolean(settingsAnchor);
  const closeSettings = (): void => {
    setSettingsAnchor(null);
  };

  return (
    <ShellRoot>
      <Container maxWidth="xl">
        <HeaderCard>
          <HeaderBrand>
            <HeaderIcon>
              <AgricultureRoundedIcon fontSize="small" />
            </HeaderIcon>
            <HeaderTextWrap>
              <HeaderTitle variant="h6">{appName}</HeaderTitle>
              <HeaderSubtitle variant="caption" color="text.secondary">
                {sectionLabel}
              </HeaderSubtitle>
            </HeaderTextWrap>
          </HeaderBrand>
          <HeaderActions>
            <Chip
              color={hasRun ? 'success' : 'default'}
              variant={hasRun ? 'filled' : 'outlined'}
              label={runLabel}
            />
            <IconButton
              aria-label={settingsTitle}
              onClick={(event) => {
                setSettingsAnchor(event.currentTarget);
              }}
            >
              <SettingsRoundedIcon />
            </IconButton>
          </HeaderActions>
        </HeaderCard>

        <LayoutGrid isDesktop={isDesktop}>
          {isDesktop ? (
            <RailCard>
              <RailStack>
                {navItems.map((item) => {
                  const selected = activePath.startsWith(item.path);
                  return (
                    <Tooltip key={item.path} title={item.label} placement="right">
                      <RailButton
                        selected={selected}
                        onClick={() => {
                          onNavigate(item.path);
                        }}
                      >
                        {item.icon}
                      </RailButton>
                    </Tooltip>
                  );
                })}
              </RailStack>
            </RailCard>
          ) : null}

          <MainPanel>{content}</MainPanel>

          {isDesktop ? <AsidePanel>{assistant}</AsidePanel> : null}
        </LayoutGrid>
      </Container>

      {!isDesktop ? (
        <MobileFooter>
          <MobileFooterInner>
            <MobileFooterGrid
              style={{
                gridTemplateColumns: `repeat(${Math.min(navItems.length, 4) + 1}, minmax(0, 1fr))`,
              }}
            >
              {navItems.slice(0, 4).map((item) => {
                const selected = activePath.startsWith(item.path);
                return (
                  <MobileNavButton
                    key={item.path}
                    selected={selected}
                    onClick={() => {
                      onNavigate(item.path);
                    }}
                  >
                    <MobileItemIcon selected={selected}>{item.icon}</MobileItemIcon>
                    <MobileItemLabel selected={selected}>{item.label}</MobileItemLabel>
                  </MobileNavButton>
                );
              })}
              <MobileNavButton
                selected={mobileAssistantOpen}
                onClick={onOpenAssistant}
                aria-label={assistantNavLabel}
              >
                <MobileItemIcon selected={mobileAssistantOpen} assistant>
                  <SmartToyRoundedIcon fontSize="small" />
                </MobileItemIcon>
                <MobileItemLabel selected={mobileAssistantOpen}>
                  {assistantNavLabel}
                </MobileItemLabel>
              </MobileNavButton>
            </MobileFooterGrid>
          </MobileFooterInner>
        </MobileFooter>
      ) : null}

      <AssistantDrawer anchor="bottom" open={!isDesktop && mobileAssistantOpen} onClose={onCloseAssistant}>
        <DrawerHeader>
          <Typography variant="h6" fontWeight={800}>
            {appName}
          </Typography>
          <IconButton size="small" onClick={onCloseAssistant}>
            <CloseRoundedIcon />
          </IconButton>
        </DrawerHeader>
        {assistant}
      </AssistantDrawer>

      <Menu
        open={settingsOpen}
        anchorEl={settingsAnchor}
        onClose={closeSettings}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <ListSubheader>{settingsTitle}</ListSubheader>
        <ListSubheader disableSticky>{settingsDensityLabel}</ListSubheader>
        <MenuItem
          selected={uiDensity === 'small'}
          onClick={() => {
            onUiDensityChange('small');
            closeSettings();
          }}
        >
          <Box display="flex" width="100%" alignItems="center" justifyContent="space-between" gap={1}>
            <Typography>{settingsSizeSmallLabel}</Typography>
            {uiDensity === 'small' ? <CheckRoundedIcon fontSize="small" /> : null}
          </Box>
        </MenuItem>
        <MenuItem
          selected={uiDensity === 'medium'}
          onClick={() => {
            onUiDensityChange('medium');
            closeSettings();
          }}
        >
          <Box display="flex" width="100%" alignItems="center" justifyContent="space-between" gap={1}>
            <Typography>{settingsSizeMediumLabel}</Typography>
            {uiDensity === 'medium' ? <CheckRoundedIcon fontSize="small" /> : null}
          </Box>
        </MenuItem>
        <MenuItem
          selected={uiDensity === 'large'}
          onClick={() => {
            onUiDensityChange('large');
            closeSettings();
          }}
        >
          <Box display="flex" width="100%" alignItems="center" justifyContent="space-between" gap={1}>
            <Typography>{settingsSizeLargeLabel}</Typography>
            {uiDensity === 'large' ? <CheckRoundedIcon fontSize="small" /> : null}
          </Box>
        </MenuItem>

        <Divider />
        <ListSubheader disableSticky>{settingsThemeLabel}</ListSubheader>
        <MenuItem
          selected={colorMode === 'light'}
          onClick={() => {
            onColorModeChange('light');
            closeSettings();
          }}
        >
          <Box display="flex" width="100%" alignItems="center" justifyContent="space-between" gap={1}>
            <Box display="flex" alignItems="center" gap={0.8}>
              <LightModeRoundedIcon fontSize="small" />
              <Typography>{settingsThemeLightLabel}</Typography>
            </Box>
            {colorMode === 'light' ? <CheckRoundedIcon fontSize="small" /> : null}
          </Box>
        </MenuItem>
        <MenuItem
          selected={colorMode === 'dark'}
          onClick={() => {
            onColorModeChange('dark');
            closeSettings();
          }}
        >
          <Box display="flex" width="100%" alignItems="center" justifyContent="space-between" gap={1}>
            <Box display="flex" alignItems="center" gap={0.8}>
              <DarkModeRoundedIcon fontSize="small" />
              <Typography>{settingsThemeDarkLabel}</Typography>
            </Box>
            {colorMode === 'dark' ? <CheckRoundedIcon fontSize="small" /> : null}
          </Box>
        </MenuItem>
      </Menu>
    </ShellRoot>
  );
}
