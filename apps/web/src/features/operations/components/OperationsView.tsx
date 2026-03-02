import styled from '@emotion/styled';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { SectionHeader } from '../../../components/atoms/SectionHeader';
import { SectionCard } from '../../../components/atoms/SectionCard';
import { StatusPill } from '../../../components/atoms/StatusPill';
import { MetricCard } from '../../../components/molecules/MetricCard';
import type { OperationCheck, RagEvalRunItem, SmokeValidationResult } from '../../../types';

interface OperationsMetricItem {
  id: string;
  title: string;
  value: string;
  hint?: string;
}

interface OperationsViewProps {
  title: string;
  subtitle: string;
  generatedAtLabel: string;
  loadingLabel: string;
  metricsTitle: string;
  runsTitle: string;
  runsEmptyLabel: string;
  smokeTitle: string;
  smokeEmptyLabel: string;
  smokePassLabel: string;
  smokeFailLabel: string;
  refreshLabel: string;
  runSmokeLabel: string;
  runningSmokeLabel: string;
  errors: string[];
  isLoading: boolean;
  isRefreshing: boolean;
  isRunningSmoke: boolean;
  metrics: OperationsMetricItem[];
  runs: RagEvalRunItem[];
  smokeResult: SmokeValidationResult | null;
  checkLabels: {
    computeHealth: string;
    ragEvaluate: string;
    agentGuardrail: string;
  };
  onRefresh: () => void;
  onRunSmoke: () => void;
}

const Root = styled(Box)`
  display: grid;
  gap: 0.9rem;
`;

const Alerts = styled(Box)`
  display: grid;
  gap: 0.65rem;
`;

const ActionsRow = styled(Box)`
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  flex-wrap: wrap;
`;

const MetricsGrid = styled(Box)`
  margin-top: 0.8rem;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(1, minmax(0, 1fr));

  @media (min-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const RunsStack = styled(Stack)`
  margin-top: 0.75rem;
