import { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  useGenerateDietMutation,
  useGetDietRunsQuery,
  useGetIngredientsQuery,
  useGetProfilesQuery,
  usePostPriceMutation,
  useUpdateIngredientMutation,
} from '../../../store/services/caporalApi';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import type { AgentMode, DietRun, InfeasibilityPriorityAction, Ingredient, MixItem } from '../../../types';
import { setSelectedDietRunId, queueAssistantPrompt } from '../../../store/slices/uiSlice';
import { getInfeasibilityAnalysis } from '../../../ui/infeasibilityAnalysis';
import {
  getIngredientStrategyAdjustment,
  ingredientStrategyMetas,
  type IngredientStrategyId,
} from '../../../ui/ingredientStrategyProfiles';
import { normalizeSolverWarning } from '../../../ui/solverWarnings';
import { GenerateDietView } from '../components/GenerateDietView';

const DEFAULT_MAX_SOLVE_MS = 4000;

export function GenerateDietContainer(): JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedDietRunId = useAppSelector((state) => state.ui.selectedDietRunId);

  const { data: profiles, isLoading: loadingProfiles } = useGetProfilesQuery();
  const { data: dietRuns } = useGetDietRunsQuery();
  const { data: ingredients } = useGetIngredientsQuery();

  const [generateDiet, generateState] = useGenerateDietMutation();
  const [updateIngredient] = useUpdateIngredientMutation();
  const [postPrice] = usePostPriceMutation();

  const [profileId, setProfileId] = useState<string>('');
  const [strategyId, setStrategyId] = useState<IngredientStrategyId>('BALANCED');
  const [strategyDate, setStrategyDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [applyingStrategy, setApplyingStrategy] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [applyingActionKey, setApplyingActionKey] = useState<string | null>(null);

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

  const strategyMatchCount = useMemo(() => {
    const source = ingredients ?? [];
    return source.filter((ingredient) => !!getIngredientStrategyAdjustment(strategyId, ingredient)).length;
  }, [ingredients, strategyId]);

  const ingredientById = useMemo(() => {
    const map = new Map<string, Ingredient>();
    (ingredients ?? []).forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [ingredients]);

  const handleGenerate = async (): Promise<void> => {
    if (!profileId) {
      return;
    }
    const response = await generateDiet({
      animalProfileId: profileId,
      maxSolveMs: DEFAULT_MAX_SOLVE_MS,
    }).unwrap();
    dispatch(setSelectedDietRunId(response.id));
    setSuccessMessage('Corrida generada correctamente.');
    setLocalError(null);
  };

  const applyIngredientStrategy = async (): Promise<void> => {
    const source = ingredients ?? [];
    if (source.length === 0) {
      setLocalError('No hay ingredientes cargados para aplicar perfil.');
      return;
    }

    setApplyingStrategy(true);
    setLocalError(null);
    setSuccessMessage(null);

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
          await postPrice({
            ingredientId: ingredient.id,
            body: {
              priceMxnPerKgAsFed: adjustment.priceMxnPerKgAsFed ?? 0,
              effectiveDate: strategyDate,
              locationCode: 'MX-NL',
            },
          }).unwrap();
          pricedCount += 1;
        }
      }

      const response = await generateDiet({
        animalProfileId: profileId,
        maxSolveMs: DEFAULT_MAX_SOLVE_MS,
      }).unwrap();
      dispatch(setSelectedDietRunId(response.id));
      setSuccessMessage(`Perfil aplicado en ${updatedCount} ingredientes y ${pricedCount} precios.`);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'No se pudo aplicar el perfil.');
      setSuccessMessage(null);
    } finally {
      setApplyingStrategy(false);
    }
  };

  const infeasibility = selectedDietRun ? getInfeasibilityAnalysis(selectedDietRun) : null;

  const actionableRecommendations = useMemo(
    () =>
      (infeasibility?.priorityActions ?? []).filter(
        (item) => !!item.ingredientId && (item.suggestedMinPct !== undefined || item.suggestedMaxPct !== undefined),
      ),
    [infeasibility?.priorityActions],
  );

  const applyAction = async (action: InfeasibilityPriorityAction): Promise<void> => {
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

    const actionKey = `${action.priority}-${action.title}`;
    setApplyingActionKey(actionKey);
    try {
      await updateIngredient({
        id: ingredient.id,
        body: payload,
      }).unwrap();
      await handleGenerate();
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
        await applyAction(action);
      }
    } finally {
      setApplyingBulk(false);
    }
  };

  const mixItems: MixItem[] = useMemo(() => {
    const source = selectedDietRun?.solutionSnapshotJson.mix ?? [];
    return [...source]
      .sort((a, b) => b.pctDm - a.pctDm)
      .map((item) => ({
        ...item,
        ingredientId: ingredientById.get(item.ingredientId)?.name ?? item.ingredientId,
      }));
  }, [ingredientById, selectedDietRun?.solutionSnapshotJson.mix]);

  const warnings = useMemo(
    () => (selectedDietRun?.solutionSnapshotJson.warnings ?? []).map(normalizeSolverWarning),
    [selectedDietRun?.solutionSnapshotJson.warnings],
  );

  const errors = [
    generateState.isError ? 'No se pudo generar la dieta. Revisa ingredientes y precios.' : null,
    localError,
  ].filter(Boolean) as string[];

  if (loadingProfiles) {
    return (
      <Box
        display="grid"
        justifyContent="center"
        alignItems="center"
        minHeight="18rem"
        gap={1}
      >
        <CircularProgress />
        <Typography color="text.secondary">{t('common.status.loading')}</Typography>
      </Box>
    );
  }

  return (
    <GenerateDietView
      title={t('diet.title')}
      subtitle={t('diet.subtitle')}
      errors={errors}
      successMessage={successMessage}
      profiles={(profiles ?? []).map((profile) => ({
        id: profile.id,
        label: `${profile.name} (${profile.intakeDmKgPerDay} kg/dia)`,
      }))}
      selectedProfileId={profileId}
      strategyOptions={ingredientStrategyMetas.map((meta) => ({
        id: meta.id,
        label: meta.label,
        description: meta.description,
      }))}
      selectedStrategyId={strategyId}
      strategyDate={strategyDate}
      strategyInfo={
        ingredientStrategyMetas.find((item) => item.id === strategyId)?.description ?? ''
      }
      strategyMatchCount={strategyMatchCount}
      applyingStrategy={applyingStrategy}
      generatingDiet={generateState.isLoading}
      selectedRun={selectedDietRun}
      mixItems={mixItems}
      constraints={selectedDietRun?.solutionSnapshotJson.constraintsReport ?? []}
      warnings={warnings}
      actions={infeasibility?.priorityActions ?? []}
      applyingActionKey={applyingActionKey}
      isApplyingAll={applyingBulk}
      onProfileChange={setProfileId}
      onGenerate={() => {
        void handleGenerate();
      }}
      onStrategyChange={(id) => {
        setStrategyId(id as IngredientStrategyId);
      }}
      onStrategyDateChange={setStrategyDate}
      onApplyStrategy={() => {
        void applyIngredientStrategy();
      }}
      onApplyAction={(action) => {
        void applyAction(action);
      }}
      onApplyAllActions={() => {
        void applyAllRecommendations();
      }}
      onAskAssistant={(request) => {
        dispatch(queueAssistantPrompt(request));
      }}
    />
  );
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}
