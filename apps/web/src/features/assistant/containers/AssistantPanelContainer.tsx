import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateAssistantSessionMutation,
  useGetAssistantSessionTraceQuery,
  useSendAssistantSessionMessageMutation,
  useSimulateAssistantSessionMutation,
} from '../../../store/services/caporalApi';
import type { AgentMode } from '../../../types';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { consumeAssistantPrompt } from '../../../store/slices/uiSlice';
import { AssistantPanelView, type AssistantModeOption } from '../components/AssistantPanelView';

interface AssistantPanelContainerProps {
  dietRunId: string | null;
}

const modeSuggestions: Record<AgentMode, string[]> = {
  AUTO: [
    'Por que se limito la pollinaza?',
    'Que sigue para este lote esta semana?',
  ],
  WHY: [
    'Por que no fue factible esta corrida?',
    'Que restriccion limita mas la mezcla?',
  ],
  WHAT_IF: [
    'Sube sorgo 5%',
    'Baja rastrojo 3%',
  ],
  NEXT_BEST_ACTION: [
    'Que sigue hoy para este lote?',
    'Conviene vender o continuar?',
  ],
};

export function AssistantPanelContainer({
  dietRunId,
}: AssistantPanelContainerProps): JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const queuedPrompt = useAppSelector((state) => state.ui.pendingAssistantPrompt);

  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<AgentMode>('AUTO');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [autoSessionAttemptFor, setAutoSessionAttemptFor] = useState<string | null>(null);

  const [createSession, createState] = useCreateAssistantSessionMutation();
  const [sendMessage, sendState] = useSendAssistantSessionMessageMutation();
  const [simulateMessage, simulateState] = useSimulateAssistantSessionMutation();

  const { data: trace, isLoading: traceLoading, error: traceError, refetch } = useGetAssistantSessionTraceQuery(
    sessionId ?? '',
    { skip: !sessionId },
  );

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
    dispatch(consumeAssistantPrompt(queuedPrompt.id));
  }, [dispatch, queuedPrompt]);

  const modeOptions: AssistantModeOption[] = useMemo(
    () => [
      { value: 'AUTO', label: t('assistant.mode.AUTO'), helper: 'Caporal IA decide el modo de respuesta.' },
      { value: 'WHY', label: t('assistant.mode.WHY'), helper: 'Explica por que el plan llego al estado actual.' },
      { value: 'WHAT_IF', label: t('assistant.mode.WHAT_IF'), helper: 'Simula cambios y compara impacto.' },
      {
        value: 'NEXT_BEST_ACTION',
        label: t('assistant.mode.NEXT_BEST_ACTION'),
        helper: 'Sugiere siguiente accion operativa.',
      },
    ],
    [t],
  );

  const selectedMode = useMemo(
    () => modeOptions.find((item) => item.value === mode) ?? modeOptions[0]!,
    [mode, modeOptions],
  );

  const whatIfParsed = useMemo(
    () => (mode === 'WHAT_IF' ? parseWhatIfHypothesis(question) : null),
    [mode, question],
  );

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

  const handleSubmit = async (): Promise<void> => {
    if (!sessionId || question.trim().length === 0) {
      return;
    }

    if (mode === 'WHAT_IF') {
      await simulateMessage({
        sessionId,
        body: {
          hypothesis: question.trim(),
        },
      }).unwrap();
    } else {
      await sendMessage({
        sessionId,
        body: {
          message: question.trim(),
          mode,
        },
      }).unwrap();
    }

    setQuestion('');
    await refetch();
  };

  const errors = [
    createState.isError ? `No se pudo iniciar sesion. ${extractErrorMessage(createState.error)}` : null,
    sendState.isError ? `No se pudo enviar consulta. ${extractErrorMessage(sendState.error)}` : null,
    simulateState.isError ? `No se pudo simular. ${extractErrorMessage(simulateState.error)}` : null,
    traceError ? `No se pudo cargar traza. ${extractErrorMessage(traceError)}` : null,
  ].filter(Boolean) as string[];

  const submitDisabled =
    question.trim().length === 0 ||
    !sessionId ||
    createState.isLoading ||
    sendState.isLoading ||
    simulateState.isLoading ||
    (mode === 'WHAT_IF' && !whatIfParsed);

  const actionLabel = mode === 'WHAT_IF' ? t('assistant.simulate') : t('assistant.ask');
  const linkedRunLabel = dietRunId
    ? t('common.status.linkedRun', { id: dietRunId.slice(0, 8) })
    : t('common.status.noRun');

  const messages = useMemo(() => {
    const source = trace?.messages ?? [];
    return [...source].reverse().slice(0, 14);
  }, [trace?.messages]);

  const latestMessage = useMemo(() => {
    const list = trace?.messages?.filter((item) => item.role === 'ASSISTANT') ?? [];
    return list.at(-1) ?? null;
  }, [trace?.messages]);

  return (
    <AssistantPanelView
      title={t('assistant.title')}
      subtitle={t('assistant.subtitle')}
      linkedRunLabel={linkedRunLabel}
      hasLinkedRun={Boolean(dietRunId)}
      mode={mode}
      modeOptions={modeOptions}
      question={question}
      questionLabel={mode === 'WHAT_IF' ? t('assistant.hypothesis') : t('assistant.question')}
      questionPlaceholder={mode === 'WHAT_IF' ? 'Ejemplo: sube sorgo 5%' : 'Ejemplo: por que subio el costo diario?'}
      actionLabel={actionLabel}
      actionDisabled={submitDisabled}
      isLoading={createState.isLoading || sendState.isLoading || simulateState.isLoading || traceLoading}
      modeHelper={selectedMode.helper}
      suggestions={modeSuggestions[mode]}
      errors={errors}
      whatIfWarning={
        mode === 'WHAT_IF' && question.trim().length > 0 && !whatIfParsed
          ? 'Escribe la hipotesis en formato: sube|baja + ingrediente + porcentaje.'
          : null
      }
      emptyConversationLabel={t('assistant.noMessages')}
      conversationTitle={t('assistant.recentConversation')}
      messages={messages}
      latestMessage={latestMessage}
      toolCalls={trace?.toolCalls ?? []}
      onModeChange={setMode}
      onQuestionChange={setQuestion}
      onSuggestionClick={setQuestion}
      onSubmit={() => {
        void handleSubmit();
      }}
    />
  );
}

function parseWhatIfHypothesis(raw: string): { action: string; ingredient: string; pct: number } | null {
  const match = raw
    .toLowerCase()
    .match(/\b(sube|aumenta|incrementa|baja|reduce|disminuye)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*%/i);
  if (!match) {
    return null;
  }
  const action = match[1] ?? '';
  const ingredientRaw = (match[2] ?? '').replace(/\b(el|la|los|las|de|del|en|por|al|a)\b/gi, ' ');
  const ingredient = ingredientRaw.replace(/\s+/g, ' ').trim();
  const pct = Number((match[3] ?? '0').replace(',', '.'));

  if (!ingredient || !Number.isFinite(pct) || pct <= 0) {
    return null;
  }
  return { action, ingredient, pct };
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const candidate = (error as { data?: { message?: string }; message?: string }).data?.message ??
      (error as { message?: string }).message;
    if (candidate) {
      return candidate;
    }
  }
  return '';
}
