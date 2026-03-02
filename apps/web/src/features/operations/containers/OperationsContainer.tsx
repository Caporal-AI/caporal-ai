import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetOperationsDashboardQuery,
  useGetOperationsRagEvalsQuery,
  useRunOperationsSmokeValidationMutation,
} from '../../../store/services/caporalApi';
import type { SmokeValidationResult } from '../../../types';
import { OperationsView } from '../components/OperationsView';

const DASHBOARD_LIMIT = 10;
const RAG_EVAL_LIMIT = 20;

export function OperationsContainer(): JSX.Element {
  const { t } = useTranslation();
  const [lastSmokeResult, setLastSmokeResult] = useState<SmokeValidationResult | null>(null);
  const [smokeErrorMessage, setSmokeErrorMessage] = useState<string | null>(null);

  const dashboardArgs = useMemo(() => ({ limit: DASHBOARD_LIMIT }), []);
  const ragEvalArgs = useMemo(() => ({ limit: RAG_EVAL_LIMIT }), []);

  const {
    data: dashboard,
    isLoading: loadingDashboard,
    isFetching: fetchingDashboard,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useGetOperationsDashboardQuery(dashboardArgs);

  const {
    data: ragEvalRuns,
    isLoading: loadingRagRuns,
    isFetching: fetchingRagRuns,
    error: ragRunsError,
    refetch: refetchRagRuns,
  } = useGetOperationsRagEvalsQuery(ragEvalArgs);

  const [runSmokeValidation, smokeMutation] = useRunOperationsSmokeValidationMutation();

  const metricsSnapshot = dashboard?.metrics;
  const metrics = [
    {
      id: 'feasible-rate',
      title: t('operations.metrics.feasibleRate'),
      value: formatPercent(metricsSnapshot?.feasible_rate),
    },
    {
      id: 'hard-violations',
      title: t('operations.metrics.hardViolations'),
      value: formatInt(metricsSnapshot?.hard_constraints_violations),
    },
    {
      id: 'guardrail-triggers',
      title: t('operations.metrics.guardrailTriggers'),
      value: formatInt(metricsSnapshot?.rag_guardrail_triggers),
    },
    {
      id: 'agent-tool-success',
      title: t('operations.metrics.agentToolSuccess'),
      value: formatPercent(metricsSnapshot?.agent_tool_success_rate),
    },
    {
      id: 'what-if-completion',
      title: t('operations.metrics.whatIfCompletion'),
      value: formatPercent(metricsSnapshot?.what_if_completion_rate),
    },
    {
      id: 'p95-api',
      title: t('operations.metrics.apiLatencyP95'),
      value: formatMs(metricsSnapshot?.p95_latency_api_ms),
    },
    {
      id: 'p95-compute',
      title: t('operations.metrics.computeLatencyP95'),
      value: formatMs(metricsSnapshot?.p95_latency_compute_ms),
    },
    {
      id: 'p95-projection',
      title: t('operations.metrics.projectionLatencyP95'),
      value: formatMs(metricsSnapshot?.p95_latency_projection_ms),
    },
    {
      id: 'diet-runs',
      title: t('operations.metrics.dietRunsTotal'),
      value: formatInt(metricsSnapshot?.diet_runs_total),
    },
    {
      id: 'projection-calls',
      title: t('operations.metrics.projectionCallsTotal'),
      value: formatInt(metricsSnapshot?.projection_calls_total),
    },
  ];

  const handleRunSmoke = async (): Promise<void> => {
    setSmokeErrorMessage(null);
    try {
      const result = await runSmokeValidation().unwrap();
      setLastSmokeResult(result);
    } catch (error) {
      setSmokeErrorMessage(resolveErrorMessage(error, t('operations.errors.runSmoke')));
    }
  };

  const handleRefresh = (): void => {
    void refetchDashboard();
    void refetchRagRuns();
  };

  const errors = [
    dashboardError ? resolveErrorMessage(dashboardError, t('operations.errors.dashboardLoad')) : null,
    ragRunsError ? resolveErrorMessage(ragRunsError, t('operations.errors.runsLoad')) : null,
    smokeMutation.isError ? resolveErrorMessage(smokeMutation.error, t('operations.errors.runSmoke')) : null,
    smokeErrorMessage,
  ].filter(Boolean) as string[];

  return (
    <OperationsView
      title={t('operations.title')}
      subtitle={t('operations.subtitle')}
      generatedAtLabel={t('operations.generatedAt', {
        timestamp: formatDateTime(dashboard?.generatedAt),
      })}
      loadingLabel={t('common.status.loading')}
      metricsTitle={t('operations.metrics.title')}
      runsTitle={t('operations.runs.title')}
      runsEmptyLabel={t('operations.runs.empty')}
      smokeTitle={t('operations.smoke.title')}
      smokeEmptyLabel={t('operations.smoke.empty')}
      smokePassLabel={t('operations.smoke.pass')}
      smokeFailLabel={t('operations.smoke.fail')}
      refreshLabel={t('operations.actions.refresh')}
      runSmokeLabel={t('operations.actions.runSmoke')}
      runningSmokeLabel={t('operations.actions.runningSmoke')}
      errors={errors}
      isLoading={loadingDashboard || loadingRagRuns}
      isRefreshing={fetchingDashboard || fetchingRagRuns}
      isRunningSmoke={smokeMutation.isLoading}
      metrics={metrics}
      runs={ragEvalRuns ?? dashboard?.latestRuns ?? []}
      smokeResult={lastSmokeResult}
      checkLabels={{
        computeHealth: t('operations.smoke.checks.computeHealth'),
        ragEvaluate: t('operations.smoke.checks.ragEvaluate'),
        agentGuardrail: t('operations.smoke.checks.agentGuardrail'),
      }}
      onRefresh={handleRefresh}
      onRunSmoke={() => {
        void handleRunSmoke();
      }}
    />
  );
}

function formatPercent(value: number | undefined): string {
  return `${(((value ?? 0) as number) * 100).toFixed(1)}%`;
}

function formatInt(value: number | undefined): string {
  return String(Math.round(value ?? 0));
}

function formatMs(value: number | undefined): string {
  return `${Math.round(value ?? 0)} ms`;
}

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    if ('status' in error) {
      const payload = (error as { data?: unknown }).data;
      if (typeof payload === 'string') {
        return payload;
      }
      if (typeof payload === 'object' && payload !== null && 'message' in payload) {
        const message = (payload as { message?: unknown }).message;
        if (typeof message === 'string') {
          return message;
        }
      }
    }
    if ('message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
    }
  }
  return fallback;
}
