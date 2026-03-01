import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { getInfeasibilityAnalysis } from '../ui/infeasibilityAnalysis';
import { normalizeSolverWarning } from '../ui/solverWarnings';

interface BatchWorkflowScreenProps {
  selectedDietRunId: string | null;
  onDietRunSelected: (dietRunId: string) => void;
}

const today = new Date().toISOString().slice(0, 10);
const initialBatchDraft = {
  name: '',
  breed: 'Cruzado',
  headCount: 100,
  initialWeightKg: 320,
  targetSaleWeightKg: 520,
  startDate: today,
};

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
    const source = (dietRuns ?? []).filter((run) => run.batchId === selectedBatchId);
    if (source.length === 0) {
      return null;
    }
    return [...source].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
  }, [dietRuns, selectedBatchId]);

  const runStatus = latestBatchRun?.status ?? null;
  const runFeasible = latestBatchRun?.solutionSnapshotJson.feasible ?? null;
  const runIsInfeasible = runStatus === 'INFEASIBLE' || runFeasible === false;
  const runHasError = runStatus === 'ERROR';
  const projectionMargin = projectionData?.projectionJson.economicProjection.estimatedMarginMxnPerHead ?? null;
  const hasNegativeMargin = projectionMargin !== null && projectionMargin < 0;
  const shouldSell =
    sellSignalData?.shouldSell ?? projectionData?.projectionJson.sellSignal.shouldSell ?? false;
  const projectionIsStale = Boolean(
    projectionData?.dietRunId && latestBatchRun?.id && projectionData.dietRunId !== latestBatchRun.id,
  );
  const normalizedRunWarnings = useMemo(
    () =>
      Array.from(
        new Set((latestBatchRun?.solutionSnapshotJson.warnings ?? []).map((warning) => normalizeSolverWarning(warning))),
      ),
    [latestBatchRun?.solutionSnapshotJson.warnings],
  );
  const runInfeasibility = latestBatchRun ? getInfeasibilityAnalysis(latestBatchRun) : null;

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
    setBatchDraft(initialBatchDraft);
    setBatchDialogOpen(false);
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
      {runIsInfeasible ? (
        <Alert severity="error">
          El escenario actual quedo <strong>no factible</strong>. Ajusta minimos/maximos o precios para volver a generar
          un plan semanal valido.
        </Alert>
      ) : null}
      {runHasError ? (
        <Alert severity="error">
          La ultima corrida del lote termino con error de calculo. Reintenta y verifica datos del perfil e ingredientes.
        </Alert>
      ) : null}
      {hasNegativeMargin ? (
        <Alert severity="warning">
          Escenario en perdida: el margen proyectado por cabeza es <strong>{projectionMargin?.toFixed(2)} MXN</strong>.
        </Alert>
      ) : null}
      {shouldSell ? (
        <Alert severity="warning">
          Alerta activa de venta: el modelo recomienda evaluar salida en el horizonte actual.
        </Alert>
      ) : null}
      {projectionIsStale ? (
        <Alert severity="info">
          La proyeccion visible corresponde a una corrida anterior. Genera de nuevo el plan semanal para sincronizar
          calculo y proyeccion.
        </Alert>
      ) : null}

      <Stack spacing={2}>
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <Paper sx={{ p: 2 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Typography fontWeight={800}>Seleccion de lote y control</Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setBatchDialogOpen(true);
                }}
              >
                Nuevo lote
              </Button>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(220px, 1fr))',
                  xl: 'minmax(260px, 1.4fr) minmax(240px, 1.2fr) minmax(120px, 0.5fr)',
                },
                gap: 1,
                mt: 1.1,
                alignItems: 'start',
              }}
            >
              <Select
                size="small"
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
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(220px, 1fr))',
                  xl: 'minmax(170px, 0.8fr) minmax(170px, 0.8fr) minmax(170px, 0.8fr) minmax(190px, 1fr)',
                },
                gap: 1,
                mt: 1.2,
                alignItems: 'center',
              }}
            >
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
              <Button
                variant="contained"
                onClick={() => void handleGenerateWeekly()}
              >
                Generar plan semanal
              </Button>
            </Box>

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
              {latestBatchRun ? (
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Corrida ${latestBatchRun.id.slice(0, 8)}`}
                  />
                  <Chip
                    size="small"
                    color={runHasError ? 'error' : runIsInfeasible ? 'warning' : 'success'}
                    label={
                      runHasError
                        ? 'Error de calculo'
                        : runIsInfeasible
                          ? 'No factible'
                          : 'Factible'
                    }
                  />
                </Stack>
              ) : null}
              {!latestBatchRun?.solutionSnapshotJson.weeklyPlan ? (
                <Stack spacing={1} mt={1}>
                  <Typography color="text.secondary">
                    Aun no hay plan semanal para este lote.
                  </Typography>
                  {runIsInfeasible ? (
                    <Alert severity="error">
                      No se pudo construir una mezcla semanal valida con las restricciones actuales.
                    </Alert>
                  ) : null}
                  {normalizedRunWarnings.length > 0 ? (
                    <Card sx={{ p: 1.2 }}>
                      <Typography fontWeight={700}>Motivos detectados</Typography>
                      <Stack spacing={0.5} mt={0.7}>
                        {normalizedRunWarnings.map((warning) => (
                          <Typography key={warning} variant="body2" color="text.secondary">
                            • {warning}
                          </Typography>
                        ))}
                      </Stack>
                    </Card>
                  ) : null}
                  {runInfeasibility ? (
                    <Card sx={{ p: 1.2 }}>
                      <Typography fontWeight={700}>Prioridad para recuperar factibilidad</Typography>
                      <Typography variant="body2" color="text.secondary" mt={0.6}>
                        {runInfeasibility.summary}
                      </Typography>
                      {runInfeasibility.priorityActions.slice(0, 2).map((action) => (
                        <Typography key={`${action.priority}-${action.title}`} variant="body2" mt={0.45}>
                          {action.priority}. {action.title}
                        </Typography>
                      ))}
                    </Card>
                  ) : null}
                </Stack>
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
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      color={hasNegativeMargin ? 'error.main' : 'text.primary'}
                    >
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
                        color={shouldSell ? 'warning' : 'success'}
                        label={shouldSell ? 'Vender recomendado' : 'Continuar engorda'}
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

      <Dialog
        open={batchDialogOpen}
        onClose={() => {
          if (!createBatchState.isLoading) {
            setBatchDialogOpen(false);
          }
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            border: '1px solid rgba(76,224,179,0.35)',
            background:
              'linear-gradient(170deg, rgba(15,25,35,0.98) 0%, rgba(11,17,23,0.98) 50%, rgba(9,15,21,1) 100%)',
          },
        }}
      >
        <DialogTitle sx={{ pb: 0.7 }}>
          <Typography variant="h6" fontWeight={800}>
            Crear lote
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.4}>
            Registra los datos base para iniciar seguimiento y decisiones semanales.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} mt={0.6}>
            <Divider />
            <Typography variant="body2" fontWeight={700}>
              Datos del lote
            </Typography>
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
            <Alert severity="info" sx={{ mt: 0.6 }}>
              Recomendacion: usa nombre unico, peso real promedio y fecha de arranque del lote.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setBatchDialogOpen(false);
            }}
            disabled={createBatchState.isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleCreateBatch()}
            disabled={createBatchState.isLoading || batchDraft.name.trim().length === 0}
          >
            {createBatchState.isLoading ? 'Creando...' : 'Crear lote'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function normalizeSellSignalReason(reason: string): string {
  const normalized = reason.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes('projected margin is still stable')) {
    return 'El margen proyectado se mantiene estable durante el horizonte seleccionado.';
  }
  if (lower.includes('projected margin peaks before')) {
    return 'El margen proyectado alcanza su punto maximo antes del horizonte; considera vender cerca del dia recomendado.';
  }
  if (lower.includes('margin starts dropping today')) {
    return 'La proyeccion indica que el margen empieza a caer desde hoy; conviene vender hoy o lo antes posible.';
  }
  if (lower.includes('no sufficient data to generate a reliable projection')) {
    return 'No hay datos suficientes para generar una proyeccion confiable.';
  }

  return normalized;
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
