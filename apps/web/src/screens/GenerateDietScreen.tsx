import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import {
  useGenerateDietMutation,
  useGetDietRunsQuery,
  useGetIngredientsQuery,
  useGetProfilesQuery,
} from '../api/caporalApi';
import type { DietRun } from '../types';
import { constraintLabels, statusLabels } from '../ui/labels';

interface GenerateDietScreenProps {
  selectedDietRunId: string | null;
  onDietRunSelected: (dietRunId: string) => void;
}

export function GenerateDietScreen({
  selectedDietRunId,
  onDietRunSelected,
}: GenerateDietScreenProps): JSX.Element {
  const { data: profiles, isLoading: loadingProfiles } = useGetProfilesQuery();
  const { data: dietRuns } = useGetDietRunsQuery();
  const { data: ingredients } = useGetIngredientsQuery();
  const [generateDiet, generateState] = useGenerateDietMutation();

  const [profileId, setProfileId] = useState<string>('');
  const [maxSolveMs, setMaxSolveMs] = useState<number>(4000);

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

          <TextField
            type="number"
            label="Tiempo maximo de calculo (ms)"
            value={maxSolveMs}
            onChange={(event) => {
              setMaxSolveMs(Number(event.target.value));
            }}
            sx={{ minWidth: { xs: '100%', md: 260 } }}
          />

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
      </Paper>

      {selectedDietRun ? (
        <DietRunOverview dietRun={selectedDietRun} ingredientNameById={ingredientNameById} />
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
  ingredientNameById,
}: {
  dietRun: DietRun;
  ingredientNameById: Map<string, string>;
}): JSX.Element {
  const solution = dietRun.solutionSnapshotJson;

  const sortedMix = [...(solution.mix ?? [])].sort((a, b) => b.pctDm - a.pctDm);
  const constraints = solution.constraintsReport ?? [];

  const statusColor =
    dietRun.status === 'SUCCESS' ? 'success' : dietRun.status === 'INFEASIBLE' ? 'warning' : 'error';

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

        {solution.warnings?.length ? (
          <Alert severity="warning" sx={{ mt: 1.4 }}>
            {solution.warnings.join(' | ')}
          </Alert>
        ) : null}
      </Paper>

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
                  <Typography color="text.secondary" variant="body2">
                    Valor calculado: {item.actual.toFixed(4)} | Meta tecnica: {item.target}
                  </Typography>
                </Box>
                <Chip
                  color={item.met ? 'success' : 'error'}
                  label={item.met ? 'Cumple' : 'No cumple'}
                />
              </Stack>
            </Card>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
