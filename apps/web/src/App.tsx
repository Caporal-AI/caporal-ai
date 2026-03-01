import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Drawer,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useMediaQuery, useTheme } from '@mui/material';
import { useState } from 'react';
import { AssistantScreen } from './screens/AssistantScreen';
import { BatchWorkflowScreen } from './screens/BatchWorkflowScreen';
import { GenerateDietScreen } from './screens/GenerateDietScreen';
import { IngredientsScreen } from './screens/IngredientsScreen';
import type { AgentMode } from './types';

export function App(): JSX.Element {
  const [tab, setTab] = useState(0);
  const [selectedDietRunId, setSelectedDietRunId] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState<{
    id: number;
    message: string;
    mode?: AgentMode;
  } | null>(null);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('xl'));

  const queueAssistantPrompt = (message: string, mode: AgentMode = 'WHY'): void => {
    setAssistantPrompt({
      id: Date.now(),
      message,
      mode,
    });
    if (!isDesktop) {
      setAssistantOpen(true);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 15% 0%, rgba(76,224,179,.22), transparent 35%), radial-gradient(circle at 85% 10%, rgba(244,180,95,.2), transparent 28%), #0b1117',
        py: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="xl">
        <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2.5 }}>
          <Typography variant="overline" sx={{ color: 'secondary.main', letterSpacing: '0.14em' }}>
            CAPORAL AI
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.3 }}>
            Centro de decision para engorda en corral
          </Typography>
          <Typography sx={{ color: 'text.secondary', maxWidth: 780, mt: 1.2 }}>
            Operacion en una sola vista: configuracion, plan y Caporal IA con trazabilidad.
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mt={1.6}>
            <Chip
              color={selectedDietRunId ? 'success' : 'default'}
              variant={selectedDietRunId ? 'filled' : 'outlined'}
              label={
                selectedDietRunId
                  ? `Corrida activa: ${selectedDietRunId.slice(0, 8)}`
                  : 'Sin corrida activa'
              }
            />
            <Chip
              variant="outlined"
              label="Caporal IA nunca cambia el plan automaticamente; solo explica o simula."
            />
          </Stack>
        </Paper>

        {!isDesktop ? (
          <Paper sx={{ p: 1.3, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                <SmartToyRoundedIcon color="primary" />
                <Box>
                  <Typography fontWeight={800}>Caporal IA</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Asistente operativo siempre disponible
                  </Typography>
                </Box>
              </Stack>
              <Button
                variant="contained"
                onClick={() => {
                  setAssistantOpen(true);
                }}
              >
                Abrir
              </Button>
            </Stack>
          </Paper>
        ) : null}

        <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2.2} alignItems="stretch">
          <Paper sx={{ p: { xs: 1.2, md: 2.2 }, flex: 1, minWidth: 0 }}>
            <Tabs
              value={tab}
              onChange={(_, value: number) => {
                setTab(value);
              }}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: '1px solid rgba(156,176,197,0.2)',
                mb: 2,
              }}
            >
              <Tab label="1. Ingredientes" />
              <Tab label="2. Lotes y plan semanal" />
              <Tab label="3. Generar dieta simple" />
            </Tabs>

            {tab === 0 ? <IngredientsScreen /> : null}
            {tab === 1 ? (
              <BatchWorkflowScreen
                selectedDietRunId={selectedDietRunId}
                onDietRunSelected={setSelectedDietRunId}
              />
            ) : null}
            {tab === 2 ? (
              <GenerateDietScreen
                selectedDietRunId={selectedDietRunId}
                onDietRunSelected={setSelectedDietRunId}
                onAskAssistant={({ message, mode }) => {
                  queueAssistantPrompt(message, mode ?? 'WHY');
                }}
              />
            ) : null}
          </Paper>

          {isDesktop ? (
            <Box
              sx={{
                width: 520,
                flexShrink: 0,
                minWidth: 0,
                position: 'sticky',
                top: 22,
                alignSelf: 'flex-start',
              }}
            >
              <AssistantScreen
                dietRunId={selectedDietRunId}
                embedded
                queuedPrompt={assistantPrompt}
                onQueuedPromptConsumed={(id) => {
                  setAssistantPrompt((current) => (current?.id === id ? null : current));
                }}
              />
              {!selectedDietRunId ? (
                <Alert severity="info" sx={{ mt: 1.2 }}>
                  Genera una corrida en `Lotes` o `Generar dieta` para habilitar simulaciones ligadas al plan.
                </Alert>
              ) : null}
            </Box>
          ) : null}
        </Stack>

        {!isDesktop ? (
          <Drawer
            anchor="bottom"
            open={assistantOpen}
            onClose={() => {
              setAssistantOpen(false);
            }}
            PaperProps={{
              sx: {
                height: '92vh',
                p: 1.2,
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                borderTop: '1px solid rgba(76,224,179,0.35)',
                background:
                  'linear-gradient(180deg, rgba(13,21,30,0.98) 0%, rgba(11,17,23,1) 50%, rgba(8,13,18,1) 100%)',
              },
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography fontWeight={800}>Caporal IA</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setAssistantOpen(false);
                }}
              >
                Cerrar
              </Button>
            </Stack>
            <AssistantScreen
              dietRunId={selectedDietRunId}
              queuedPrompt={assistantPrompt}
              onQueuedPromptConsumed={(id) => {
                setAssistantPrompt((current) => (current?.id === id ? null : current));
              }}
            />
          </Drawer>
        ) : null}

        {!isDesktop && !assistantOpen ? (
          <Button
            variant="contained"
            startIcon={<SmartToyRoundedIcon />}
            onClick={() => {
              setAssistantOpen(true);
            }}
            sx={{
              position: 'fixed',
              right: 14,
              bottom: 14,
              zIndex: 1300,
              borderRadius: 99,
              boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
              px: 2,
            }}
          >
            Caporal IA
          </Button>
        ) : null}
      </Container>
    </Box>
  );
}
