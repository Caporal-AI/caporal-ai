import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import {
  useCreateAssistantSessionMutation,
  useGetAssistantSessionTraceQuery,
  useSendAssistantSessionMessageMutation,
  useSimulateAssistantSessionMutation,
} from '../api/caporalApi';
import type { AgentMode, AgentTraceStep } from '../types';
import { safetyFlagLabels } from '../ui/labels';

interface AssistantScreenProps {
  dietRunId: string | null;
}

const modeOptions: Array<{ value: AgentMode; label: string; helper: string }> = [
  { value: 'AUTO', label: 'Auto', helper: 'El agente decide el mejor modo.' },
  { value: 'WHY', label: 'POR_QUÉ', helper: 'Explica composición, costo y riesgos.' },
  {
    value: 'WHAT_IF',
    label: 'QUÉ_PASA_SI',
    helper: 'Simula un cambio y compara impacto.',
  },
  {
    value: 'NEXT_BEST_ACTION',
    label: 'QUÉ_SIGUE',
    helper: 'Sugiere siguiente acción por lote.',
  },
];

export function AssistantScreen({ dietRunId }: AssistantScreenProps): JSX.Element {
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<AgentMode>('AUTO');
  const [sessionId, setSessionId] = useState<string | null>(null);

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
  }, [dietRunId]);

  const selectedMode = useMemo(
    () => modeOptions.find((item) => item.value === mode) ?? modeOptions[0]!,
    [mode],
  );

  const createSessionForDiet = async (): Promise<void> => {
    if (!dietRunId) {
      return;
    }
    const session = await createSession({
      dietRunId,
      title: `Copiloto DietRun ${dietRunId.slice(0, 6)}`,
    }).unwrap();
    setSessionId(session.id);
  };

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

  if (!dietRunId) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800}>
          Copiloto de decision
        </Typography>
        <Typography color="text.secondary" mt={1}>
          Primero genera una corrida de dieta. Despues podras abrir una sesion del copiloto para
          preguntar `por que`, correr `que pasa si`, y recibir sugerencias de `que sigue`.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2.2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          Copiloto de decision (Agentic)
        </Typography>
        <Typography color="text.secondary" mt={0.7}>
          Esta capa integra Solver + RAG + herramientas de simulacion con trazabilidad completa.
        </Typography>
      </Paper>

      {!sessionId ? (
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight={700}>Sesion activa</Typography>
          <Typography color="text.secondary" mt={0.5}>
            Inicia una sesion para habilitar trazabilidad de decisiones y tools invocadas.
          </Typography>
          <Button
            sx={{ mt: 1.2 }}
            variant="contained"
            onClick={() => void createSessionForDiet()}
            disabled={createState.isLoading}
          >
            {createState.isLoading ? 'Creando sesion...' : 'Iniciar sesion copiloto'}
          </Button>
        </Paper>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
            <Select
              size="small"
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as AgentMode);
              }}
              sx={{ minWidth: 220 }}
            >
              {modeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>

            <TextField
              fullWidth
              label="Pregunta o hipotesis"
              value={question}
              placeholder="Ejemplo: sube sorgo 5% y dime impacto"
              onChange={(event) => {
                setQuestion(event.target.value);
              }}
            />
            <Button
              variant="contained"
              disabled={sendState.isLoading || question.trim().length === 0}
              onClick={() => void handleAsk()}
            >
              {sendState.isLoading ? 'Consultando...' : 'Preguntar'}
            </Button>
            <Button
              variant="outlined"
              disabled={simulateState.isLoading || question.trim().length === 0}
              onClick={() => void handleSimulate()}
            >
              {simulateState.isLoading ? 'Simulando...' : 'Simular'}
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Modo actual: {selectedMode.label} · {selectedMode.helper}
          </Typography>
        </Paper>
      )}

      {createState.isError ? <Alert severity="error">No se pudo crear la sesion.</Alert> : null}
      {sendState.isError ? <Alert severity="error">No se pudo enviar el mensaje.</Alert> : null}
      {simulateState.isError ? <Alert severity="error">No se pudo ejecutar la simulacion.</Alert> : null}
      {traceError ? <Alert severity="error">No se pudo cargar la traza de la sesion.</Alert> : null}

      {traceLoading && sessionId ? (
        <Box sx={{ minHeight: 140, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : null}

      {trace?.messages?.length ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1.2 }}>
            Conversacion
          </Typography>
          <Stack spacing={1.2}>
            {trace.messages.map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1.2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    color={item.role === 'ASSISTANT' ? 'primary' : 'default'}
                    label={item.role === 'ASSISTANT' ? 'Copiloto' : 'Usuario'}
                  />
                  {item.mode ? <Chip size="small" variant="outlined" label={item.mode} /> : null}
                </Stack>
                <Typography sx={{ mt: 0.8 }}>{item.content}</Typography>

                {item.safetyFlagsJson.length > 0 ? (
                  <Alert severity="warning" sx={{ mt: 0.8 }}>
                    {item.safetyFlagsJson
                      .map((flag) => safetyFlagLabels[flag] ?? flag)
                      .join(' | ')}
                  </Alert>
                ) : null}

                {item.simulationDiffJson ? (
                  <Paper variant="outlined" sx={{ mt: 0.9, p: 1 }}>
                    <Typography variant="body2" fontWeight={700}>
                      Impacto de simulacion
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Delta costo: {item.simulationDiffJson.costDeltaMxnPerHeadDay.toFixed(2)} MXN/cabeza/dia
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Factible despues: {item.simulationDiffJson.feasibleAfter ? 'Si' : 'No'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Delta restricciones: {item.simulationDiffJson.hardConstraintDelta}
                    </Typography>
                  </Paper>
                ) : null}

                {item.citationsJson.length > 0 ? (
                  <Stack spacing={0.6} mt={1}>
                    {item.citationsJson.slice(0, 3).map((citation) => (
                      <Paper key={`${item.id}-${citation.chunkId}`} variant="outlined" sx={{ p: 0.8 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {citation.sourceTitle}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {citation.snippet}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                ) : null}
              </Paper>
            ))}
          </Stack>
        </Paper>
      ) : null}

      {trace?.toolCalls?.length ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            Traza de herramientas
          </Typography>
          <Stack spacing={0.8}>
            {trace.toolCalls.map((tool) => (
              <ToolTraceRow key={tool.id} tool={tool} />
            ))}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}

function ToolTraceRow({ tool }: { tool: AgentTraceStep }): JSX.Element {
  const color = tool.status === 'SUCCESS' ? 'success' : tool.status === 'ERROR' ? 'error' : 'default';
  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
        <Chip size="small" color={color} label={tool.status} />
        <Typography fontWeight={700}>{tool.toolName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {tool.latencyMs} ms
        </Typography>
      </Stack>
    </Paper>
  );
}