`;

const CheckGrid = styled(Box)`
  margin-top: 0.75rem;
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(1, minmax(0, 1fr));

  @media (min-width: 960px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const CheckTitle = styled(Typography)`
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const CheckBody = styled(Typography)`
  margin-top: 0.45rem;
  word-break: break-word;
`;

function renderCheckDetail(check: OperationCheck): string {
  const pairs = Object.entries(check.detail);
  if (pairs.length === 0) {
    return '-';
  }

  return pairs
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join(' | ');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NaN';
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function OperationsView({
  title,
  subtitle,
  generatedAtLabel,
  loadingLabel,
  metricsTitle,
  runsTitle,
  runsEmptyLabel,
  smokeTitle,
  smokeEmptyLabel,
  smokePassLabel,
  smokeFailLabel,
  refreshLabel,
  runSmokeLabel,
  runningSmokeLabel,
  errors,
  isLoading,
  isRefreshing,
  isRunningSmoke,
  metrics,
  runs,
  smokeResult,
  checkLabels,
  onRefresh,
  onRunSmoke,
}: OperationsViewProps): JSX.Element {
  const showLoader = isLoading && metrics.length === 0 && runs.length === 0;

  return (
    <Root>
      <SectionHeader title={title} subtitle={subtitle} />

      <Alerts>
        {errors.map((error) => (
          <Alert key={error} severity="error">
            {error}
          </Alert>
        ))}
      </Alerts>

      <SectionCard>
        <ActionsRow>
          <Button
            variant="outlined"
            onClick={onRefresh}
            disabled={isRefreshing || isLoading}
          >
            {refreshLabel}
          </Button>
          <Button
            variant="contained"
            onClick={onRunSmoke}
            disabled={isRunningSmoke}
          >
            {isRunningSmoke ? runningSmokeLabel : runSmokeLabel}
          </Button>
        </ActionsRow>
      </SectionCard>

      {showLoader ? (
        <SectionCard>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">{loadingLabel}</Typography>
          </Stack>
        </SectionCard>
      ) : null}

      <SectionCard>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Typography variant="h6" fontWeight={800}>{metricsTitle}</Typography>
          <Typography variant="caption" color="text.secondary">{generatedAtLabel}</Typography>
        </Stack>
        <MetricsGrid>
          {metrics.map((item) => (
            <MetricCard
              key={item.id}
              title={item.title}
              value={item.value}
              hint={item.hint}
            />
          ))}
        </MetricsGrid>
      </SectionCard>

      <SectionCard>
        <Typography variant="h6" fontWeight={800}>{runsTitle}</Typography>
        {runs.length === 0 ? (
          <Typography marginTop={1} color="text.secondary">{runsEmptyLabel}</Typography>
        ) : (
          <RunsStack spacing={0.75}>
            {runs.map((run) => (
              <SectionCard key={run.id}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                  gap={1}
                >
                  <Box>
                    <Typography fontWeight={800}>{run.runName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(run.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <StatusPill
                    label={
                      run.summary
                        ? `${run.summary.totalScenarios} escenarios`
                        : 'Sin resumen'
                    }
                    color={run.summary ? 'info' : 'default'}
                  />
                </Stack>
                {run.summary ? (
                  <>
                    <Divider sx={{ marginBlock: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Citation: {(run.summary.citationCoverageTechnical * 100).toFixed(1)}% | Grounded: {(run.summary.groundedResponseRate * 100).toFixed(1)}% | Unsafe leakage: {(run.summary.unsafeNumericLeakageRate * 100).toFixed(1)}%
                    </Typography>
                  </>
                ) : null}
              </SectionCard>
            ))}
          </RunsStack>
        )}
      </SectionCard>

      <SectionCard>
        <Typography variant="h6" fontWeight={800}>{smokeTitle}</Typography>
        {!smokeResult ? (
          <Typography marginTop={1} color="text.secondary">{smokeEmptyLabel}</Typography>
        ) : (
          <Box marginTop={0.75}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              gap={1}
            >
              <Box>
                <Typography fontWeight={800}>{smokeResult.runName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(smokeResult.executedAt).toLocaleString()}
                </Typography>
              </Box>
              <StatusPill
                label={smokeResult.passed ? smokePassLabel : smokeFailLabel}
                color={smokeResult.passed ? 'success' : 'error'}
                variant="filled"
              />
            </Stack>

            <CheckGrid>
              <SectionCard>
                <CheckTitle color="text.secondary">{checkLabels.computeHealth}</CheckTitle>
                <StatusPill
                  label={smokeResult.checks.computeHealth.ok ? 'OK' : 'FAIL'}
                  color={smokeResult.checks.computeHealth.ok ? 'success' : 'error'}
                />
                <CheckBody variant="body2" color="text.secondary">
                  {renderCheckDetail(smokeResult.checks.computeHealth)}
                </CheckBody>
              </SectionCard>

              <SectionCard>
                <CheckTitle color="text.secondary">{checkLabels.ragEvaluate}</CheckTitle>
                <StatusPill
                  label={smokeResult.checks.ragEvaluate.ok ? 'OK' : 'FAIL'}
                  color={smokeResult.checks.ragEvaluate.ok ? 'success' : 'error'}
                />
                <CheckBody variant="body2" color="text.secondary">
                  {renderCheckDetail(smokeResult.checks.ragEvaluate)}
                </CheckBody>
              </SectionCard>

              <SectionCard>
                <CheckTitle color="text.secondary">{checkLabels.agentGuardrail}</CheckTitle>
                <StatusPill
                  label={smokeResult.checks.agentGuardrail.ok ? 'OK' : 'FAIL'}
                  color={smokeResult.checks.agentGuardrail.ok ? 'success' : 'error'}
                />
                <CheckBody variant="body2" color="text.secondary">
                  {renderCheckDetail(smokeResult.checks.agentGuardrail)}
                </CheckBody>
              </SectionCard>
            </CheckGrid>
          </Box>
        )}
      </SectionCard>
    </Root>
  );
}
