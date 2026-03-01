import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useEffect, useMemo, useState } from 'react';
import {
  useGenerateDietMutation,
  useGetIngredientPricesQuery,
  useGetDietRunsQuery,
  useGetIngredientsQuery,
  useGetProfilesQuery,
  usePostPriceMutation,
  useUpdateIngredientMutation,
} from '../api/caporalApi';
import type { AgentMode, DietRun, InfeasibilityPriorityAction, Ingredient } from '../types';
import { getInfeasibilityAnalysis } from '../ui/infeasibilityAnalysis';
import { constraintLabels, statusLabels } from '../ui/labels';
import {
  getIngredientStrategyAdjustment,
  ingredientStrategyMetas,
  type IngredientStrategyId,
} from '../ui/ingredientStrategyProfiles';
import { normalizeSolverWarning } from '../ui/solverWarnings';

interface GenerateDietScreenProps {
  selectedDietRunId: string | null;
  onDietRunSelected: (dietRunId: string) => void;
  onAskAssistant: (request: { message: string; mode?: AgentMode }) => void;
}

interface IngredientAdjustmentDraft {
  ingredientId: string;
  name: string;
  dryMatterPct: number;
  minInclusionPct: number;
  maxInclusionPct: number;
  proteinPct: number;
  fiberPct: number;
  energy: number;
  priceMxnPerKgAsFed: number;
  effectiveDate: string;
}

