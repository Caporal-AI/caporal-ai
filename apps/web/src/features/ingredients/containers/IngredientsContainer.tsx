import { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  useGenerateBatchWeeklyDietMutation,
  useGenerateDietMutation,
  useGetBatchesQuery,
  useGetDietRunsQuery,
  useGetIngredientPricesQuery,
  useGetIngredientsQuery,
  useGetProfilesQuery,
  usePostPriceMutation,
  useUpdateIngredientMutation,
} from '../../../store/services/caporalApi';
import type { DietRun, Ingredient } from '../../../types';
import { useAppDispatch } from '../../../store/hooks';
import { setSelectedDietRunId } from '../../../store/slices/uiSlice';
import {
  IngredientsView,
  type IngredientDraft,
  type PriceDraft,
} from '../components/IngredientsView';

interface IngredientsContainerProps {
  onNavigateToSection: (path: string) => void;
}

const todayDate = new Date().toISOString().slice(0, 10);
const AUTO_RECALC_HORIZON_DAYS = 90;
const AUTO_RECALC_MAX_SOLVE_MS = 4000;

const toDraft = (ingredient: Ingredient): IngredientDraft => ({
  dryMatterPct: ingredient.dryMatterPct,
  minInclusionPct: ingredient.minInclusionPct,
  maxInclusionPct: ingredient.maxInclusionPct,
  proteinPct: (ingredient.nutrientsJson.CP ?? 0) * 100,
  fiberPct: (ingredient.nutrientsJson.NDF ?? 0) * 100,
  energy: ingredient.nutrientsJson.ME_MCAL_KGDM ?? 0,
});

