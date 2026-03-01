import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useEffect, useMemo, useState } from 'react';
import {
  useCreateAssistantSessionMutation,
  useGetAssistantSessionTraceQuery,
  useSendAssistantSessionMessageMutation,
  useSimulateAssistantSessionMutation,
} from '../api/caporalApi';
import type { AgentMessage, AgentMode, AgentTraceStep, SimulationDiff } from '../types';
import { safetyFlagLabels } from '../ui/labels';

interface AssistantScreenProps {
  dietRunId: string | null;
  embedded?: boolean;
  queuedPrompt?: {
    id: number;
    message: string;
    mode?: AgentMode;
  } | null;
  onQueuedPromptConsumed?: (id: number) => void;
}

const modeOptions: Array<{ value: AgentMode; label: string; helper: string }> = [
  { value: 'AUTO', label: 'AUTO', helper: 'Caporal IA decide el modo adecuado para tu pregunta.' },
  { value: 'WHY', label: 'POR_QUÉ', helper: 'Explica decisiones actuales del plan.' },
  {
    value: 'WHAT_IF',
    label: 'QUÉ_PASA_SI',
    helper: 'Simula cambios, compara impacto y conserva trazabilidad.',
  },
  {
    value: 'NEXT_BEST_ACTION',
    label: 'QUÉ_SIGUE',
    helper: 'Sugiere siguiente accion operativa por lote.',
  },
];

const modeSuggestions: Record<AgentMode, string[]> = {
  AUTO: [
    'Por que se limito la pollinaza?',
    'Que sigue para este lote esta semana?',
    'Que pasa si subo sorgo 4%?',
  ],
  WHY: [
    'Por que no fue factible esta corrida?',
    'Por que subio el costo diario?',
    'Que restriccion esta limitando mas la mezcla?',
    'Por que quedo alto el rastrojo?',
  ],
  WHAT_IF: [
    'Sube sorgo 5%',
    'Baja rastrojo 3%',
    'Aumenta cascarilla 4%',
  ],
  NEXT_BEST_ACTION: [
    'Que sigue hoy para este lote?',
    'Conviene vender o continuar?',
    'Que dato me falta para mejorar la recomendacion?',
  ],
};

interface ParsedHypothesis {
  action: string;
  ingredient: string;
  pct: number;
}

