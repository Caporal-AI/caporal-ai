import { styled } from '@mui/material/styles';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { AgentMode, ConstraintReportItem, DietRun, InfeasibilityPriorityAction, MixItem } from '../../../types';
import { SectionHeader } from '../../../components/atoms/SectionHeader';
import { SectionCard } from '../../../components/atoms/SectionCard';
import { constraintLabels, statusLabels } from '../../../ui/labels';

interface ProfileOption {
  id: string;
  label: string;
}

interface StrategyOption {
  id: string;
  label: string;
  description: string;
}

interface GenerateDietViewProps {
  title: string;
  subtitle: string;
  errors: string[];
  successMessage: string | null;
  profiles: ProfileOption[];
  selectedProfileId: string;
  strategyOptions: StrategyOption[];
  selectedStrategyId: string;
  strategyDate: string;
  strategyInfo: string;
  strategyMatchCount: number;
  applyingStrategy: boolean;
  generatingDiet: boolean;
  selectedRun: DietRun | null;
  mixItems: MixItem[];
  constraints: ConstraintReportItem[];
  warnings: string[];
  actions: InfeasibilityPriorityAction[];
  applyingActionKey: string | null;
  isApplyingAll: boolean;
  onProfileChange: (id: string) => void;
  onGenerate: () => void;
  onStrategyChange: (id: string) => void;
  onStrategyDateChange: (value: string) => void;
  onApplyStrategy: () => void;
  onApplyAction: (action: InfeasibilityPriorityAction) => void;
  onApplyAllActions: () => void;
  onAskAssistant: (request: { message: string; mode?: AgentMode }) => void;
}

const Root = styled(Box)`
  display: grid;
  gap: 0.9rem;
`;

const Alerts = styled(Box)`
  display: grid;
  gap: 0.6rem;
`;

const FormBlock = styled(Box)`
  display: grid;
  row-gap: 1.15rem;
  margin-top: 0.15rem;
`;

const ControlRow = styled(Box)`
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(1, minmax(0, 1fr));

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }
`;

const StrategyCard = styled(SectionCard)`
  padding: 0.95rem;
`;

const StrategyRow = styled(Box)`
  display: grid;
  gap: 0.9rem;
  margin-top: 0.95rem;
  grid-template-columns: repeat(1, minmax(0, 1fr));

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr) 12rem auto;
    align-items: end;
  }
`;

const SummaryGrid = styled(Box)`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(1, minmax(0, 1fr));

  @media (min-width: 960px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const SummaryCard = styled(Card)<{ tone: 'neutral' | 'success' | 'danger' }>(({ tone, theme }) => ({
  borderRadius: 12,
  border: tone === 'success'
    ? '1px solid rgba(94, 127, 59, 0.54)'
    : tone === 'danger'
      ? '1px solid rgba(182, 75, 46, 0.58)'
      : `1px solid ${theme.palette.divider}`,
  background: tone === 'success'
    ? theme.palette.mode === 'dark'
      ? 'rgba(94, 127, 59, 0.2)'
      : 'rgba(94, 127, 59, 0.12)'
    : tone === 'danger'
      ? theme.palette.mode === 'dark'
        ? 'rgba(182, 75, 46, 0.2)'
        : 'rgba(182, 75, 46, 0.12)'
      : 'transparent',
}));

const SummaryTitle = styled(Typography)`
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const SummaryValue = styled(Typography)<{ tone: 'neutral' | 'success' | 'danger' }>(({ tone }) => ({
  marginTop: 6,
  fontWeight: 800,
  color:
    tone === 'success'
      ? '#5e7f3b'
      : tone === 'danger'
        ? '#b64b2e'
        : 'inherit',
}));

const MixList = styled(Box)`
  display: grid;
  gap: 0.9rem;
  margin-top: 0.95rem;
`;

const MixRow = styled(Box)`
  display: grid;
  gap: 0.35rem;
`;

const MixHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  gap: 0.65rem;
  align-items: center;
