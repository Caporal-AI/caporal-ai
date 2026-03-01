import { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  useAddBatchWeighInMutation,
  useCreateBatchMutation,
  useGenerateBatchWeeklyDietMutation,
  useGetBatchProjectionQuery,
  useGetBatchSellSignalQuery,
  useGetBatchWeighInsQuery,
  useGetBatchesQuery,
  useGetDietRunsQuery,
  useGetProfilesQuery,
} from '../../../store/services/caporalApi';
import type { Batch } from '../../../types';
import { useAppDispatch } from '../../../store/hooks';
import { setSelectedDietRunId } from '../../../store/slices/uiSlice';
import { BatchWorkflowView } from '../components/BatchWorkflowView';

const today = new Date().toISOString().slice(0, 10);
const initialBatchDraft = {
  name: '',
  breed: 'Cruzado',
  headCount: 100,
  initialWeightKg: 320,
  targetSaleWeightKg: 520,
  startDate: today,
};

export function BatchWorkflowContainer(): JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { data: batches, isLoading: loadingBatches } = useGetBatchesQuery();
  const { data: profiles } = useGetProfilesQuery();
  const { data: dietRuns } = useGetDietRunsQuery();

  const [createBatch, createBatchState] = useCreateBatchMutation();
  const [addWeighIn, addWeighInState] = useAddBatchWeighInMutation();
  const [generateWeeklyDiet, generateWeeklyState] = useGenerateBatchWeeklyDietMutation();

  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [horizonDays, setHorizonDays] = useState<number>(90);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  const [batchDraft, setBatchDraft] = useState(initialBatchDraft);
  const [weighInDraft, setWeighInDraft] = useState({
    measuredAt: today,
    averageWeightKg: 340,
  });

  useEffect(() => {
    if (!selectedBatchId && (batches?.length ?? 0) > 0) {
      setSelectedBatchId(batches?.[0]?.id ?? '');
    }
  }, [batches, selectedBatchId]);

  useEffect(() => {
    if (!selectedProfileId && (profiles?.length ?? 0) > 0) {
      setSelectedProfileId(profiles?.[0]?.id ?? '');
    }
  }, [profiles, selectedProfileId]);

  const selectedBatch = useMemo(
    () => (batches ?? []).find((item) => item.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  useGetBatchWeighInsQuery(selectedBatchId, { skip: !selectedBatchId });

  const { data: projectionData, refetch: refetchProjection } = useGetBatchProjectionQuery(
    { batchId: selectedBatchId, horizonDays },
    { skip: !selectedBatchId },
  );
  const { data: sellSignalData } = useGetBatchSellSignalQuery(
    { batchId: selectedBatchId, horizonDays },
    { skip: !selectedBatchId },
  );

  const latestBatchRun = useMemo(() => {
    const source = (dietRuns ?? []).filter((run) => run.batchId === selectedBatchId);
    if (source.length === 0) {
      return null;
    }
    return [...source].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
  }, [dietRuns, selectedBatchId]);

  const handleCreateBatch = async (): Promise<void> => {
    if (!batchDraft.name.trim()) {
      return;
    }
    const created = await createBatch({
      name: batchDraft.name,
      breed: batchDraft.breed,
      headCount: batchDraft.headCount,
      initialWeightKg: batchDraft.initialWeightKg,
      targetSaleWeightKg: batchDraft.targetSaleWeightKg,
      startDate: batchDraft.startDate,
    }).unwrap();
    setSelectedBatchId(created.id);
    setBatchDraft(initialBatchDraft);
    setBatchDialogOpen(false);
  };

  const handleGenerateWeekly = async (): Promise<void> => {
    if (!selectedBatchId || !selectedProfileId) {
      return;
    }

    await addWeighIn({
      batchId: selectedBatchId,
      body: {
        measuredAt: weighInDraft.measuredAt,
        averageWeightKg: weighInDraft.averageWeightKg,
      },
    }).unwrap();

    const run = await generateWeeklyDiet({
      batchId: selectedBatchId,
      body: {
        animalProfileId: selectedProfileId,
        horizonDays,
      },
    }).unwrap();
    dispatch(setSelectedDietRunId(run.id));
    await refetchProjection();
  };

  const errors = [
    createBatchState.isError ? 'No se pudo crear el lote.' : null,
    addWeighInState.isError ? 'No se pudo guardar el pesaje.' : null,
    generateWeeklyState.isError ? 'No se pudo generar plan semanal.' : null,
  ].filter(Boolean) as string[];

  if (loadingBatches) {
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
    <BatchWorkflowView
      title={t('batches.title')}
      subtitle={t('batches.subtitle')}
      errors={errors}
      selectedBatch={selectedBatch}
      latestBatchRun={latestBatchRun}
      batchOptions={(batches ?? []).map((batch: Batch) => ({
        id: batch.id,
        label: `${batch.name} (${batch.headCount} cabezas)`,
      }))}
      profileOptions={(profiles ?? []).map((profile) => ({
        id: profile.id,
        label: profile.name,
      }))}
      selectedBatchId={selectedBatchId}
      selectedProfileId={selectedProfileId}
      horizonDays={horizonDays}
      weighInDraft={weighInDraft}
      batchDialogOpen={batchDialogOpen}
      batchDraft={batchDraft}
      projectionLabel={
        projectionData
          ? `${projectionData.projectionJson.projectedDailyGainKg.toFixed(3)} kg/dia`
          : 'Sin datos'
      }
      marginLabel={
        projectionData
          ? `${projectionData.projectionJson.economicProjection.estimatedMarginMxnPerHead.toFixed(2)} MXN`
          : 'Sin datos'
      }
      sellSignalLabel={
        sellSignalData?.reason ?? projectionData?.projectionJson.sellSignal.reason ?? 'Sin señal disponible'
      }
      weeklyCostLabel={t('batches.cards.weeklyCost')}
      isCreatingBatch={createBatchState.isLoading}
      onSelectBatch={setSelectedBatchId}
      onSelectProfile={setSelectedProfileId}
      onHorizonChange={setHorizonDays}
      onWeighInChange={(field, value) => {
        setWeighInDraft((current) => ({
          ...current,
          [field]: field === 'averageWeightKg' ? Number(value) : value,
        }));
      }}
      onOpenBatchDialog={() => {
        setBatchDialogOpen(true);
      }}
      onCloseBatchDialog={() => {
        setBatchDialogOpen(false);
      }}
      onBatchDraftChange={(field, value) => {
        setBatchDraft((current) => ({
          ...current,
          [field]:
            field === 'headCount' || field === 'initialWeightKg' || field === 'targetSaleWeightKg'
              ? Number(value)
              : value,
        }));
      }}
      onGenerateWeekly={() => {
        void handleGenerateWeekly();
      }}
      onCreateBatch={() => {
        void handleCreateBatch();
      }}
    />
  );
}