export function GenerateDietScreen({
  selectedDietRunId,
  onDietRunSelected,
  onAskAssistant,
}: GenerateDietScreenProps): JSX.Element {
  const { data: profiles, isLoading: loadingProfiles } = useGetProfilesQuery();
  const { data: dietRuns } = useGetDietRunsQuery();
  const { data: ingredients } = useGetIngredientsQuery();
  const [generateDiet, generateState] = useGenerateDietMutation();
  const [updateIngredient] = useUpdateIngredientMutation();
  const [postPrice] = usePostPriceMutation();

  const [profileId, setProfileId] = useState<string>('');
  const [maxSolveMs, setMaxSolveMs] = useState<number>(4000);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [strategyId, setStrategyId] = useState<IngredientStrategyId>('BALANCED');
  const [strategyDate, setStrategyDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [applyingStrategy, setApplyingStrategy] = useState(false);
  const [strategyFeedback, setStrategyFeedback] = useState<string | null>(null);
  const [strategyError, setStrategyError] = useState<string | null>(null);

  const selectedStrategyMeta = useMemo(
    () => ingredientStrategyMetas.find((item) => item.id === strategyId) ?? ingredientStrategyMetas[0],
    [strategyId],
  );
  const strategyMatchCount = useMemo(() => {
    const source = ingredients ?? [];
    return source.filter((ingredient) => !!getIngredientStrategyAdjustment(strategyId, ingredient)).length;
  }, [ingredients, strategyId]);

  useEffect(() => {
    if (!profileId && (profiles?.length ?? 0) > 0) {
      setProfileId(profiles?.[0]?.id ?? '');
    }
  }, [profileId, profiles]);

  const selectedDietRun = useMemo(() => {
    const source = dietRuns ?? [];
    if (selectedDietRunId) {
      const found = source.find((item) => item.id === selectedDietRunId);
      if (found) {
        return found;
      }
    }

    return source[0] ?? null;
  }, [dietRuns, selectedDietRunId]);

  const ingredientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (ingredients ?? []).forEach((item) => {
      map.set(item.id, item.name);
    });
    return map;
  }, [ingredients]);

  const handleGenerate = async (): Promise<void> => {
    if (!profileId) {
      return;
    }

    const response = await generateDiet({ animalProfileId: profileId, maxSolveMs }).unwrap();
    onDietRunSelected(response.id);
  };

  const applyIngredientStrategy = async (): Promise<void> => {
    const source = ingredients ?? [];
    if (source.length === 0) {
      setStrategyError('No hay ingredientes cargados para aplicar un perfil.');
      setStrategyFeedback(null);
      return;
    }

    setApplyingStrategy(true);
    setStrategyFeedback(null);
    setStrategyError(null);

    let updatedCount = 0;
    let pricedCount = 0;
    try {
      for (const ingredient of source) {
        const adjustment = getIngredientStrategyAdjustment(strategyId, ingredient);
        if (!adjustment) {
          continue;
        }

        await updateIngredient({
          id: ingredient.id,
          body: {
            minInclusionPct: adjustment.minInclusionPct,
            maxInclusionPct: adjustment.maxInclusionPct,
          },
        }).unwrap();
        updatedCount += 1;

        if ((adjustment.priceMxnPerKgAsFed ?? 0) > 0) {
          const safeEffectiveDate = strategyDate || new Date().toISOString().slice(0, 10);
          await postPrice({
            ingredientId: ingredient.id,
            body: {
              priceMxnPerKgAsFed: adjustment.priceMxnPerKgAsFed ?? 0,
              effectiveDate: safeEffectiveDate,
              locationCode: 'MX-NL',
            },
          }).unwrap();
          pricedCount += 1;
        }
      }

      const feedbackBase = `Perfil "${selectedStrategyMeta.label}" aplicado en ${updatedCount} ingredientes; ${pricedCount} precios actualizados.`;
      if (!profileId) {
        setStrategyFeedback(feedbackBase);
        return;
      }

      const response = await generateDiet({ animalProfileId: profileId, maxSolveMs }).unwrap();
      onDietRunSelected(response.id);
      setStrategyFeedback(`${feedbackBase} Se recalculo la recomendacion.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo aplicar el perfil.';
      setStrategyError(message);
      setStrategyFeedback(null);
    } finally {
      setApplyingStrategy(false);
    }
  };

  if (loadingProfiles) {
    return (
      <Box sx={{ minHeight: 300, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2.2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          Generar dieta en 3 pasos
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mt={1.2}>
          <StepChip label="1. Elige el tipo de ganado" />
          <StepChip label="2. Presiona Generar" />
          <StepChip label="3. Revisa el resumen" />
        </Stack>
      </Paper>

      {generateState.isError && (
        <Alert severity="error">
          No se pudo generar la dieta. Revisa que tengas precios actualizados en ingredientes.
        </Alert>
      )}
      {strategyError ? <Alert severity="error">{strategyError}</Alert> : null}
      {strategyFeedback ? <Alert severity="success">{strategyFeedback}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.4} alignItems="center">
          <FormControl fullWidth>
            <InputLabel id="profile-label">Tipo de ganado</InputLabel>
            <Select
              labelId="profile-label"
              value={profileId}
              label="Tipo de ganado"
              onChange={(event) => {
                setProfileId(event.target.value);
              }}
            >
              {(profiles ?? []).map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  {profile.name} (consumo estimado: {profile.intakeDmKgPerDay} kg/dia)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            size="large"
            disabled={!profileId || generateState.isLoading}
            onClick={() => {
              void handleGenerate();
            }}
          >
            {generateState.isLoading ? 'Calculando...' : 'Generar recomendacion'}
          </Button>
        </Stack>

        <Accordion
          expanded={showAdvanced}
          onChange={(_, expanded) => {
            setShowAdvanced(expanded);
          }}
          sx={{ mt: 1.2, bgcolor: 'transparent', boxShadow: 'none' }}
        >
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Typography fontWeight={700}>Opciones avanzadas</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.2}>
              <Typography variant="body2" color="text.secondary">
                Tiempo maximo de calculo: define cuanto espera el sistema por el solver antes de cortar.
                Para uso diario, 4 segundos suele ser suficiente.
              </Typography>
              <Slider
                value={maxSolveMs}
                min={1000}
                max={8000}
                step={250}
                marks={[
                  { value: 1000, label: '1s' },
                  { value: 4000, label: '4s' },
                  { value: 8000, label: '8s' },
                ]}
                onChange={(_, value) => {
                  setMaxSolveMs(Number(value));
                }}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Valor actual: {Math.round(maxSolveMs / 100) / 10}s
              </Typography>

              <Card
                sx={{
                  p: 1.2,
                  mt: 0.5,
                  border: '1px solid rgba(76,224,179,0.25)',
                  bgcolor: 'rgba(76,224,179,0.05)',
                }}
              >
                <Typography fontWeight={800}>Perfiles operativos de ingredientes</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                  Prellena minimos, maximos y precio de referencia para simular escenarios rapido.
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mt={1}>
                  <FormControl fullWidth>
                    <InputLabel id="strategy-label">Perfil de ingredientes</InputLabel>
                    <Select
                      labelId="strategy-label"
                      value={strategyId}
                      label="Perfil de ingredientes"
                      onChange={(event) => {
                        setStrategyId(event.target.value as IngredientStrategyId);
                      }}
                    >
                      {ingredientStrategyMetas.map((meta) => (
                        <MenuItem key={meta.id} value={meta.id}>
                          {meta.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    type="date"
                    label="Fecha de precio"
                    value={strategyDate}
                    InputLabelProps={{ shrink: true }}
                    onChange={(event) => {
                      setStrategyDate(event.target.value);
                    }}
                    sx={{ minWidth: { xs: '100%', md: 190 } }}
                  />

                  <Button
                    variant="contained"
                    disabled={applyingStrategy || strategyMatchCount === 0}
                    onClick={() => {
                      void applyIngredientStrategy();
                    }}
                    sx={{ minWidth: { xs: '100%', md: 290 } }}
                  >
                    {applyingStrategy ? 'Aplicando perfil...' : 'Aplicar perfil, precios y recalcular'}
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: 'block' }}>
                  {selectedStrategyMeta.description} Coincide con {strategyMatchCount} ingredientes del catalogo.
                </Typography>
              </Card>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {selectedDietRun ? (
        <DietRunOverview
          dietRun={selectedDietRun}
          ingredients={ingredients ?? []}
          selectedProfileId={profileId}
          ingredientNameById={ingredientNameById}
          onAskAssistant={onAskAssistant}
          onRegenerate={handleGenerate}
        />
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            Cuando generes una dieta, aqui veras un resumen facil de entender con costo, composicion
            y estado de seguridad nutricional.
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}

function StepChip({ label }: { label: string }): JSX.Element {
  return (
    <Chip
      label={label}
      variant="outlined"
      sx={{
        justifyContent: 'flex-start',
        px: 0.4,
        '& .MuiChip-label': {
          fontWeight: 700,
        },
      }}
    />
  );
}

function DietRunOverview({
  dietRun,
  ingredients,
  selectedProfileId,
  ingredientNameById,
  onAskAssistant,
  onRegenerate,
}: {
  dietRun: DietRun;
  ingredients: Ingredient[];
  selectedProfileId: string;
  ingredientNameById: Map<string, string>;
  onAskAssistant: (request: { message: string; mode?: AgentMode }) => void;
  onRegenerate: () => Promise<void>;
}): JSX.Element {
  const [updateIngredient, updateIngredientState] = useUpdateIngredientMutation();
  const [postPrice, postPriceState] = usePostPriceMutation();
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [applyingActionKey, setApplyingActionKey] = useState<string | null>(null);
  const [manualDraft, setManualDraft] = useState<IngredientAdjustmentDraft | null>(null);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualSaveError, setManualSaveError] = useState<string | null>(null);

  const solution = dietRun.solutionSnapshotJson;

  const sortedMix = [...(solution.mix ?? [])].sort((a, b) => b.pctDm - a.pctDm);
  const constraints = solution.constraintsReport ?? [];
  const normalizedWarnings = (solution.warnings ?? []).map(normalizeSolverWarning);
  const infeasibility = getInfeasibilityAnalysis(dietRun);
  const canRegenerate = selectedProfileId.trim().length > 0;
  const ingredientById = useMemo(() => {
    const map = new Map<string, Ingredient>();
    ingredients.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [ingredients]);

  const { data: manualIngredientPrices } = useGetIngredientPricesQuery(manualDraft?.ingredientId ?? '', {
    skip: !manualDraft?.ingredientId,
  });

  const statusColor =
    dietRun.status === 'SUCCESS' ? 'success' : dietRun.status === 'INFEASIBLE' ? 'warning' : 'error';

  useEffect(() => {
    if (!manualDialogOpen || !manualDraft) {
      return;
    }

    const latestPrice = manualIngredientPrices?.[0];
    if (!latestPrice) {
      return;
    }

    setManualDraft((current) =>
      current
        ? {
            ...current,
            priceMxnPerKgAsFed: latestPrice.priceMxnPerKgAsFed,
            effectiveDate: latestPrice.effectiveDate,
          }
        : current,
    );
  }, [manualDialogOpen, manualDraft, manualIngredientPrices]);

  const actionableRecommendations = useMemo(
    () =>
      (infeasibility?.priorityActions ?? []).filter(
        (item) =>
          !!item.ingredientId &&
          (item.suggestedMinPct !== undefined ||
            item.suggestedMaxPct !== undefined),
      ),
    [infeasibility?.priorityActions],
  );

  const applyAction = async (
    action: InfeasibilityPriorityAction,
    options?: { regenerateAfter?: boolean },
  ): Promise<void> => {
    if (!action.ingredientId) {
      return;
    }
    const ingredient = ingredientById.get(action.ingredientId);
    if (!ingredient) {
      return;
    }

    const payload: Partial<Ingredient> = {};
    if (action.suggestedMinPct !== undefined) {
      payload.minInclusionPct = clampPct(action.suggestedMinPct);
    }
    if (action.suggestedMaxPct !== undefined) {
      payload.maxInclusionPct = clampPct(action.suggestedMaxPct);
    }
    if (
      payload.minInclusionPct !== undefined &&
      payload.maxInclusionPct !== undefined &&
      payload.minInclusionPct > payload.maxInclusionPct
    ) {
      payload.maxInclusionPct = payload.minInclusionPct;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    setApplyingActionKey(`${action.priority}-${action.title}`);
    try {
      await updateIngredient({
        id: ingredient.id,
        body: payload,
      }).unwrap();

      if (options?.regenerateAfter !== false && canRegenerate) {
        await onRegenerate();
      }
    } finally {
      setApplyingActionKey(null);
    }
  };

  const applyAllRecommendations = async (): Promise<void> => {
    if (actionableRecommendations.length === 0) {
      return;
    }
    setApplyingBulk(true);
    try {
      const alreadyAdjusted = new Set<string>();
      for (const action of actionableRecommendations) {
        if (!action.ingredientId || alreadyAdjusted.has(action.ingredientId)) {
          continue;
        }
        alreadyAdjusted.add(action.ingredientId);
        await applyAction(action, { regenerateAfter: false });
      }
      if (canRegenerate) {
        await onRegenerate();
      }
    } finally {
      setApplyingBulk(false);
    }
  };

  const openManualDialog = (action: InfeasibilityPriorityAction): void => {
    if (!action.ingredientId) {
      return;
    }
    const ingredient = ingredientById.get(action.ingredientId);
    if (!ingredient) {
      return;
    }

    setManualSaveError(null);
    setManualDraft({
      ingredientId: ingredient.id,
      name: ingredient.name,
      dryMatterPct: ingredient.dryMatterPct,
      minInclusionPct: action.suggestedMinPct ?? ingredient.minInclusionPct,
      maxInclusionPct: action.suggestedMaxPct ?? ingredient.maxInclusionPct,
      proteinPct: (ingredient.nutrientsJson.CP ?? 0) * 100,
      fiberPct: (ingredient.nutrientsJson.NDF ?? 0) * 100,
      energy: ingredient.nutrientsJson.ME_MCAL_KGDM ?? 0,
      priceMxnPerKgAsFed: manualIngredientPrices?.[0]?.priceMxnPerKgAsFed ?? 0,
      effectiveDate: manualIngredientPrices?.[0]?.effectiveDate ?? new Date().toISOString().slice(0, 10),
    });
    setManualDialogOpen(true);
  };

  const saveManualAdjustment = async (): Promise<void> => {
    if (!manualDraft) {
      return;
    }

    setManualSaveError(null);
    try {
      await updateIngredient({
        id: manualDraft.ingredientId,
        body: {
          dryMatterPct: clampRange(manualDraft.dryMatterPct, 1, 100),
          minInclusionPct: clampPct(Math.min(manualDraft.minInclusionPct, manualDraft.maxInclusionPct)),
          maxInclusionPct: clampPct(Math.max(manualDraft.maxInclusionPct, manualDraft.minInclusionPct)),
          nutrientsJson: {
            ...(ingredientById.get(manualDraft.ingredientId)?.nutrientsJson ?? {}),
            CP: safePositive(manualDraft.proteinPct) / 100,
            NDF: safePositive(manualDraft.fiberPct) / 100,
            ME_MCAL_KGDM: safePositive(manualDraft.energy),
          },
        },
      }).unwrap();

      const safePrice = safePositive(manualDraft.priceMxnPerKgAsFed);
      if (safePrice > 0) {
        await postPrice({
          ingredientId: manualDraft.ingredientId,
          body: {
            priceMxnPerKgAsFed: safePrice,
            effectiveDate: manualDraft.effectiveDate,
            locationCode: 'MX-NL',
          },
        }).unwrap();
      }

      setManualDialogOpen(false);
      if (canRegenerate) {
        await onRegenerate();
      }
    } catch (error) {
      setManualSaveError(error instanceof Error ? error.message : 'No se pudo guardar el ajuste.');
    }
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.3}>
          <Card sx={{ p: 1.6, flex: 1, bgcolor: 'rgba(76,224,179,0.08)' }}>
            <Typography color="text.secondary">Estado</Typography>
            <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
              <Chip color={statusColor} label={statusLabels[dietRun.status] ?? dietRun.status} />
            </Stack>
          </Card>

          <Card sx={{ p: 1.6, flex: 1 }}>
            <Typography color="text.secondary">Costo diario estimado</Typography>
            <Typography variant="h5" fontWeight={800} mt={0.4}>
              {solution.totalCostMxnPerHeadDay.toFixed(2)} MXN / cabeza
            </Typography>
          </Card>

          <Card sx={{ p: 1.6, flex: 1 }}>
            <Typography color="text.secondary">Ingredientes usados</Typography>
            <Typography variant="h5" fontWeight={800} mt={0.4}>
              {sortedMix.length}
            </Typography>
          </Card>
        </Stack>

        {normalizedWarnings.length ? (
          <Alert severity="warning" sx={{ mt: 1.4 }}>
            <Stack spacing={1}>
              <Box>
                {normalizedWarnings.map((warning) => (
                  <Typography key={warning} variant="body2">
                    • {warning}
                  </Typography>
                ))}
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  onAskAssistant({
                    mode: 'WHY',
                    message: buildTopCauseQuestion(dietRun, infeasibility),
                  });
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                Preguntar a Caporal IA
              </Button>
            </Stack>
          </Alert>
        ) : null}
        {updateIngredientState.isSuccess || postPriceState.isSuccess ? (
          <Alert severity="success" sx={{ mt: 1.1 }}>
            Ajuste aplicado. El plan se recalculo con los nuevos valores.
          </Alert>
        ) : null}
        {updateIngredientState.isError ? (
          <Alert severity="error" sx={{ mt: 1.1 }}>
            No se pudo guardar el ajuste del ingrediente.
          </Alert>
        ) : null}
        {postPriceState.isError ? (
          <Alert severity="error" sx={{ mt: 1.1 }}>
            No se pudo guardar el precio del ingrediente.
          </Alert>
        ) : null}
      </Paper>

      {dietRun.status === 'INFEASIBLE' && infeasibility ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={800}>
            Diagnostico automatico y plan de recuperacion
          </Typography>
          <Alert severity="warning" sx={{ mt: 1.1 }}>
            {infeasibility.summary}
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={1.1}>
            <Button
              variant="contained"
              disabled={actionableRecommendations.length === 0 || applyingBulk}
              onClick={() => {
                void applyAllRecommendations();
              }}
            >
              {applyingBulk ? 'Aplicando...' : 'Aplicar recomendaciones y recalcular'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                onAskAssistant({
                  mode: 'WHY',
                  message:
                    'Prioriza los ajustes del diagnostico y sugiere el orden operativo para recuperar factibilidad con el menor impacto en costo.',
                });
              }}
            >
              Priorizar con Caporal IA
            </Button>
          </Stack>

          <Stack spacing={1} mt={1.2}>
            <Typography fontWeight={700}>Prioridades recomendadas</Typography>
            {infeasibility.priorityActions.map((action) => (
              <Card key={`${action.priority}-${action.title}`} sx={{ p: 1.1 }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                >
                  <Box>
                    <Typography fontWeight={800}>
                      {action.priority}. {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.2}>
                      {action.reason}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.35}>
                      {formatActionRange(action)}
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
                    {action.ingredientId ? (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={applyingActionKey === `${action.priority}-${action.title}`}
                        onClick={() => {
                          void applyAction(action);
                        }}
                      >
                        {applyingActionKey === `${action.priority}-${action.title}`
                          ? 'Aplicando...'
                          : 'Aplicar ajuste'}
                      </Button>
                    ) : null}
                    {action.ingredientId ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          openManualDialog(action);
                        }}
                      >
                        Editar manual
                      </Button>
                    ) : null}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        onAskAssistant({
                          mode: 'WHY',
                          message: buildActionQuestion(infeasibility.summary, action),
                        });
                      }}
                    >
                      Analizar con Caporal IA
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>

          {infeasibility.alternatives.length > 0 ? (
            <Stack spacing={1} mt={1.3}>
              <Typography fontWeight={700}>Planes alternativos</Typography>
              {infeasibility.alternatives.map((alternative) => (
                <Card key={alternative.title} sx={{ p: 1.1 }}>
                  <Typography fontWeight={800}>{alternative.title}</Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.35}>
                    {alternative.summary}
                  </Typography>
                  {alternative.tradeoff ? (
                    <Typography variant="body2" color="text.secondary" mt={0.2}>
                      Tradeoff: {alternative.tradeoff}
                    </Typography>
                  ) : null}
                  <Button
                    size="small"
                    variant="text"
                    sx={{ mt: 0.5, px: 0.2 }}
                    onClick={() => {
                      onAskAssistant({
                        mode: 'WHY',
                        message: `Detalla como ejecutar este plan alternativo: ${alternative.title}. Contexto: ${alternative.summary}`,
                      });
                    }}
                  >
                    Pedir pasos operativos
                  </Button>
                </Card>
              ))}
            </Stack>
          ) : null}
        </Paper>
      ) : null}

      <Dialog
        open={manualDialogOpen}
        onClose={() => {
          if (!updateIngredientState.isLoading && !postPriceState.isLoading) {
            setManualDialogOpen(false);
          }
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Ajuste manual de ingrediente</DialogTitle>
        <DialogContent>
          {!manualDraft ? (
            <Typography color="text.secondary">Selecciona una prioridad con ingrediente para editar.</Typography>
          ) : (
            <Stack spacing={1.2} mt={0.6}>
              <Typography fontWeight={800}>{manualDraft.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Ajusta limites, calidad nutricional y precio. Al guardar se recalcula automaticamente.
              </Typography>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  label="Minimo en mezcla (%)"
                  type="number"
                  value={manualDraft.minInclusionPct}
                  onChange={(event) => {
                    setManualDraft((current) =>
                      current
                        ? { ...current, minInclusionPct: Number(event.target.value) }
                        : current,
                    );
                  }}
                />
                <TextField
                  fullWidth
                  label="Maximo en mezcla (%)"
                  type="number"
                  value={manualDraft.maxInclusionPct}
                  onChange={(event) => {
                    setManualDraft((current) =>
                      current
                        ? { ...current, maxInclusionPct: Number(event.target.value) }
                        : current,
                    );
                  }}
                />
                <TextField
                  fullWidth
                  label="Materia seca (%)"
                  type="number"
                  value={manualDraft.dryMatterPct}
                  onChange={(event) => {
                    setManualDraft((current) =>
                      current
                        ? { ...current, dryMatterPct: Number(event.target.value) }
                        : current,
                    );
                  }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  label="Proteina (%)"
                  type="number"
                  value={manualDraft.proteinPct}
                  onChange={(event) => {
                    setManualDraft((current) =>
                      current
                        ? { ...current, proteinPct: Number(event.target.value) }
                        : current,
                    );
                  }}
                />
                <TextField
                  fullWidth
                  label="Fibra (%)"
                  type="number"
                  value={manualDraft.fiberPct}
                  onChange={(event) => {
                    setManualDraft((current) =>
                      current
                        ? { ...current, fiberPct: Number(event.target.value) }
                        : current,
                    );
                  }}
                />
                <TextField
                  fullWidth
                  label="Energia util (Mcal/kg MS)"
                  type="number"
                  value={manualDraft.energy}
                  onChange={(event) => {
                    setManualDraft((current) =>
                      current
                        ? { ...current, energy: Number(event.target.value) }
                        : current,
                    );
                  }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  label="Precio (MXN/kg)"
                  type="number"
                  value={manualDraft.priceMxnPerKgAsFed}
                  onChange={(event) => {
                    setManualDraft((current) =>
                      current
                        ? { ...current, priceMxnPerKgAsFed: Number(event.target.value) }
                        : current,
                    );
                  }}
                />
                <TextField
                  fullWidth
                  label="Fecha precio"
                  type="date"
                  value={manualDraft.effectiveDate}
                  onChange={(event) => {
                    setManualDraft((current) =>
                      current
                        ? { ...current, effectiveDate: event.target.value }
                        : current,
                    );
                  }}
                />
              </Stack>

              {manualSaveError ? <Alert severity="error">{manualSaveError}</Alert> : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setManualDialogOpen(false);
            }}
            disabled={updateIngredientState.isLoading || postPriceState.isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void saveManualAdjustment();
            }}
            disabled={
              !manualDraft ||
              updateIngredientState.isLoading ||
              postPriceState.isLoading
            }
          >
            {updateIngredientState.isLoading || postPriceState.isLoading
              ? 'Guardando...'
              : 'Guardar y recalcular'}
          </Button>
        </DialogActions>
      </Dialog>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={800}>
          Composicion recomendada
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1.3 }}>
          Barra mas larga = mayor participacion en la mezcla final.
        </Typography>

        <Stack spacing={1.2}>
          {sortedMix.map((item) => {
            const ingredientName = ingredientNameById.get(item.ingredientId) ?? 'Ingrediente';
            return (
              <Box key={item.ingredientId}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography fontWeight={700}>{ingredientName}</Typography>
                  <Typography color="text.secondary">
                    {item.pctDm.toFixed(1)}% | {item.kgAsFedPerHeadDay.toFixed(2)} kg/dia
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, item.pctDm))}
                  sx={{
                    height: 10,
                    borderRadius: 99,
                    bgcolor: 'rgba(156,176,197,0.2)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 99,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={800}>
          Seguridad nutricional
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1.3 }}>
          Checklist de reglas que la dieta debe cumplir.
        </Typography>

        <Stack spacing={1}>
          {constraints.map((item) => (
            <Card key={item.code} sx={{ p: 1.2 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
              >
                <Box>
                  <Typography fontWeight={700}>
                    {constraintLabels[item.code] ?? 'Regla nutricional'}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 0.2 }}>
                    Valor actual: {formatConstraintActual(item.code, item.actual)}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Objetivo: {formatConstraintTarget(item.code, item.target)}
                  </Typography>
                </Box>
                <Chip
                  color={item.met ? 'success' : 'error'}
                  label={item.met ? 'En rango' : 'Fuera de rango'}
                />
              </Stack>
            </Card>
          ))}
        </Stack>
      </Paper>
    </Stack>
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

function formatActionRange(action: {
  currentMinPct?: number;
  currentMaxPct?: number;
  suggestedMinPct?: number;
  suggestedMaxPct?: number;
  deltaPct?: number;
}): string {
  const parts: string[] = [];
  if (action.currentMinPct !== undefined) {
    parts.push(`Min actual: ${action.currentMinPct.toFixed(2)}%`);
  }
  if (action.currentMaxPct !== undefined) {
    parts.push(`Max actual: ${action.currentMaxPct.toFixed(2)}%`);
  }
  if (action.suggestedMinPct !== undefined) {
    parts.push(`Min sugerido: ${action.suggestedMinPct.toFixed(2)}%`);
  }
  if (action.suggestedMaxPct !== undefined) {
    parts.push(`Max sugerido: ${action.suggestedMaxPct.toFixed(2)}%`);
  }
  if (action.deltaPct !== undefined) {
    parts.push(`Ajuste: ${action.deltaPct >= 0 ? '+' : ''}${action.deltaPct.toFixed(2)}%`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Sin rango numerico sugerido.';
}

function buildActionQuestion(
  summary: string,
  action: {
    title: string;
    reason: string;
    ingredientName?: string;
    constraintCode?: string;
    suggestedMinPct?: number;
    suggestedMaxPct?: number;
  },
): string {
  const target =
    action.ingredientName ??
    action.constraintCode ??
    action.title;
  const suggestedMin =
    action.suggestedMinPct !== undefined ? ` min sugerido ${action.suggestedMinPct.toFixed(2)}%` : '';
  const suggestedMax =
    action.suggestedMaxPct !== undefined ? ` max sugerido ${action.suggestedMaxPct.toFixed(2)}%` : '';
  return (
    `Tenemos una corrida no factible. Resumen: ${summary}. ` +
    `Explica por que la prioridad "${action.title}" es la mas importante para ${target} ` +
    `y como implementarla en orden operativo.${suggestedMin}${suggestedMax} ` +
    `Incluye riesgos y como validar que la siguiente corrida ya sea factible.`
  );
}

function buildTopCauseQuestion(
  dietRun: DietRun,
  analysis: ReturnType<typeof getInfeasibilityAnalysis>,
): string {
  if (!analysis || analysis.priorityActions.length === 0) {
    return 'Explica por que no fue factible la corrida y que ajuste debo aplicar primero para recuperar factibilidad.';
  }
  const top = analysis.priorityActions[0];
  const ingredientOrConstraint = top.ingredientName ?? top.constraintCode ?? top.title;
  return (
    `La corrida ${dietRun.id.slice(0, 8)} fue no factible. ` +
    `Causa resumida: ${analysis.summary}. ` +
    `Prioridad 1 detectada: ${top.title} (${ingredientOrConstraint}). ` +
    `Explica paso a paso como ejecutar este ajuste y como validar que la siguiente corrida quede factible.`
  );
}

function clampRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function clampPct(value: number): number {
  return clampRange(value, 0, 100);
}

function safePositive(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
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

  const opMatch = trimmed.match(/^(>=|<=|>|<)\s*([0-9.+-]+)\s*([a-z_]+)?$/i);
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
