import styled from '@emotion/styled';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { SectionHeader } from '../../../components/atoms/SectionHeader';
import { SectionCard } from '../../../components/atoms/SectionCard';
import { MetricCard } from '../../../components/molecules/MetricCard';
import { InputCluster } from '../../../components/molecules/InputCluster';

export interface IngredientDraft {
  dryMatterPct: number;
  minInclusionPct: number;
  maxInclusionPct: number;
  proteinPct: number;
  fiberPct: number;
  energy: number;
}

export interface PriceDraft {
  price: number;
  effectiveDate: string;
}

export interface IngredientItemViewModel {
  id: string;
  name: string;
  isActive: boolean;
  dryMatterPct: number;
  minInclusionPct: number;
  maxInclusionPct: number;
  expanded: boolean;
  latestPriceLabel: string | null;
  draft: IngredientDraft;
  priceDraft: PriceDraft;
}

interface IngredientsViewProps {
  title: string;
  subtitle: string;
  searchLabel: string;
  search: string;
  errors: string[];
  successMessage: string | null;
  isSaving: boolean;
  isRecalculating: boolean;
  impactTitle: string;
  recipeValue: string;
  recipeHint: string;
  weeklyValue: string;
  weeklyHint: string;
  items: IngredientItemViewModel[];
  fields: {
    dryMatter: string;
    minInclusion: string;
    maxInclusion: string;
    protein: string;
    fiber: string;
    energy: string;
    price: string;
    effectiveDate: string;
  };
  onSearchChange: (value: string) => void;
  onToggleExpanded: (id: string, expanded: boolean) => void;
  onDraftChange: (id: string, key: keyof IngredientDraft, value: number) => void;
  onPriceChange: (id: string, key: keyof PriceDraft, value: string) => void;
  onSave: (id: string) => void;
  onNavigateToRecipe: () => void;
  onNavigateToWeekly: () => void;
}

const Root = styled(Box)`
  display: grid;
  gap: 0.9rem;
`;

const Alerts = styled(Box)`
  display: grid;
  gap: 0.65rem;
`;

const ImpactRow = styled(Box)`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.8rem;

  @media (min-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const MetricButton = styled(Button)`
  text-align: left;
  padding: 0;
  justify-content: stretch;
  min-width: 0;
`;

const IngredientSummary = styled(Box)`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const FormSection = styled(Box)`
  display: grid;
  gap: 0.75rem;
`;

const ActionRow = styled(Box)`
  display: flex;
  width: 100%;
  justify-content: flex-end;
  gap: 0.7rem;
`;

const PrimarySaveButton = styled(Button)`
  min-height: 2.45rem;
  padding-inline: 1.15rem;
  border-radius: 999px;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(111, 64, 24, 0.24);
`;

export function IngredientsView({
  title,
  subtitle,
  searchLabel,
  search,
  errors,
  successMessage,
  isSaving,
  isRecalculating,
  impactTitle,
  recipeValue,
  recipeHint,
  weeklyValue,
  weeklyHint,
  items,
  fields,
  onSearchChange,
  onToggleExpanded,
  onDraftChange,
  onPriceChange,
  onSave,
  onNavigateToRecipe,
  onNavigateToWeekly,
}: IngredientsViewProps): JSX.Element {
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
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={800}>
            {impactTitle}
          </Typography>
          {isRecalculating ? <Chip size="small" color="info" label="Recalculando..." /> : null}
        </Stack>
        <ImpactRow>
          <MetricButton
            variant="text"
            onClick={onNavigateToRecipe}
            aria-label="Ir a receta diaria"
          >
            <MetricCard title="Receta diaria" value={recipeValue} hint={recipeHint} />
          </MetricButton>
          <MetricButton
            variant="text"
            onClick={onNavigateToWeekly}
            aria-label="Ir a plan semanal"
          >
            <MetricCard title="Plan semanal" value={weeklyValue} hint={weeklyHint} />
          </MetricButton>
        </ImpactRow>
      </SectionCard>

      <SectionCard>
        <TextField
          fullWidth
          label={searchLabel}
          value={search}
          onChange={(event) => {
            onSearchChange(event.target.value);
          }}
        />

        <Stack spacing={1} marginTop={1.2}>
          {items.map((item) => (
            <Accordion
              key={item.id}
              expanded={item.expanded}
              onChange={(_, expanded) => {
                onToggleExpanded(item.id, expanded);
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <IngredientSummary>
                  <Typography fontWeight={800}>{item.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Materia seca {item.dryMatterPct}% | Min {item.minInclusionPct}% | Max {item.maxInclusionPct}%
                  </Typography>
                  {item.latestPriceLabel ? (
                    <Typography variant="caption" color="text.secondary">
                      Precio vigente: {item.latestPriceLabel}
                    </Typography>
                  ) : null}
                </IngredientSummary>
                <Chip
                  size="small"
                  variant="outlined"
                  color={item.isActive ? 'success' : 'warning'}
                  label={item.isActive ? 'Activo' : 'Inactivo'}
                />
              </AccordionSummary>
              <AccordionDetails>
                <FormSection>
                  <InputCluster>
                    <TextField
                      label={fields.dryMatter}
                      type="number"
                      value={item.draft.dryMatterPct}
                      onChange={(event) => {
                        onDraftChange(item.id, 'dryMatterPct', Number(event.target.value));
                      }}
                    />
                    <TextField
                      label={fields.minInclusion}
                      type="number"
                      value={item.draft.minInclusionPct}
                      onChange={(event) => {
                        onDraftChange(item.id, 'minInclusionPct', Number(event.target.value));
                      }}
                    />
                    <TextField
                      label={fields.maxInclusion}
                      type="number"
                      value={item.draft.maxInclusionPct}
                      onChange={(event) => {
                        onDraftChange(item.id, 'maxInclusionPct', Number(event.target.value));
                      }}
                    />
                  </InputCluster>

                  <InputCluster>
                    <TextField
                      label={fields.protein}
                      type="number"
                      value={item.draft.proteinPct}
                      onChange={(event) => {
                        onDraftChange(item.id, 'proteinPct', Number(event.target.value));
                      }}
                    />
                    <TextField
                      label={fields.fiber}
                      type="number"
                      value={item.draft.fiberPct}
                      onChange={(event) => {
                        onDraftChange(item.id, 'fiberPct', Number(event.target.value));
                      }}
                    />
                    <TextField
                      label={fields.energy}
                      type="number"
                      value={item.draft.energy}
                      onChange={(event) => {
                        onDraftChange(item.id, 'energy', Number(event.target.value));
                      }}
                    />
                  </InputCluster>

                  <InputCluster>
                    <TextField
                      label={fields.price}
                      type="number"
                      value={item.priceDraft.price}
                      onChange={(event) => {
                        onPriceChange(item.id, 'price', event.target.value);
                      }}
                    />
                    <TextField
                      label={fields.effectiveDate}
                      type="date"
                      value={item.priceDraft.effectiveDate}
                      InputLabelProps={{ shrink: true }}
                      onChange={(event) => {
                        onPriceChange(item.id, 'effectiveDate', event.target.value);
                      }}
                    />
                  </InputCluster>

                  <ActionRow>
                    <PrimarySaveButton
                      variant="contained"
                      color="primary"
                      disabled={isSaving || isRecalculating}
                      onClick={() => {
                        onSave(item.id);
                      }}
                    >
                      Guardar y recalcular
                    </PrimarySaveButton>
                  </ActionRow>
                </FormSection>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </SectionCard>
    </Root>
  );
}
