import {
  Alert,
  Box,
  Button,
  Card,
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
  useAddBatchWeighInMutation,
  useCreateBatchMutation,
  useGenerateBatchWeeklyDietMutation,
  useGetBatchProjectionQuery,
  useGetBatchSellSignalQuery,
  useGetBatchWeighInsQuery,
  useGetBatchesQuery,
  useGetDietRunsQuery,
  useGetProfilesQuery,
} from '../api/caporalApi';
import type { Batch, DietRun } from '../types';

interface BatchWorkflowScreenProps {
  selectedDietRunId: string | null;
  onDietRunSelected: (dietRunId: string) => void;
}

const today = new Date().toISOString().slice(0, 10);

export function BatchWorkflowScreen({
  selectedDietRunId: _selectedDietRunId,
  onDietRunSelected,
}: BatchWorkflowScreenProps): JSX.Element {
  const { data: batches, isLoading: loadingBatches } = useGetBatchesQuery();
  const { data: profiles } = useGetProfilesQuery();
  const { data: dietRuns } = useGetDietRunsQuery();

  const [createBatch, createBatchState] = useCreateBatchMutation();
  const [addWeighIn, addWeighInState] = useAddBatchWeighInMutation();
  const [generateWeeklyDiet, generateWeeklyState] = useGenerateBatchWeeklyDietMutation();

  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [horizonDays, setHorizonDays] = useState<number>(56);

  const [batchDraft, setBatchDraft] = useState({
    name: '',
    breed: 'Cruzado',
    headCount: 100,
    initialWeightKg: 320,
    targetSaleWeightKg: 520,
    startDate: today,
  });

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

  const { data: weighIns } = useGetBatchWeighInsQuery(selectedBatchId, { skip: !selectedBatchId });

  const { data: projectionData, refetch: refetchProjection } = useGetBatchProjectionQuery(
    { batchId: selectedBatchId, horizonDays },
    { skip: !selectedBatchId },
  );

  const { data: sellSignalData } = useGetBatchSellSignalQuery(
    { batchId: selectedBatchId, horizonDays },
    { skip: !selectedBatchId },
  );

  const latestBatchRun = useMemo(() => {
    const source = dietRuns ?? [];
    return source.find((run) => run.batchId === selectedBatchId) ?? null;
  }, [dietRuns, selectedBatchId]);

  const suggestedDayLabel = useMemo(() => {
    const day = sellSignalData?.recommendedDay ?? projectionData?.projectionJson.sellSignal.recommendedDay;
    if (day === undefined || day === null) {
      return '-';
    }
    return day <= 0 ? 'Hoy' : `Dia ${day}`;
  }, [projectionData?.projectionJson.sellSignal.recommendedDay, sellSignalData?.recommendedDay]);

  const sellReason = useMemo(() => {
    const rawReason = sellSignalData?.reason ?? projectionData?.projectionJson.sellSignal.reason ?? '';
    return normalizeSellSignalReason(rawReason);
  }, [projectionData?.projectionJson.sellSignal.reason, sellSignalData?.reason]);

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
    setBatchDraft((current) => ({
      ...current,
      name: '',
    }));
  };

  const handleAddWeighIn = async (): Promise<void> => {
    if (!selectedBatchId) {
      return;
    }

    await addWeighIn({
      batchId: selectedBatchId,
      body: {
        measuredAt: weighInDraft.measuredAt,
        averageWeightKg: weighInDraft.averageWeightKg,
      },
    }).unwrap();
  };

  const handleGenerateWeekly = async (): Promise<void> => {
    if (!selectedBatchId || !selectedProfileId) {
      return;
    }

    const run = await generateWeeklyDiet({
      batchId: selectedBatchId,
      body: {
        animalProfileId: selectedProfileId,
        horizonDays,
      },
    }).unwrap();

    onDietRunSelected(run.id);
    await refetchProjection();
  };

  if (loadingBatches) {
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
          Flujo asistido por lote
        </Typography>
        <Typography color="text.secondary" mt={0.6}>
          1) Crea o selecciona lote, 2) registra peso, 3) genera plan semanal, 4) revisa proyeccion y
          alerta de venta.
        </Typography>
      </Paper>

      {createBatchState.isError ? <Alert severity="error">No se pudo crear el lote.</Alert> : null}
      {addWeighInState.isError ? <Alert severity="error">No se pudo guardar el pesaje.</Alert> : null}
      {generateWeeklyState.isError ? (
        <Alert severity="error">No se pudo generar el plan semanal. Verifica precios y perfil.</Alert>
      ) : null}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <Paper sx={{ p: 2, width: { xs: '100%', lg: 360 }, flexShrink: 0 }}>
          <Typography fontWeight={800}>Crear lote</Typography>
          <Stack spacing={1.1} mt={1}>
            <TextField
              size="small"
              label="Nombre"
              value={batchDraft.name}
              onChange={(event) => {
                setBatchDraft((current) => ({ ...current, name: event.target.value }));
              }}
            />
            <TextField
              size="small"
              label="Raza o cruza"
              value={batchDraft.breed}
              onChange={(event) => {
                setBatchDraft((current) => ({ ...current, breed: event.target.value }));
              }}
            />
            <TextField
              size="small"
              type="number"
              label="Numero de cabezas"
              value={batchDraft.headCount}
              onChange={(event) => {
                setBatchDraft((current) => ({ ...current, headCount: Number(event.target.value) }));
              }}
            />
            <TextField
              size="small"
              type="number"
              label="Peso promedio inicial (kg)"
              value={batchDraft.initialWeightKg}
              onChange={(event) => {
                setBatchDraft((current) => ({ ...current, initialWeightKg: Number(event.target.value) }));
              }}
            />
            <TextField
              size="small"
              type="number"
              label="Peso objetivo venta (kg)"
              value={batchDraft.targetSaleWeightKg}
              onChange={(event) => {
                setBatchDraft((current) => ({ ...current, targetSaleWeightKg: Number(event.target.value) }));
              }}
            />
            <TextField
              size="small"
              type="date"
              label="Inicio"
              value={batchDraft.startDate}
              onChange={(event) => {
                setBatchDraft((current) => ({ ...current, startDate: event.target.value }));
              }}
            />
            <Button variant="contained" onClick={() => void handleCreateBatch()}>
              Crear lote
            </Button>
          </Stack>
        </Paper>

        <Stack spacing={2} sx={{ flex: 1 }}>
          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={800}>Seleccion de lote y control</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mt={1.1}>
              <Select
                size="small"
                fullWidth
                value={selectedBatchId}
                onChange={(event) => {
                  setSelectedBatchId(event.target.value);
                }}
              >
                {(batches ?? []).map((batch: Batch) => (
                  <MenuItem key={batch.id} value={batch.id}>
                    {batch.name} ({batch.headCount} cabezas)
                  </MenuItem>
                ))}
              </Select>
              <Select
                size="small"
                fullWidth
                value={selectedProfileId}
                onChange={(event) => {
                  setSelectedProfileId(event.target.value);
                }}
              >
                {(profiles ?? []).map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                size="small"
                type="number"
                label="Horizonte (dias)"
                value={horizonDays}
                onChange={(event) => {
                  setHorizonDays(Number(event.target.value));
                }}
                sx={{ width: { xs: '100%', md: 140 } }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mt={1.2}>
              <TextField
                size="small"
                type="date"
                label="Fecha pesaje"
                value={weighInDraft.measuredAt}
                onChange={(event) => {
                  setWeighInDraft((current) => ({ ...current, measuredAt: event.target.value }));
                }}
              />
              <TextField
                size="small"
                type="number"
                label="Peso promedio (kg)"
                value={weighInDraft.averageWeightKg}
                onChange={(event) => {
                  setWeighInDraft((current) => ({ ...current, averageWeightKg: Number(event.target.value) }));
                }}
              />
              <Button variant="outlined" onClick={() => void handleAddWeighIn()}>
                Guardar pesaje
              </Button>
              <Button variant="contained" onClick={() => void handleGenerateWeekly()}>
                Generar plan semanal
              </Button>
            </Stack>

            {selectedBatch ? (
              <Stack direction="row" spacing={1} mt={1.3} flexWrap="wrap">
                <Chip label={`Estado: ${selectedBatch.status}`} color="primary" variant="outlined" />
                <Chip label={`Raza: ${selectedBatch.breed ?? 'No definida'}`} variant="outlined" />
                <Chip
                  label={`Ultimo peso: ${(weighIns?.[0]?.averageWeightKg ?? selectedBatch.initialWeightKg).toFixed(1)} kg`}
                  variant="outlined"
                />
              </Stack>
            ) : null}
          </Paper>

          <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
            <Paper sx={{ p: 2, flex: 1 }}>
              <Typography variant="h6" fontWeight={800}>
                Plan semanal y costo
              </Typography>
              {!latestBatchRun?.solutionSnapshotJson.weeklyPlan ? (
                <Typography color="text.secondary" mt={1}>
                  Aun no hay plan semanal para este lote.
                </Typography>
              ) : (
                <Stack spacing={1} mt={1.1}>
                  <Card sx={{ p: 1.2 }}>
                    <Typography color="text.secondary">Costo semanal estimado por lote</Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {latestBatchRun.solutionSnapshotJson.weeklyPlan.totalCostMxnPerBatchWeek.toFixed(2)} MXN
                    </Typography>
                  </Card>

                  {latestBatchRun.solutionSnapshotJson.weeklyPlan.days.map((day) => (
                    <Card key={day.dayNumber} sx={{ p: 1 }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography fontWeight={700}>Dia {day.dayNumber}</Typography>
                        <Typography color="text.secondary">
                          {day.costMxnPerHeadDay.toFixed(2)} MXN/cabeza
                        </Typography>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              )}
            </Paper>

            <Paper sx={{ p: 2, flex: 1 }}>
              <Typography variant="h6" fontWeight={800}>
                Proyeccion y alerta de venta
              </Typography>

              {!projectionData ? (
                <Typography color="text.secondary" mt={1}>
                  No hay proyeccion disponible.
                </Typography>
              ) : (
                <Stack spacing={1.1} mt={1}>
                  <Card sx={{ p: 1.2 }}>
                    <Typography color="text.secondary">Ganancia diaria proyectada</Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {projectionData.projectionJson.projectedDailyGainKg.toFixed(3)} kg/dia
                    </Typography>
                  </Card>

                  <Card sx={{ p: 1.2 }}>
                    <Typography color="text.secondary">Margen proyectado por cabeza</Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {projectionData.projectionJson.economicProjection.estimatedMarginMxnPerHead.toFixed(2)} MXN
                    </Typography>
                  </Card>

                  <Card sx={{ p: 1.2 }}>
                    <Typography fontWeight={700}>Señal de venta</Typography>
                    <Typography color="text.secondary" mt={0.4}>
                      {sellReason}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1}>
                      <Chip
                        color={(sellSignalData?.shouldSell ?? projectionData.projectionJson.sellSignal.shouldSell) ? 'warning' : 'success'}
                        label={(sellSignalData?.shouldSell ?? projectionData.projectionJson.sellSignal.shouldSell) ? 'Vender recomendado' : 'Continuar engorda'}
                      />
                      <Chip
                        variant="outlined"
                        label={`Dia sugerido: ${suggestedDayLabel}`}
                      />
                    </Stack>
                  </Card>

                  <WeightTrendChart
                    points={projectionData.projectionJson.projectedWeightSeries.map((item) => ({
                      day: item.day,
                      weight: item.averageWeightKg,
                    }))}
                  />
                </Stack>
              )}
            </Paper>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}

function normalizeSellSignalReason(reason: string): string {
  const normalized = reason.trim();
  const map: Record<string, string> = {
    'Projected margin is still stable through the selected horizon.':
      'El margen proyectado se mantiene estable durante el horizonte seleccionado.',
    'Projected margin peaks before the horizon; consider selling near recommended day.':
      'El margen proyectado alcanza su punto maximo antes del horizonte; considera vender cerca del dia recomendado.',
    'Projected margin peaks before the selected horizon; consider selling near recommended day.':
      'El margen proyectado alcanza su punto maximo antes del horizonte; considera vender cerca del dia recomendado.',
    'Projection indicates margin starts dropping today; consider selling as soon as possible.':
      'La proyeccion indica que el margen empieza a caer desde hoy; conviene vender hoy o lo antes posible.',
    'No sufficient data to generate a reliable projection.':
      'No hay datos suficientes para generar una proyeccion confiable.',
  };

  return map[normalized] ?? normalized;
}

function WeightTrendChart({ points }: { points: Array<{ day: number; weight: number }> }): JSX.Element {
  if (points.length === 0) {
    return <Typography color="text.secondary">Sin datos para grafica.</Typography>;
  }

  const sliced = points.filter((_, index) => index % 7 === 0 || index === points.length - 1);
  const maxWeight = Math.max(...sliced.map((item) => item.weight));
  const minWeight = Math.min(...sliced.map((item) => item.weight));
  const range = Math.max(1, maxWeight - minWeight);

  return (
    <Card sx={{ p: 1.2 }}>
      <Typography fontWeight={700} sx={{ mb: 1 }}>
        Curva de crecimiento (semanal)
      </Typography>
      <Stack direction="row" spacing={0.8} alignItems="flex-end" sx={{ height: 150 }}>
        {sliced.map((item) => {
          const normalized = (item.weight - minWeight) / range;
          return (
            <Box key={`w-${item.day}`} sx={{ flex: 1, minWidth: 12 }}>
              <Box
                sx={{
                  height: `${20 + normalized * 110}px`,
                  borderRadius: 1,
                  background:
                    'linear-gradient(180deg, rgba(76,224,179,0.95) 0%, rgba(76,224,179,0.35) 100%)',
                }}
              />
              <Typography variant="caption" color="text.secondary">
                D{item.day}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Card>
  );
}
