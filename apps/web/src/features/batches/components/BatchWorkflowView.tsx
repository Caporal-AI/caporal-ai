import styled from '@emotion/styled';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Batch, DietRun } from '../../../types';
import { SectionHeader } from '../../../components/atoms/SectionHeader';
import { SectionCard } from '../../../components/atoms/SectionCard';
import { InputCluster } from '../../../components/molecules/InputCluster';

interface SelectOption {
  id: string;
  label: string;
}

interface BatchDraft {
  name: string;
  breed: string;
  headCount: number;
  initialWeightKg: number;
  targetSaleWeightKg: number;
  startDate: string;
}

interface WeighInDraft {
  measuredAt: string;
  averageWeightKg: number;
}

interface BatchWorkflowViewProps {
  title: string;
  subtitle: string;
  errors: string[];
  selectedBatch: Batch | null;
  latestBatchRun: DietRun | null;
  batchOptions: SelectOption[];
  profileOptions: SelectOption[];
  selectedBatchId: string;
  selectedProfileId: string;
  horizonDays: number;
  weighInDraft: WeighInDraft;
  batchDialogOpen: boolean;
  batchDraft: BatchDraft;
  projectionLabel: string;
  marginLabel: string;
  sellSignalLabel: string;
  weeklyCostLabel: string;
  isCreatingBatch: boolean;
  onSelectBatch: (id: string) => void;
  onSelectProfile: (id: string) => void;
  onHorizonChange: (value: number) => void;
  onWeighInChange: (field: keyof WeighInDraft, value: string) => void;
  onOpenBatchDialog: () => void;
  onCloseBatchDialog: () => void;
  onBatchDraftChange: (field: keyof BatchDraft, value: string) => void;
  onGenerateWeekly: () => void;
  onCreateBatch: () => void;
}

const Root = styled(Box)`
  display: grid;
  gap: 0.9rem;
`;

const Alerts = styled(Box)`
  display: grid;
  gap: 0.6rem;
`;

const Grid = styled(Box)`
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(1, minmax(0, 1fr));

  @media (min-width: 1200px) {
    grid-template-columns: 1.2fr 1fr;
  }
`;

const Row = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 0.8rem;
`;

const WeeklyList = styled(Stack)`
  margin-top: 0.85rem;
`;

const InputGroups = styled(Box)`
  display: grid;
  row-gap: 1rem;
  margin-top: 0.9rem;
`;

const FormActions = styled(Row)`
  margin-top: 0.15rem;
  width: 100%;
  justify-content: flex-end;
  align-items: center;
`;

const GenerateWeeklyButton = styled(Button)`
  min-height: 2.5rem;
  padding-inline: 1.25rem;
  border-radius: 999px;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(111, 64, 24, 0.28);