export function IngredientsContainer({
  onNavigateToSection,
}: IngredientsContainerProps): JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { data, isLoading, error } = useGetIngredientsQuery();
  const { data: profiles } = useGetProfilesQuery();
  const { data: batches } = useGetBatchesQuery();
  const { data: dietRuns } = useGetDietRunsQuery();

  const [updateIngredient, updateState] = useUpdateIngredientMutation();
  const [postPrice, postPriceState] = usePostPriceMutation();
  const [generateDiet] = useGenerateDietMutation();
  const [generateBatchWeeklyDiet] = useGenerateBatchWeeklyDietMutation();

  const [expandedIngredientId, setExpandedIngredientId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, IngredientDraft>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});
  const [recalculatingPlans, setRecalculatingPlans] = useState(false);
  const [recalculationError, setRecalculationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const ingredients = data ?? [];

  useEffect(() => {
    if (ingredients.length === 0) {
      return;
    }

    setExpandedIngredientId((current) => current ?? ingredients[0]?.id ?? null);

    setDrafts((current) => {
      const next = { ...current };
      for (const ingredient of ingredients) {
        if (!next[ingredient.id]) {
          next[ingredient.id] = toDraft(ingredient);
        }
      }
      return next;
    });

    setPriceDrafts((current) => {
      const next = { ...current };
      for (const ingredient of ingredients) {
        if (!next[ingredient.id]) {
          next[ingredient.id] = { price: 0, effectiveDate: todayDate };
        }
      }
      return next;
    });
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return ingredients;
    }
    return ingredients.filter((item) => item.name.toLowerCase().includes(query));
  }, [ingredients, search]);

  const expandedIngredient = useMemo(
    () => ingredients.find((item) => item.id === expandedIngredientId) ?? null,
    [ingredients, expandedIngredientId],
  );

  const { data: expandedIngredientPrices } = useGetIngredientPricesQuery(expandedIngredientId ?? '', {
    skip: !expandedIngredientId,
  });

  const latestExpandedPrice = expandedIngredientPrices?.[0];

  const defaultProfileId = useMemo(() => profiles?.[0]?.id ?? '', [profiles]);
  const defaultBatchId = useMemo(
    () => (batches ?? []).find((item) => item.status === 'ACTIVE')?.id ?? batches?.[0]?.id ?? '',
    [batches],
  );

  const latestSimpleRun = useMemo(
    () => findLatestRun((dietRuns ?? []).filter((item) => !item.batchId)),
    [dietRuns],
  );
  const latestWeeklyRun = useMemo(
    () => findLatestRun((dietRuns ?? []).filter((item) => !!item.batchId)),
    [dietRuns],
  );

  useEffect(() => {
    if (!expandedIngredientId || !latestExpandedPrice) {
      return;
    }
    setPriceDrafts((current) => ({
      ...current,
      [expandedIngredientId]: {
        price: latestExpandedPrice.priceMxnPerKgAsFed,
        effectiveDate: latestExpandedPrice.effectiveDate,
      },
    }));
  }, [
    expandedIngredientId,
    latestExpandedPrice?.effectiveDate,
    latestExpandedPrice?.priceMxnPerKgAsFed,
  ]);

  const recalculateConnectedPlans = async (): Promise<void> => {
    if (!defaultProfileId) {
      setRecalculationError(t('ingredients.recalcError'));
      return;
    }

    setRecalculationError(null);
    setRecalculatingPlans(true);
    try {
      const simpleRun = await generateDiet({
        animalProfileId: defaultProfileId,
        maxSolveMs: AUTO_RECALC_MAX_SOLVE_MS,
      }).unwrap();
      let lastGeneratedRunId = simpleRun.id;

      if (defaultBatchId) {
        const weeklyRun = await generateBatchWeeklyDiet({
          batchId: defaultBatchId,
          body: {
            animalProfileId: defaultProfileId,
            horizonDays: AUTO_RECALC_HORIZON_DAYS,
            maxSolveMs: AUTO_RECALC_MAX_SOLVE_MS,
          },
        }).unwrap();
        lastGeneratedRunId = weeklyRun.id;
      }

      dispatch(setSelectedDietRunId(lastGeneratedRunId));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('ingredients.recalcError');
      setRecalculationError(message);
    } finally {
      setRecalculatingPlans(false);
    }
  };

  const handleDraftChange = (ingredientId: string, key: keyof IngredientDraft, value: number): void => {
    setDrafts((current) => ({
      ...current,
      [ingredientId]: {
        ...(current[ingredientId] ?? {
          dryMatterPct: 0,
          minInclusionPct: 0,
          maxInclusionPct: 100,
          proteinPct: 0,
          fiberPct: 0,
          energy: 0,
        }),
        [key]: Number.isFinite(value) ? value : 0,
      },
    }));
  };

  const handlePriceChange = (ingredientId: string, key: keyof PriceDraft, value: string): void => {
    setPriceDrafts((current) => ({
      ...current,
      [ingredientId]: {
        ...(current[ingredientId] ?? { price: 0, effectiveDate: todayDate }),
        [key]: key === 'price' ? Number(value) : value,
      },
    }));
  };

  const saveIngredientBundle = async (ingredientId: string): Promise<void> => {
    const ingredient = ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) {
      return;
    }
    const draft = drafts[ingredient.id] ?? toDraft(ingredient);

    await updateIngredient({
      id: ingredient.id,
      body: {
        dryMatterPct: draft.dryMatterPct,
        minInclusionPct: draft.minInclusionPct,
        maxInclusionPct: draft.maxInclusionPct,
        nutrientsJson: {
          ...ingredient.nutrientsJson,
          CP: draft.proteinPct / 100,
          NDF: draft.fiberPct / 100,
          ME_MCAL_KGDM: draft.energy,
        },
      },
    }).unwrap();

    const priceDraft = priceDrafts[ingredient.id] ?? { price: 0, effectiveDate: todayDate };
    if (priceDraft.price > 0) {
      await postPrice({
        ingredientId: ingredient.id,
        body: {
          priceMxnPerKgAsFed: priceDraft.price,
          effectiveDate: priceDraft.effectiveDate,
          locationCode: 'MX-NL',
        },
      }).unwrap();
    }

    await recalculateConnectedPlans();
    setSuccessMessage(t('ingredients.saveAll'));
  };

  const errors = [
    error ? 'No se pudieron cargar ingredientes.' : null,
    updateState.isError ? 'No se pudieron guardar los cambios del ingrediente.' : null,
    postPriceState.isError ? 'No se pudo registrar el precio.' : null,
    recalculationError,
  ].filter(Boolean) as string[];

  if (isLoading) {
    return <TypographyLoader label={t('common.status.loading')} />;
  }

  return (
    <IngredientsView
      title={t('ingredients.title')}
      subtitle={t('ingredients.subtitle')}
      searchLabel={t('ingredients.search')}
      search={search}
      errors={errors}
      successMessage={successMessage}
      isSaving={updateState.isLoading || postPriceState.isLoading}
      isRecalculating={recalculatingPlans}
      impactTitle={t('ingredients.impactTitle')}
      recipeValue={
        latestSimpleRun
          ? `${latestSimpleRun.solutionSnapshotJson.totalCostMxnPerHeadDay.toFixed(2)} MXN/cab/dia`
          : t('common.status.noData')
      }
      recipeHint={latestSimpleRun ? runStatusLabel(latestSimpleRun.status) : t('common.status.noRun')}
      weeklyValue={
        latestWeeklyRun?.solutionSnapshotJson.weeklyPlan
          ? `${latestWeeklyRun.solutionSnapshotJson.weeklyPlan.totalCostMxnPerBatchWeek.toFixed(2)} MXN/lote/sem`
          : t('common.status.noData')
      }
      weeklyHint={latestWeeklyRun ? runStatusLabel(latestWeeklyRun.status) : t('common.status.noRun')}
      items={filteredIngredients.map((ingredient) => {
        const expanded = expandedIngredientId === ingredient.id;
        const draft = drafts[ingredient.id] ?? toDraft(ingredient);
        const priceDraft = priceDrafts[ingredient.id] ?? { price: 0, effectiveDate: todayDate };
        const latestPriceLabel =
          expanded && latestExpandedPrice && expandedIngredient?.id === ingredient.id
            ? `${latestExpandedPrice.priceMxnPerKgAsFed.toFixed(4)} MXN/kg`
            : null;

        return {
          id: ingredient.id,
          name: ingredient.name,
          isActive: ingredient.isActive,
          dryMatterPct: ingredient.dryMatterPct,
          minInclusionPct: ingredient.minInclusionPct,
          maxInclusionPct: ingredient.maxInclusionPct,
          expanded,
          latestPriceLabel,
          draft,
          priceDraft,
        };
      })}
      fields={{
        dryMatter: t('ingredients.fields.dryMatter'),
        minInclusion: t('ingredients.fields.minInclusion'),
        maxInclusion: t('ingredients.fields.maxInclusion'),
        protein: t('ingredients.fields.protein'),
        fiber: t('ingredients.fields.fiber'),
        energy: t('ingredients.fields.energy'),
        price: t('ingredients.fields.price'),
        effectiveDate: t('ingredients.fields.effectiveDate'),
      }}
      onSearchChange={setSearch}
      onToggleExpanded={(id, expanded) => {
        setExpandedIngredientId(expanded ? id : null);
      }}
      onDraftChange={handleDraftChange}
      onPriceChange={handlePriceChange}
      onSave={(id) => {
        void saveIngredientBundle(id);
      }}
      onNavigateToRecipe={() => {
        onNavigateToSection('/dieta-simple');
      }}
      onNavigateToWeekly={() => {
        onNavigateToSection('/lotes-plan');
      }}
    />
  );
}

function findLatestRun(runs: DietRun[]): DietRun | null {
  if (runs.length === 0) {
    return null;
  }
  return [...runs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
}

function runStatusLabel(status: DietRun['status']): string {
  if (status === 'SUCCESS') {
    return 'Factible';
  }
  if (status === 'INFEASIBLE') {
    return 'No factible';
  }
  return 'Error';
}

function TypographyLoader({ label }: { label: string }): JSX.Element {
  return (
    <Box
      display="grid"
      justifyContent="center"
      alignItems="center"
      minHeight="18rem"
      gap={1}
    >
      <CircularProgress />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}
