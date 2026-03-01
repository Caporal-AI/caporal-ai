import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import {
  useGetIngredientPricesQuery,
  useGetIngredientsQuery,
  usePostPriceMutation,
  useUpdateIngredientMutation,
} from '../api/caporalApi';
import type { Ingredient } from '../types';

interface IngredientDraft {
  dryMatterPct: number;
  minInclusionPct: number;
  maxInclusionPct: number;
  proteinPct: number;
  fiberPct: number;
  energy: number;
}

interface PriceDraft {
  price: number;
  effectiveDate: string;
}

const todayDate = new Date().toISOString().slice(0, 10);

const toDraft = (ingredient: Ingredient): IngredientDraft => ({
  dryMatterPct: ingredient.dryMatterPct,
  minInclusionPct: ingredient.minInclusionPct,
  maxInclusionPct: ingredient.maxInclusionPct,
  proteinPct: (ingredient.nutrientsJson.CP ?? 0) * 100,
  fiberPct: (ingredient.nutrientsJson.NDF ?? 0) * 100,
  energy: ingredient.nutrientsJson.ME_MCAL_KGDM ?? 0,
});

export function IngredientsScreen(): JSX.Element {
  const { data, isLoading, error } = useGetIngredientsQuery();
  const [updateIngredient, updateState] = useUpdateIngredientMutation();
  const [postPrice, postPriceState] = usePostPriceMutation();

  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, IngredientDraft>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});

  const ingredients = data ?? [];

  useEffect(() => {
    if (ingredients.length === 0) {
      return;
    }

    setSelectedIngredientId((current) => current ?? ingredients[0]?.id ?? null);

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

  const selectedIngredient = useMemo(
    () => ingredients.find((item) => item.id === selectedIngredientId) ?? null,
    [ingredients, selectedIngredientId],
  );

  const { data: selectedIngredientPrices } = useGetIngredientPricesQuery(selectedIngredientId ?? '', {
    skip: !selectedIngredientId,
  });

  const latestSelectedPrice = selectedIngredientPrices?.[0];

  const selectedDraft = selectedIngredient ? drafts[selectedIngredient.id] : undefined;
  const selectedPriceDraft = selectedIngredient ? priceDrafts[selectedIngredient.id] : undefined;

  useEffect(() => {
    if (!selectedIngredientId || !latestSelectedPrice) {
      return;
    }

    setPriceDrafts((current) => ({
      ...current,
      [selectedIngredientId]: {
        price: latestSelectedPrice.priceMxnPerKgAsFed,
        effectiveDate: latestSelectedPrice.effectiveDate,
      },
    }));
  }, [
    latestSelectedPrice?.effectiveDate,
    latestSelectedPrice?.priceMxnPerKgAsFed,
    selectedIngredientId,
  ]);

  const handleDraftChange = (
    ingredientId: string,
    key: keyof IngredientDraft,
    value: number,
  ): void => {
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

  const saveIngredient = async (): Promise<void> => {
    if (!selectedIngredient || !selectedDraft) {
      return;
    }

    await updateIngredient({
      id: selectedIngredient.id,
      body: {
        dryMatterPct: selectedDraft.dryMatterPct,
        minInclusionPct: selectedDraft.minInclusionPct,
        maxInclusionPct: selectedDraft.maxInclusionPct,
        nutrientsJson: {
          ...selectedIngredient.nutrientsJson,
          CP: selectedDraft.proteinPct / 100,
          NDF: selectedDraft.fiberPct / 100,
          ME_MCAL_KGDM: selectedDraft.energy,
        },
      },
    }).unwrap();
  };

  const savePrice = async (): Promise<void> => {
    if (!selectedIngredient || !selectedPriceDraft || selectedPriceDraft.price <= 0) {
      return;
    }

    await postPrice({
      ingredientId: selectedIngredient.id,
      body: {
        priceMxnPerKgAsFed: selectedPriceDraft.price,
        effectiveDate: selectedPriceDraft.effectiveDate,
        locationCode: 'MX-NL',
      },
    }).unwrap();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2.2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          Editor de ingredientes
        </Typography>
        <Typography sx={{ mt: 0.8, color: 'text.secondary' }}>
          Selecciona un ingrediente y ajusta solo lo necesario. Los nombres de campos estan en
          lenguaje simple para facilitar el uso diario.
        </Typography>
      </Paper>

      {error && <Alert severity="error">No se pudieron cargar ingredientes.</Alert>}
      {updateState.isError && <Alert severity="error">No se pudieron guardar los cambios del ingrediente.</Alert>}
      {postPriceState.isError && <Alert severity="error">No se pudo registrar el precio.</Alert>}
      {(updateState.isSuccess || postPriceState.isSuccess) && (
        <Alert severity="success">Cambios guardados correctamente.</Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Paper
          sx={{
            width: { xs: '100%', md: 340 },
            p: 1.5,
            maxHeight: { md: 620 },
            overflow: 'auto',
            flexShrink: 0,
          }}
        >
          <TextField
            fullWidth
            size="small"
            label="Buscar ingrediente"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />

          <Stack spacing={1} mt={1.4}>
            {filteredIngredients.map((ingredient) => {
              const active = ingredient.id === selectedIngredientId;
              return (
                <Box
                  key={ingredient.id}
                  onClick={() => {
                    setSelectedIngredientId(ingredient.id);
                  }}
                  sx={{
                    border: active
                      ? '1px solid rgba(76,224,179,0.8)'
                      : '1px solid rgba(156,176,197,0.22)',
                    bgcolor: active ? 'rgba(76,224,179,0.09)' : 'transparent',
                    borderRadius: 2,
                    p: 1.2,
                    cursor: 'pointer',
                    transition: 'all .18s ease',
                    '&:hover': {
                      borderColor: 'rgba(76,224,179,0.55)',
                      bgcolor: 'rgba(76,224,179,0.06)',
                    },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography fontWeight={700}>{ingredient.name}</Typography>
                    <Chip
                      size="small"
                      color={ingredient.isActive ? 'success' : 'warning'}
                      variant="outlined"
                      label={ingredient.isActive ? 'Activo' : 'Inactivo'}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Materia seca: {ingredient.dryMatterPct}%
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Paper>

        <Paper sx={{ flex: 1, p: { xs: 1.6, md: 2.2 } }}>
          {!selectedIngredient || !selectedDraft || !selectedPriceDraft ? (
            <Typography color="text.secondary">Selecciona un ingrediente para editar.</Typography>
          ) : (
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="h5" fontWeight={800}>
                  {selectedIngredient.name}
                </Typography>
                <Typography color="text.secondary">
                  Ajusta rangos, calidad nutricional y precio de compra.
                </Typography>
                {latestSelectedPrice ? (
                  <Typography variant="body2" color="text.secondary">
                    Precio vigente: {latestSelectedPrice.priceMxnPerKgAsFed.toFixed(4)} MXN/kg
                    (fecha {latestSelectedPrice.effectiveDate})
                  </Typography>
                ) : (
                  <Typography variant="body2" color="warning.main">
                    Este ingrediente aun no tiene precio registrado.
                  </Typography>
                )}
              </Stack>

              <Divider />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
                <TextField
                  label="Materia seca (%)"
                  type="number"
                  value={selectedDraft.dryMatterPct}
                  onChange={(event) => {
                    handleDraftChange(
                      selectedIngredient.id,
                      'dryMatterPct',
                      Number(event.target.value),
                    );
                  }}
                  helperText="Porcentaje de alimento seco"
                  fullWidth
                />
                <TextField
                  label="Minimo en mezcla (%)"
                  type="number"
                  value={selectedDraft.minInclusionPct}
                  onChange={(event) => {
                    handleDraftChange(
                      selectedIngredient.id,
                      'minInclusionPct',
                      Number(event.target.value),
                    );
                  }}
                  helperText="Minimo permitido"
                  fullWidth
                />
                <TextField
                  label="Maximo en mezcla (%)"
                  type="number"
                  value={selectedDraft.maxInclusionPct}
                  onChange={(event) => {
                    handleDraftChange(
                      selectedIngredient.id,
                      'maxInclusionPct',
                      Number(event.target.value),
                    );
                  }}
                  helperText="Maximo permitido"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
                <TextField
                  label="Proteina (%)"
                  type="number"
                  value={selectedDraft.proteinPct}
                  onChange={(event) => {
                    handleDraftChange(
                      selectedIngredient.id,
                      'proteinPct',
                      Number(event.target.value),
                    );
                  }}
                  helperText="Aporta crecimiento"
                  fullWidth
                />
                <TextField
                  label="Fibra (%)"
                  type="number"
                  value={selectedDraft.fiberPct}
                  onChange={(event) => {
                    handleDraftChange(selectedIngredient.id, 'fiberPct', Number(event.target.value));
                  }}
                  helperText="Ayuda a digestion"
                  fullWidth
                />
                <TextField
                  label="Energia util"
                  type="number"
                  value={selectedDraft.energy}
                  onChange={(event) => {
                    handleDraftChange(selectedIngredient.id, 'energy', Number(event.target.value));
                  }}
                  helperText="Nivel energetico"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
                <TextField
                  label="Precio de compra (MXN por kg)"
                  type="number"
                  value={selectedPriceDraft.price}
                  onChange={(event) => {
                    handlePriceChange(selectedIngredient.id, 'price', event.target.value);
                  }}
                  fullWidth
                />
                <TextField
                  label="Fecha"
                  type="date"
                  value={selectedPriceDraft.effectiveDate}
                  onChange={(event) => {
                    handlePriceChange(selectedIngredient.id, 'effectiveDate', event.target.value);
                  }}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                <Button
                  variant="contained"
                  disabled={updateState.isLoading}
                  onClick={() => {
                    void saveIngredient();
                  }}
                >
                  Guardar configuracion
                </Button>
                <Button
                  variant="outlined"
                  disabled={postPriceState.isLoading}
                  onClick={() => {
                    void savePrice();
                  }}
                >
                  Guardar precio
                </Button>
              </Stack>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Stack>
  );
}