`;

const FoldSection = styled(Accordion)`
  border-radius: 12px;
`;

const FoldSectionSummary = styled(AccordionSummary)`
  min-height: 54px;
`;

const FoldSectionDetails = styled(AccordionDetails)`
  padding-top: 0.25rem;
`;

const FoldHint = styled(Typography)`
  font-size: 0.78rem;
`;

const ConstraintsList = styled(Stack)`
  margin-top: 0.5rem;
`;

const ConstraintItemCard = styled(Card)`
  border-radius: 12px;
`;

const ActionList = styled(Stack)`
  margin-top: 0.8rem;
`;

const ActionRow = styled(Box)`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 0.55rem;
`;

const FoldStack = styled(Stack)`
  margin-top: 0.35rem;
`;

export function GenerateDietView({
  title,
  subtitle,
  errors,
  successMessage,
  profiles,
  selectedProfileId,
  strategyOptions,
  selectedStrategyId,
  strategyDate,
  strategyInfo,
  strategyMatchCount,
  applyingStrategy,
  generatingDiet,
  selectedRun,
  mixItems,
  constraints,
  warnings,
  actions,
  applyingActionKey,
  isApplyingAll,
  onProfileChange,
  onGenerate,
  onStrategyChange,
  onStrategyDateChange,
  onApplyStrategy,
  onApplyAction,
  onApplyAllActions,
  onAskAssistant,
}: GenerateDietViewProps): JSX.Element {
  const runStatusTone: 'success' | 'danger' =
    selectedRun?.status === 'SUCCESS' ? 'success' : 'danger';

  return (
    <Root>
      <SectionHeader title={title} subtitle={subtitle} />

      <Alerts>
        {errors.map((error) => (
          <Alert key={error} severity="error">
            {error}
          </Alert>
        ))}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
      </Alerts>

      <SectionCard>
        <FormBlock>
          <ControlRow>
            <FormControl fullWidth>
              <InputLabel id="profile-select-label">Tipo de ganado</InputLabel>
              <Select
                labelId="profile-select-label"
                value={selectedProfileId}
                label="Tipo de ganado"
                onChange={(event) => {
                  onProfileChange(event.target.value);
                }}
              >
                {profiles.map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              disabled={!selectedProfileId || generatingDiet}
              onClick={onGenerate}
            >
              {generatingDiet ? 'Calculando...' : 'Generar recomendacion'}
            </Button>
          </ControlRow>

          <StrategyCard>
            <Typography fontWeight={800}>Perfiles operativos de ingredientes</Typography>
            <Typography variant="body2" color="text.secondary" marginTop={0.5}>
              {strategyInfo}
            </Typography>

            <StrategyRow>
              <FormControl fullWidth>
                <InputLabel id="strategy-select-label">Perfil de ingredientes</InputLabel>
                <Select
                  labelId="strategy-select-label"
                  value={selectedStrategyId}
                  label="Perfil de ingredientes"
                  onChange={(event) => {
                    onStrategyChange(event.target.value);
                  }}
                >
                  {strategyOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                type="date"
                label="Fecha precio"
                value={strategyDate}
                InputLabelProps={{ shrink: true }}
                onChange={(event) => {
                  onStrategyDateChange(event.target.value);
                }}
              />
              <Button
                variant="contained"
                color="secondary"
                disabled={applyingStrategy || strategyMatchCount === 0}
                onClick={onApplyStrategy}
              >
                {applyingStrategy ? 'Aplicando...' : 'Aplicar perfil'}
              </Button>
            </StrategyRow>
          </StrategyCard>
        </FormBlock>
      </SectionCard>

      {selectedRun ? (
        <>
          <SummaryGrid>
            <SummaryCard tone={runStatusTone} variant="outlined">
              <Stack padding={1.1}>
                <SummaryTitle color="text.secondary">Estado</SummaryTitle>
                <SummaryValue variant="h6" tone={runStatusTone}>
                  {statusLabels[selectedRun.status] ?? selectedRun.status}
                </SummaryValue>
                <Typography variant="body2" color="text.secondary">
                  Corrida {selectedRun.id.slice(0, 8)}
                </Typography>
              </Stack>
            </SummaryCard>
            <SummaryCard tone={runStatusTone} variant="outlined">
              <Stack padding={1.1}>
                <SummaryTitle color="text.secondary">Costo diario</SummaryTitle>
                <SummaryValue variant="h6" tone={runStatusTone}>
                  {selectedRun.solutionSnapshotJson.totalCostMxnPerHeadDay.toFixed(2)} MXN/cab
                </SummaryValue>
                <Typography variant="body2" color="text.secondary">
                  Estimado por cabeza por dia
                </Typography>
              </Stack>
            </SummaryCard>
            <SummaryCard tone="neutral" variant="outlined">
              <Stack padding={1.1}>
                <SummaryTitle color="text.secondary">Ingredientes usados</SummaryTitle>
                <SummaryValue variant="h6" tone="neutral">
                  {String(mixItems.length)}
                </SummaryValue>
                <Typography variant="body2" color="text.secondary">
                  Participan en la mezcla factible
                </Typography>
              </Stack>
            </SummaryCard>
          </SummaryGrid>

          {warnings.length > 0 ? (
            <Alert severity="warning">
              <Stack spacing={0.4}>
                {warnings.map((warning) => (
                  <Typography key={warning} variant="body2">
                    • {warning}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}

          {actions.length > 0 ? (
            <SectionCard>
              <Typography variant="h6" fontWeight={800}>
                Recuperacion de factibilidad
              </Typography>
              <ActionRow>
                <Button
                  variant="contained"
                  disabled={isApplyingAll || actions.length === 0}
                  onClick={onApplyAllActions}
                >
                  {isApplyingAll ? 'Aplicando...' : 'Aplicar todo y recalcular'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    onAskAssistant({
                      mode: 'WHY',
                      message: 'Prioriza estos ajustes y explica el orden operativo recomendado.',
                    });
                  }}
                >
                  Preguntar a Caporal IA
                </Button>
              </ActionRow>
              <ActionList spacing={1}>
                {actions.map((action) => (
                  <Card key={`${action.priority}-${action.title}`} variant="outlined">
                    <Stack padding={1.2} spacing={0.35}>
                      <Typography fontWeight={800}>
                        {action.priority}. {action.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {action.reason}
                      </Typography>
                      <ActionRow>
                        {action.ingredientId ? (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={applyingActionKey === `${action.priority}-${action.title}`}
                            onClick={() => {
                              onApplyAction(action);
                            }}
                          >
                            {applyingActionKey === `${action.priority}-${action.title}` ? 'Aplicando...' : 'Aplicar'}
                          </Button>
                        ) : null}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            onAskAssistant({
                              mode: 'WHY',
                              message: `Explica como ejecutar esta prioridad: ${action.title}.`,
                            });
                          }}
                        >
                          Analizar
                        </Button>
                      </ActionRow>
                    </Stack>
                  </Card>
                ))}
              </ActionList>
            </SectionCard>
          ) : null}

          <FoldStack spacing={1}>
            <FoldSection defaultExpanded>
              <FoldSectionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%" gap={1}>
                  <Typography variant="h6" fontWeight={800}>
                    Composicion recomendada
                  </Typography>
                  <FoldHint color="text.secondary">{mixItems.length} ingredientes</FoldHint>
                </Stack>
              </FoldSectionSummary>
              <FoldSectionDetails>
                <MixList>
                  {mixItems.map((item) => (
                    <MixRow key={item.ingredientId}>
                      <MixHeader>
                        <Typography fontWeight={700}>{item.ingredientId}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          {item.pctDm.toFixed(2)}% | {item.kgAsFedPerHeadDay.toFixed(2)} kg/dia
                        </Typography>
                      </MixHeader>
                      <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, item.pctDm))} />
                    </MixRow>
                  ))}
                </MixList>
              </FoldSectionDetails>
            </FoldSection>

            <FoldSection>
              <FoldSectionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%" gap={1}>
                  <Typography variant="h6" fontWeight={800}>
                    Seguridad nutricional
                  </Typography>
                  <FoldHint color="text.secondary">{constraints.length} reglas evaluadas</FoldHint>
                </Stack>
              </FoldSectionSummary>
              <FoldSectionDetails>
                <ConstraintsList spacing={1}>
                  {constraints.map((item) => (
                    <ConstraintItemCard key={item.code} variant="outlined">
                      <Stack direction="row" justifyContent="space-between" alignItems="center" padding={1.1} gap={1}>
                        <Box>
                          <Typography fontWeight={700}>
                            {constraintLabels[item.code] ?? item.code}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Actual: {formatConstraintActual(item.code, item.actual)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Objetivo: {formatConstraintTarget(item.code, item.target)}
                          </Typography>
                        </Box>
                        <Chip
                          color={item.met ? 'success' : 'error'}
                          label={item.met ? 'En rango' : 'Fuera de rango'}
                        />
                      </Stack>
                    </ConstraintItemCard>
                  ))}
                </ConstraintsList>
              </FoldSectionDetails>
            </FoldSection>
          </FoldStack>
        </>
      ) : (
        <SectionCard>
          <Typography color="text.secondary">
            Aun no hay corrida de dieta. Ejecuta una generacion para mostrar resumen y checklist.
          </Typography>
        </SectionCard>
      )}
    </Root>
  );
}

function formatConstraintActual(code: string, value: number): string {
  if (code === 'ME_MCAL_KGDM') {
    return `${value.toFixed(2)} Mcal/kg MS`;
  }
  if (code === 'TOTAL_DM') {
    return `${value.toFixed(2)} kg/dia`;
  }
  if (code === 'CP' || code === 'NDF' || code === 'Ca' || code === 'P') {
    return `${(value * 100).toFixed(2)}% de MS`;
  }
  return Number(value.toFixed(3)).toString();
}

function formatConstraintTarget(code: string, rawTarget: string): string {
  const trimmed = rawTarget.trim();
  const rangeMatch = trimmed.match(/^\[([0-9.+-]+),\s*([0-9.+-]+)\]\s*([a-z_]+)?$/i);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    const unit = rangeMatch[3] ?? inferUnitFromCode(code);
    return `${formatValueByUnit(code, min, unit)} - ${formatValueByUnit(code, max, unit)}`;
  }

  const opMatch = trimmed.match(/^(>=|<=|>|<|=)\s*([0-9.+-]+)\s*([a-z_]+)?$/i);
  if (opMatch) {
    const operator = opMatch[1];
    const value = Number(opMatch[2]);
    const unit = opMatch[3] ?? inferUnitFromCode(code);
    return `${operator} ${formatValueByUnit(code, value, unit)}`;
  }

  const firstNumeric = trimmed.match(/([0-9.+-]+)/);
  if (firstNumeric) {
    const value = Number(firstNumeric[1]);
    return formatValueByUnit(code, value, inferUnitFromCode(code));
  }

  return trimmed;
}

function inferUnitFromCode(code: string): string {
  if (code === 'TOTAL_DM') {
    return 'kg_per_day';
  }
  if (code === 'ME_MCAL_KGDM') {
    return 'per_kg_dm';
  }
  return 'fraction_dm';
}

function formatValueByUnit(code: string, value: number, unitRaw: string): string {
  const unit = unitRaw.toLowerCase();
  if (code === 'ME_MCAL_KGDM' || unit === 'per_kg_dm') {
    return `${value.toFixed(2)} Mcal/kg MS`;
  }
  if (unit === 'kg_per_day') {
    return `${value.toFixed(2)} kg/dia`;
  }
  if (unit === 'pct_dm') {
    return `${value.toFixed(1)}% de MS`;
  }
  if (unit === 'fraction_dm') {
    return `${(value * 100).toFixed(2)}% de MS`;
  }
  return Number(value.toFixed(3)).toString();
}