`;

export function BatchWorkflowView({
  title,
  subtitle,
  errors,
  selectedBatch,
  latestBatchRun,
  batchOptions,
  profileOptions,
  selectedBatchId,
  selectedProfileId,
  horizonDays,
  weighInDraft,
  batchDialogOpen,
  batchDraft,
  projectionLabel,
  marginLabel,
  sellSignalLabel,
  weeklyCostLabel,
  isCreatingBatch,
  onSelectBatch,
  onSelectProfile,
  onHorizonChange,
  onWeighInChange,
  onOpenBatchDialog,
  onCloseBatchDialog,
  onBatchDraftChange,
  onGenerateWeekly,
  onCreateBatch,
}: BatchWorkflowViewProps): JSX.Element {
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
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={800}>
            Seleccion de lote y control
          </Typography>
          <Button variant="outlined" onClick={onOpenBatchDialog}>
            Nuevo lote
          </Button>
        </Stack>

        <InputGroups>
          <InputCluster>
            <FormControl fullWidth>
              <InputLabel id="batch-label">Lote</InputLabel>
              <Select
                labelId="batch-label"
                value={selectedBatchId}
                label="Lote"
                onChange={(event) => {
                  onSelectBatch(event.target.value);
                }}
              >
                {batchOptions.map((batch) => (
                  <MenuItem key={batch.id} value={batch.id}>
                    {batch.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="profile-batch-label">Perfil</InputLabel>
              <Select
                labelId="profile-batch-label"
                value={selectedProfileId}
                label="Perfil"
                onChange={(event) => {
                  onSelectProfile(event.target.value);
                }}
              >
                {profileOptions.map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="Horizonte (dias)"
              value={horizonDays}
              onChange={(event) => {
                onHorizonChange(Number(event.target.value));
              }}
            />
          </InputCluster>

          <InputCluster>
            <TextField
              fullWidth
              type="date"
              label="Fecha pesaje"
              InputLabelProps={{ shrink: true }}
              value={weighInDraft.measuredAt}
              onChange={(event) => {
                onWeighInChange('measuredAt', event.target.value);
              }}
            />
            <TextField
              fullWidth
              type="number"
              label="Peso promedio (kg)"
              value={weighInDraft.averageWeightKg}
              onChange={(event) => {
                onWeighInChange('averageWeightKg', event.target.value);
              }}
            />
          </InputCluster>

          <FormActions>
            <GenerateWeeklyButton variant="contained" color="primary" onClick={onGenerateWeekly}>
              Generar plan semanal
            </GenerateWeeklyButton>
          </FormActions>
        </InputGroups>

        {selectedBatch ? (
          <Row>
            <Chip label={`Estado: ${selectedBatch.status}`} variant="outlined" />
            <Chip label={`Raza: ${selectedBatch.breed ?? 'No definida'}`} variant="outlined" />
            <Chip label={`${selectedBatch.headCount} cabezas`} variant="outlined" />
          </Row>
        ) : null}
      </SectionCard>

      <Grid>
        <SectionCard>
          <Typography variant="h6" fontWeight={800}>
            Plan semanal y costo
          </Typography>
          {latestBatchRun?.solutionSnapshotJson.weeklyPlan ? (
            <WeeklyList spacing={1}>
              <Card variant="outlined">
                <Stack padding={1.2}>
                  <Typography color="text.secondary">{weeklyCostLabel}</Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {latestBatchRun.solutionSnapshotJson.weeklyPlan.totalCostMxnPerBatchWeek.toFixed(2)} MXN
                  </Typography>
                </Stack>
              </Card>

              {latestBatchRun.solutionSnapshotJson.weeklyPlan.days.map((day) => (
                <Card key={day.dayNumber} variant="outlined">
                  <Stack direction="row" justifyContent="space-between" padding={1}>
                    <Typography fontWeight={700}>Dia {day.dayNumber}</Typography>
                    <Typography color="text.secondary">
                      {day.costMxnPerHeadDay.toFixed(2)} MXN/cab
                    </Typography>
                  </Stack>
                </Card>
              ))}
            </WeeklyList>
          ) : (
            <Typography color="text.secondary" marginTop={1}>
              Sin plan semanal para este lote.
            </Typography>
          )}
        </SectionCard>

        <SectionCard>
          <Typography variant="h6" fontWeight={800}>
            Proyeccion y venta
          </Typography>
          <WeeklyList spacing={1}>
            <Card variant="outlined">
              <Stack padding={1.1}>
                <Typography color="text.secondary">Ganancia diaria proyectada</Typography>
                <Typography variant="h5" fontWeight={800}>
                  {projectionLabel}
                </Typography>
              </Stack>
            </Card>
            <Card variant="outlined">
              <Stack padding={1.1}>
                <Typography color="text.secondary">Margen proyectado</Typography>
                <Typography variant="h5" fontWeight={800}>
                  {marginLabel}
                </Typography>
              </Stack>
            </Card>
            <Card variant="outlined">
              <Stack padding={1.1} spacing={0.6}>
                <Typography fontWeight={700}>Señal de venta</Typography>
                <Typography color="text.secondary">{sellSignalLabel}</Typography>
              </Stack>
            </Card>
          </WeeklyList>
        </SectionCard>
      </Grid>

      <Dialog open={batchDialogOpen} onClose={onCloseBatchDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography variant="h6" fontWeight={800}>
            Crear lote
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.1} marginTop={0.6}>
            <Divider />
            <TextField
              label="Nombre"
              value={batchDraft.name}
              onChange={(event) => {
                onBatchDraftChange('name', event.target.value);
              }}
            />
            <TextField
              label="Raza o cruza"
              value={batchDraft.breed}
              onChange={(event) => {
                onBatchDraftChange('breed', event.target.value);
              }}
            />
            <TextField
              type="number"
              label="Numero de cabezas"
              value={batchDraft.headCount}
              onChange={(event) => {
                onBatchDraftChange('headCount', event.target.value);
              }}
            />
            <TextField
              type="number"
              label="Peso inicial (kg)"
              value={batchDraft.initialWeightKg}
              onChange={(event) => {
                onBatchDraftChange('initialWeightKg', event.target.value);
              }}
            />
            <TextField
              type="number"
              label="Peso objetivo (kg)"
              value={batchDraft.targetSaleWeightKg}
              onChange={(event) => {
                onBatchDraftChange('targetSaleWeightKg', event.target.value);
              }}
            />
            <TextField
              type="date"
              label="Inicio"
              InputLabelProps={{ shrink: true }}
              value={batchDraft.startDate}
              onChange={(event) => {
                onBatchDraftChange('startDate', event.target.value);
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseBatchDialog} disabled={isCreatingBatch}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={onCreateBatch}
            disabled={isCreatingBatch || batchDraft.name.trim().length === 0}
          >
            {isCreatingBatch ? 'Creando...' : 'Crear lote'}
          </Button>
        </DialogActions>
      </Dialog>
    </Root>
  );
}
