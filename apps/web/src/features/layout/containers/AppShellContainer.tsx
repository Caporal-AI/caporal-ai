import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery, useTheme } from '@mui/material';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../../components/organisms/AppShell';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setColorMode, setUiDensity } from '../../../store/slices/preferencesSlice';
import { setAssistantOpen } from '../../../store/slices/uiSlice';
import { AssistantPanelContainer } from '../../assistant/containers/AssistantPanelContainer';
import { BatchWorkflowContainer } from '../../batches/containers/BatchWorkflowContainer';
import { GenerateDietContainer } from '../../diet/containers/GenerateDietContainer';
import { IngredientsContainer } from '../../ingredients/containers/IngredientsContainer';
import { appSections } from '../navigation';

export function AppShellContainer(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const selectedDietRunId = useAppSelector((state) => state.ui.selectedDietRunId);
  const assistantOpen = useAppSelector((state) => state.ui.assistantOpen);
  const pendingPrompt = useAppSelector((state) => state.ui.pendingAssistantPrompt);
  const uiDensity = useAppSelector((state) => state.preferences.uiDensity);
  const colorMode = useAppSelector((state) => state.preferences.colorMode);

  const currentSection = useMemo(
    () => appSections.find((item) => location.pathname.startsWith(item.path)) ?? appSections[0],
    [location.pathname],
  );

  useEffect(() => {
    if (!isDesktop && pendingPrompt) {
      dispatch(setAssistantOpen(true));
    }
  }, [dispatch, isDesktop, pendingPrompt]);

  return (
    <AppShell
      appName={t('common.appName')}
      sectionLabel={t(currentSection.labelKey)}
      assistantNavLabel={t('nav.agent')}
      settingsTitle={t('layout.settings.title')}
      settingsDensityLabel={t('layout.settings.density')}
      settingsThemeLabel={t('layout.settings.theme')}
      settingsSizeSmallLabel={t('layout.settings.sizeSmall')}
      settingsSizeMediumLabel={t('layout.settings.sizeMedium')}
      settingsSizeLargeLabel={t('layout.settings.sizeLarge')}
      settingsThemeLightLabel={t('layout.settings.lightMode')}
      settingsThemeDarkLabel={t('layout.settings.darkMode')}
      uiDensity={uiDensity}
      colorMode={colorMode}
      onUiDensityChange={(next) => {
        dispatch(setUiDensity(next));
      }}
      onColorModeChange={(next) => {
        dispatch(setColorMode(next));
      }}
      runLabel={
        selectedDietRunId
          ? t('common.status.linkedRun', { id: selectedDietRunId.slice(0, 8) })
          : t('common.status.noRun')
      }
      hasRun={Boolean(selectedDietRunId)}
      navItems={appSections.map((item) => ({
        path: item.path,
        label: t(item.labelKey),
        icon: item.icon,
      }))}
      activePath={location.pathname}
      isDesktop={isDesktop}
      mobileAssistantOpen={assistantOpen}
      onNavigate={(path) => {
        navigate(path);
      }}
      onOpenAssistant={() => {
        dispatch(setAssistantOpen(true));
      }}
      onCloseAssistant={() => {
        dispatch(setAssistantOpen(false));
      }}
      content={(
        <Routes>
          <Route
            path="/ingredientes"
            element={(
              <IngredientsContainer
                onNavigateToSection={(path) => {
                  navigate(path);
                }}
              />
            )}
          />
          <Route path="/lotes-plan" element={<BatchWorkflowContainer />} />
          <Route path="/dieta-simple" element={<GenerateDietContainer />} />
          <Route path="/" element={<Navigate to="/ingredientes" replace />} />
          <Route path="*" element={<Navigate to="/ingredientes" replace />} />
        </Routes>
      )}
      assistant={<AssistantPanelContainer dietRunId={selectedDietRunId} />}
    />
  );
}
