import { SEED_INGREDIENTS } from '../seed/seed.constants';

export function sanitizeNutrientsMap(
  input: Record<string, unknown> | null | undefined,
): Record<string, number> {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const output: Record<string, number> = {};
  for (const [code, raw] of Object.entries(input)) {
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    output[code] = Number.isFinite(parsed) ? parsed : 0;
  }
  return output;
}

const nutrientFallbackByName = new Map(
  SEED_INGREDIENTS.map((item) => [normalizeName(item.name), item.nutrientsJson]),
);

const requiredKeys = ['CP', 'NDF', 'ME_MCAL_KGDM', 'Ca', 'P'] as const;

export function enrichNutrientsFromSeedFallback(
  ingredientName: string,
  nutrients: Record<string, number>,
): Record<string, number> {
  const seed = nutrientFallbackByName.get(normalizeName(ingredientName));
  if (!seed) {
    return nutrients;
  }

  const hasAnySignal = requiredKeys.some((key) => {
    const value = nutrients[key];
    return Number.isFinite(value) && Math.abs(value) > 1e-12;
  });

  if (hasAnySignal) {
    return nutrients;
  }

  const merged = { ...nutrients };
  for (const key of requiredKeys) {
    const value = nutrients[key];
    if (!Number.isFinite(value) || Math.abs(value) <= 1e-12) {
      merged[key] = seed[key] ?? 0;
    }
  }
  return merged;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}