export function AssistantScreen({
  dietRunId,
  embedded = false,
  queuedPrompt = null,
  onQueuedPromptConsumed,
}: AssistantScreenProps): JSX.Element {
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<AgentMode>('AUTO');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [autoSessionAttemptFor, setAutoSessionAttemptFor] = useState<string | null>(null);

  const [createSession, createState] = useCreateAssistantSessionMutation();
  const [sendMessage, sendState] = useSendAssistantSessionMessageMutation();
  const [simulateMessage, simulateState] = useSimulateAssistantSessionMutation();

  const {
    data: trace,
    isLoading: traceLoading,
    error: traceError,
    refetch,
  } = useGetAssistantSessionTraceQuery(sessionId ?? '', { skip: !sessionId });

  useEffect(() => {
    setSessionId(null);
    setQuestion('');
    setMode('AUTO');
    setAutoSessionAttemptFor(null);
  }, [dietRunId]);

  useEffect(() => {
    if (!queuedPrompt) {
      return;
    }
    setQuestion(queuedPrompt.message);
    setMode(queuedPrompt.mode ?? 'AUTO');
    onQueuedPromptConsumed?.(queuedPrompt.id);
  }, [onQueuedPromptConsumed, queuedPrompt]);

  const selectedMode = useMemo(
    () => modeOptions.find((item) => item.value === mode) ?? modeOptions[0]!,
    [mode],
  );

  const whatIfParsed = useMemo(
    () => (mode === 'WHAT_IF' ? parseWhatIfHypothesis(question) : null),
    [mode, question],
  );

  const assistantMessages = trace?.messages?.filter((item) => item.role === 'ASSISTANT') ?? [];
  const latestAssistantMessage = assistantMessages.length > 0 ? assistantMessages.at(-1) ?? null : null;
  const conversationMessages = useMemo(() => {
    const source = trace?.messages ?? [];
    return [...source].reverse().slice(0, 14);
  }, [trace?.messages]);

  const createSessionForDiet = async (): Promise<void> => {
    if (!dietRunId) {
      return;
    }
    const session = await createSession({
      dietRunId,
      title: `Caporal ${dietRunId.slice(0, 8)}`,
    }).unwrap();
    setSessionId(session.id);
  };

  useEffect(() => {
    if (!dietRunId || sessionId || createState.isLoading || autoSessionAttemptFor === dietRunId) {
      return;
    }
    setAutoSessionAttemptFor(dietRunId);
    void createSessionForDiet();
  }, [autoSessionAttemptFor, createState.isLoading, dietRunId, sessionId]);

  const handleAsk = async (): Promise<void> => {
    if (!sessionId || question.trim().length === 0) {
      return;
    }
    await sendMessage({
      sessionId,
      body: {
        message: question.trim(),
        mode,
      },
    }).unwrap();
    setQuestion('');
    await refetch();
  };

  const handleSimulate = async (): Promise<void> => {
    if (!sessionId || question.trim().length === 0) {
      return;
    }
    await simulateMessage({
      sessionId,
      body: {
        hypothesis: question.trim(),
      },
    }).unwrap();
    setQuestion('');
    await refetch();
  };

  const mainActionLabel =
    mode === 'WHAT_IF'
      ? simulateState.isLoading
        ? 'Simulando...'
        : 'Simular cambio'
      : sendState.isLoading
        ? 'Consultando...'
        : 'Preguntar';

  const mainActionDisabled =
    question.trim().length === 0 ||
    !sessionId ||
    sendState.isLoading ||
    simulateState.isLoading ||
    (mode === 'WHAT_IF' && !whatIfParsed);

  return (
    <Stack spacing={1.4}>
      <Paper
        sx={{
          p: 1.6,
          background:
            'linear-gradient(160deg, rgba(76,224,179,0.12) 0%, rgba(14,22,31,0.96) 44%, rgba(14,22,31,1) 100%)',
          border: '1px solid rgba(76,224,179,0.28)',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <AutoAwesomeRoundedIcon color="primary" fontSize="small" />
            <Typography variant={embedded ? 'h6' : 'h5'} fontWeight={800}>
              Caporal IA
            </Typography>
          </Stack>
          <Chip
            size="small"
            color={dietRunId ? 'success' : 'default'}
            variant={dietRunId ? 'filled' : 'outlined'}
            label={dietRunId ? `Corrida vinculada ${dietRunId.slice(0, 8)}` : 'Sin corrida activa'}
          />
        </Stack>
        <Typography color="text.secondary" mt={0.6}>
          Modo operativo: explica, simula o recomienda. Ningun mensaje aplica cambios automaticamente al plan.
        </Typography>
      </Paper>

      {!dietRunId ? (
        <Paper sx={{ p: 1.6 }}>
          <Typography fontWeight={700}>Sin contexto de corrida</Typography>
          <Typography color="text.secondary" mt={0.4}>
            Genera una corrida desde `Lotes` o `Generar dieta` para habilitar simulaciones ligadas al plan.
          </Typography>
        </Paper>
      ) : null}

      {createState.isError ? (
        <Alert severity="error">
          No se pudo iniciar la sesion de Caporal IA. {extractErrorMessage(createState.error)}
        </Alert>
      ) : null}
      {sendState.isError ? (
        <Alert severity="error">No se pudo enviar la consulta. {extractErrorMessage(sendState.error)}</Alert>
      ) : null}
      {simulateState.isError ? (
        <Alert severity="error">No se pudo simular el cambio. {extractErrorMessage(simulateState.error)}</Alert>
      ) : null}
      {traceError ? (
        <Alert severity="error">
          No se pudo cargar la traza de la sesion. {extractErrorMessage(traceError)}
        </Alert>
      ) : null}

      <Paper sx={{ p: 1.4 }}>
        <Stack spacing={1.1}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, nextMode: AgentMode | null) => {
              if (nextMode) {
                setMode(nextMode);
              }
            }}
            size="small"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
              gap: 0.7,
              '& .MuiToggleButtonGroup-grouped': {
                borderRadius: '999px !important',
                border: '1px solid rgba(156,176,197,0.28) !important',
                textTransform: 'none',
                fontWeight: 700,
              },
            }}
          >
            {modeOptions.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <TextField
            fullWidth
            size="medium"
            multiline
            minRows={embedded ? 3 : 4}
            label={mode === 'WHAT_IF' ? 'Hipotesis de cambio' : 'Pregunta'}
            value={question}
            placeholder={
              mode === 'WHAT_IF'
                ? 'Ejemplo: sube sorgo 5%'
                : 'Ejemplo: por que se limito la pollinaza?'
            }
            onChange={(event) => {
              setQuestion(event.target.value);
            }}
            sx={{
              '& .MuiInputBase-root': {
                fontSize: '1rem',
              },
            }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <Button
              variant="contained"
              disabled={mainActionDisabled}
              fullWidth
              onClick={() => {
                if (mode === 'WHAT_IF') {
                  void handleSimulate();
                  return;
                }
                void handleAsk();
              }}
            >
              {mainActionLabel}
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {selectedMode.helper}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.8,
            }}
          >
            {modeSuggestions[mode].map((suggestion) => (
              <Button
                key={`${mode}-${suggestion}`}
                variant="outlined"
                size="small"
                onClick={() => {
                  setQuestion(suggestion);
                }}
                sx={{
                  borderRadius: 99,
                  px: 1.2,
                  py: 0.5,
                  textTransform: 'none',
                  lineHeight: 1.2,
                  minHeight: 32,
                }}
              >
                {suggestion}
              </Button>
            ))}
          </Box>

          {mode === 'WHAT_IF' && question.trim().length > 0 ? (
            whatIfParsed ? (
              <Alert severity="success" icon={<FactCheckRoundedIcon fontSize="small" />}>
                Hipotesis lista para simular: {whatIfParsed.action} {whatIfParsed.ingredient}{' '}
                {whatIfParsed.pct.toFixed(2)}%.
              </Alert>
            ) : (
              <Alert severity="warning">
                Escribe una hipotesis en formato: `sube|baja + ingrediente + porcentaje`. Ejemplo:
                `sube sorgo 5%`.
              </Alert>
            )
          ) : null}
        </Stack>
      </Paper>

      {traceLoading && sessionId ? (
        <Box sx={{ minHeight: 110, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : null}

      {latestAssistantMessage ? (
        <ActionSummaryCard message={latestAssistantMessage} />
      ) : (
        <Paper sx={{ p: 1.4 }}>
          <Typography fontWeight={700}>Sin respuestas aun</Typography>
          <Typography color="text.secondary" mt={0.4}>
            Caporal IA mostrara aqui el estado de accion e impacto del ultimo resultado.
          </Typography>
        </Paper>
      )}

      <Paper sx={{ p: 1.4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={0.6}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
          sx={{ mb: 1 }}
        >
          <Typography variant="h6" fontWeight={800}>
          Conversacion
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Mostrando ultimas {conversationMessages.length} interacciones (recientes arriba)
          </Typography>
        </Stack>
        {conversationMessages.length > 0 ? (
          <Stack
            spacing={1}
            sx={{
              maxHeight: embedded ? 460 : 620,
              overflowY: 'auto',
              pr: 0.4,
            }}
          >
            {conversationMessages.map((item) => (
              <MessageCard key={item.id} message={item} />
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">Aun no hay mensajes en esta sesion.</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 1.4 }}>
        <Accordion sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <HubRoundedIcon fontSize="small" color="primary" />
              <Typography variant="h6" fontWeight={800}>
                Detalle tecnico (opcional)
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            {trace?.toolCalls?.length ? (
              <Stack spacing={0.8}>
                {trace.toolCalls.map((tool) => (
                  <ToolTraceTimelineRow key={tool.id} tool={tool} />
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">Aun no hay herramientas ejecutadas.</Typography>
            )}
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Stack>
  );
}

function ActionSummaryCard({ message }: { message: AgentMessage }): JSX.Element | null {
  if (message.role !== 'ASSISTANT') {
    return null;
  }

  const state = getMessageActionState(message);

  return (
    <Paper
      sx={{
        p: 1.4,
        border: `1px solid ${state.borderColor}`,
        background: state.background,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip color={state.color} size="small" label={state.label} />
          {message.mode ? <Chip size="small" variant="outlined" label={modeDisplayLabel(message.mode)} /> : null}
          {message.mode === 'WHAT_IF' ? (
            <Chip size="small" variant="outlined" label="Plan no cambiado automaticamente" />
          ) : null}
        </Stack>
        <Typography color="text.secondary">{state.description}</Typography>
        {message.simulationDiffJson ? <SimulationImpactPanel diff={message.simulationDiffJson} /> : null}
      </Stack>
    </Paper>
  );
}

function MessageCard({ message }: { message: AgentMessage }): JSX.Element {
  const state = message.role === 'ASSISTANT' ? getMessageActionState(message) : null;

  return (
    <Paper variant="outlined" sx={{ p: 1.1 }}>
      <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
        <Chip
          size="small"
          color={message.role === 'ASSISTANT' ? 'primary' : 'default'}
          label={message.role === 'ASSISTANT' ? 'Caporal' : 'Usuario'}
        />
        {message.mode ? <Chip size="small" variant="outlined" label={modeDisplayLabel(message.mode)} /> : null}
        {state && message.role === 'ASSISTANT' ? (
          <Chip size="small" variant="outlined" color={state.color} label={state.shortLabel} />
        ) : null}
      </Stack>

      <Typography sx={{ mt: 0.8 }}>{message.content}</Typography>

      {message.safetyFlagsJson.length > 0 ? (
        <Alert severity="warning" sx={{ mt: 0.8 }}>
          {message.safetyFlagsJson.map((flag) => safetyFlagLabels[flag] ?? flag).join(' | ')}
        </Alert>
      ) : null}

      {message.simulationDiffJson ? (
        <Paper variant="outlined" sx={{ mt: 0.9, p: 1 }}>
          <Typography variant="body2" fontWeight={700}>
            Impacto del escenario
          </Typography>
          <SimulationImpactPanel diff={message.simulationDiffJson} compact />
        </Paper>
      ) : null}

      {message.mode === 'WHAT_IF' ? (
        <Alert severity="info" sx={{ mt: 0.8 }}>
          Esta respuesta no modifica automaticamente el plan. Para aplicar cambios debes generar una nueva corrida.
        </Alert>
      ) : null}

      {message.citationsJson.length > 0 ? (
        <Stack spacing={0.6} mt={1}>
          {message.citationsJson.slice(0, 3).map((citation) => (
            <Paper key={`${message.id}-${citation.chunkId}`} variant="outlined" sx={{ p: 0.8 }}>
              <Typography variant="body2" fontWeight={700}>
                {citation.sourceTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <Box
                  component="span"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {citation.snippet}
                </Box>
              </Typography>
            </Paper>
          ))}
        </Stack>
      ) : null}
    </Paper>
  );
}

function SimulationImpactPanel({
  diff,
  compact = false,
}: {
  diff: SimulationDiff;
  compact?: boolean;
}): JSX.Element {
  const feasibleLabel = diff.feasibleAfter ? 'Factible' : 'No factible';
  const feasibleColor = diff.feasibleAfter ? 'success.main' : 'error.main';

  return (
    <Stack
      direction={{ xs: 'column', sm: compact ? 'column' : 'row' }}
      spacing={0.8}
      sx={{ mt: compact ? 0.8 : 0 }}
    >
      <ImpactMiniCard
        title="Delta costo"
        value={`${diff.costDeltaMxnPerHeadDay >= 0 ? '+' : ''}${diff.costDeltaMxnPerHeadDay.toFixed(2)} MXN/cab/dia`}
      />
      <ImpactMiniCard
        title="Factibilidad"
        value={feasibleLabel}
        valueColor={feasibleColor}
      />
      <ImpactMiniCard title="Delta restricciones" value={`${diff.hardConstraintDelta >= 0 ? '+' : ''}${diff.hardConstraintDelta}`} />
      <ImpactMiniCard
        title="Riesgo"
        value={diff.riskFlags.length > 0 ? diff.riskFlags.join(', ') : 'Sin alertas'}
      />
    </Stack>
  );
}

function ImpactMiniCard({
  title,
  value,
  valueColor,
}: {
  title: string;
  value: string;
  valueColor?: string;
}): JSX.Element {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 0.85,
        minWidth: 128,
        flex: 1,
        background: 'rgba(156,176,197,0.05)',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Typography fontWeight={700} sx={{ color: valueColor ?? 'text.primary' }}>
        {value}
      </Typography>
    </Paper>
  );
}

function ToolTraceTimelineRow({ tool }: { tool: AgentTraceStep }): JSX.Element {
  const color = tool.status === 'SUCCESS' ? 'success' : tool.status === 'ERROR' ? 'error' : 'default';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 0.95,
        borderLeft: `3px solid ${
          tool.status === 'SUCCESS'
            ? 'rgba(107,230,158,0.8)'
            : tool.status === 'ERROR'
              ? 'rgba(255,109,122,0.85)'
              : 'rgba(156,176,197,0.5)'
        }`,
      }}
    >
      <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
        <Chip size="small" color={color} label={tool.status} />
        <Typography fontWeight={700}>{tool.toolName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {tool.latencyMs} ms
        </Typography>
      </Stack>
      <Divider sx={{ my: 0.7 }} />
      <Stack direction="row" spacing={0.7} alignItems="center">
        <InsightsRoundedIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary">
          Entrada: {shortenJson(tool.inputJson)}
        </Typography>
      </Stack>
    </Paper>
  );
}

function getMessageActionState(message: AgentMessage): {
  label: string;
  shortLabel: string;
  description: string;
  color: 'success' | 'warning' | 'info' | 'default';
  borderColor: string;
  background: string;
} {
  if (message.mode === 'WHY') {
    return {
      label: 'Solo explicado',
      shortLabel: 'Explicacion',
      description: 'Caporal IA explico la decision actual del plan con evidencia; no aplico cambios.',
      color: 'info',
      borderColor: 'rgba(64,177,255,0.45)',
      background: 'rgba(64,177,255,0.09)',
    };
  }

  if (message.mode === 'WHAT_IF') {
    if (message.simulationDiffJson) {
      const feasibleAfter = message.simulationDiffJson.feasibleAfter;
      return {
        label: 'Simulacion ejecutada',
        shortLabel: feasibleAfter ? 'Simulada' : 'Infeasible',
        description:
          'Se corrio escenario en solver y se comparo impacto. El plan operativo no se modifica automaticamente.',
        color: feasibleAfter ? 'success' : 'warning',
        borderColor: feasibleAfter ? 'rgba(107,230,158,0.55)' : 'rgba(244,180,95,0.65)',
        background: feasibleAfter ? 'rgba(107,230,158,0.11)' : 'rgba(244,180,95,0.1)',
      };
    }
    return {
      label: 'Cambio no aplicado',
      shortLabel: 'No aplicado',
      description:
        'La solicitud no pudo simularse (limites o datos incompletos). Ajusta la hipotesis y vuelve a simular.',
      color: 'warning',
      borderColor: 'rgba(244,180,95,0.65)',
      background: 'rgba(244,180,95,0.1)',
    };
  }

  if (message.mode === 'NEXT_BEST_ACTION') {
    return {
      label: 'Siguiente accion sugerida',
      shortLabel: 'Accion',
      description: 'Caporal IA sugirio la accion operativa siguiente con base en proyeccion y contexto.',
      color: 'info',
      borderColor: 'rgba(64,177,255,0.45)',
      background: 'rgba(64,177,255,0.09)',
    };
  }

  return {
    label: 'Respuesta generada',
    shortLabel: 'Respuesta',
    description: 'Respuesta de Caporal IA con trazabilidad de herramientas y fuentes.',
    color: 'default',
    borderColor: 'rgba(156,176,197,0.35)',
    background: 'rgba(156,176,197,0.08)',
  };
}

function modeDisplayLabel(mode: Exclude<AgentMode, 'AUTO'>): string {
  switch (mode) {
    case 'WHY':
      return 'POR_QUÉ';
    case 'WHAT_IF':
      return 'QUÉ_PASA_SI';
    case 'NEXT_BEST_ACTION':
      return 'QUÉ_SIGUE';
    default:
      return mode;
  }
}

function parseWhatIfHypothesis(raw: string): ParsedHypothesis | null {
  const match = raw
    .toLowerCase()
    .match(/\b(sube|aumenta|incrementa|baja|reduce|disminuye)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*%/i);
  if (!match) {
    return null;
  }

  const action = match[1] ?? '';
  const ingredientRaw = (match[2] ?? '').replace(/\b(el|la|los|las|de|del|en|por|al|a)\b/gi, ' ');
  const ingredient = ingredientRaw.replace(/\s+/g, ' ').trim();
  if (ingredient.length < 2) {
    return null;
  }

  const pct = Number((match[3] ?? '0').replace(',', '.'));
  if (!Number.isFinite(pct) || pct <= 0) {
    return null;
  }

  return { action, ingredient, pct };
}

function shortenJson(value: Record<string, unknown>): string {
  const raw = JSON.stringify(value);
  if (raw.length <= 120) {
    return raw;
  }
  return `${raw.slice(0, 117)}...`;
}

function extractErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Error desconocido.';
  }
  const payload = error as { data?: { message?: string | string[] } };
  const message = payload.data?.message;
  if (Array.isArray(message)) {
    return message.join(' | ');
  }
  if (typeof message === 'string') {
    return message;
  }
  return 'Revisa la solicitud e intenta nuevamente.';
}
