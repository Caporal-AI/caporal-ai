import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useAskAssistantMutation, useGetInteractionsQuery } from '../api/caporalApi';
import type { RagInteraction } from '../types';
import { safetyFlagLabels } from '../ui/labels';

interface AssistantScreenProps {
  dietRunId: string | null;
}

export function AssistantScreen({ dietRunId }: AssistantScreenProps): JSX.Element {
  const [question, setQuestion] = useState('');
  const [askAssistant, askState] = useAskAssistantMutation();

  const {
    data: interactions,
    isLoading,
    error,
  } = useGetInteractionsQuery(dietRunId ?? '', { skip: !dietRunId });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleAsk = async (): Promise<void> => {
    if (!dietRunId || !question.trim()) {
      return;
    }

    await askAssistant({
      dietRunId,
      question: question.trim(),
      topK: 3,
    }).unwrap();

    setQuestion('');
  };

  if (!dietRunId) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800}>
          Asistente de explicacion
        </Typography>
        <Typography color="text.secondary" mt={1}>
          Primero genera una recomendacion de dieta. Despues podras hacer preguntas como:
          "por que se uso tanta fibra?" o "que impacto tiene el costo?".
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2.2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          Asistente de explicacion
        </Typography>
        <Typography color="text.secondary" mt={0.7}>
          Te ayuda a entender la recomendacion. Si pides cantidades exactas, te enviara de vuelta al
          calculador para mantener seguridad.
        </Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            label="Tu pregunta"
            value={question}
            placeholder="Ejemplo: por que se limito la pollinaza?"
            onChange={(event) => {
              setQuestion(event.target.value);
            }}
          />
          <Button
            variant="contained"
            disabled={askState.isLoading || question.trim().length === 0}
            onClick={() => {
              void handleAsk();
            }}
          >
            {askState.isLoading ? 'Consultando...' : 'Preguntar'}
          </Button>
        </Stack>
      </Paper>

      {askState.isError && <Alert severity="error">No se pudo procesar la pregunta.</Alert>}
      {error && <Alert severity="error">No se pudieron cargar respuestas anteriores.</Alert>}

      {isLoading ? (
        <Box sx={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={1.3}>
          {(interactions ?? []).map((interaction) => {
            const isExpanded = expanded[interaction.id] ?? false;
            return (
              <InteractionCard
                key={interaction.id}
                interaction={interaction}
                expanded={isExpanded}
                onToggle={() => {
                  setExpanded((current) => ({ ...current, [interaction.id]: !isExpanded }));
                }}
              />
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

function InteractionCard({
  interaction,
  expanded,
  onToggle,
}: {
  interaction: RagInteraction;
  expanded: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">
          {new Date(interaction.createdAt).toLocaleString()}
        </Typography>
        <Typography fontWeight={700}>{interaction.question}</Typography>
        <Typography>{interaction.answer}</Typography>

        {interaction.safetyFlagsJson.length > 0 ? (
          <Alert severity="warning">
            <Stack spacing={0.4}>
              {interaction.safetyFlagsJson.map((flag) => (
                <Typography key={flag} variant="body2">
                  {safetyFlagLabels[flag] ?? flag}
                </Typography>
              ))}
            </Stack>
          </Alert>
        ) : null}

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip size="small" color="primary" variant="outlined" label="Respuesta con respaldo" />
          <Button size="small" onClick={onToggle}>
            {expanded ? 'Ocultar fuentes' : 'Ver fuentes usadas'}
          </Button>
        </Stack>

        <Collapse in={expanded}>
          <Stack spacing={1} mt={1}>
            {interaction.citationsJson.map((citation) => (
              <Paper key={`${interaction.id}-${citation.docId}`} variant="outlined" sx={{ p: 1.2 }}>
                <Typography variant="body2" fontWeight={700}>
                  {citation.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {citation.snippet}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
}
