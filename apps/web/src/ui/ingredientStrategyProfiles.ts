import type { Ingredient } from '../types';

export type IngredientStrategyId = 'EDGE_MIN' | 'BALANCED' | 'PERFECT' | 'ULTRA_PREMIUM';

export interface IngredientStrategyMeta {
  id: IngredientStrategyId;
  label: string;
  description: string;
}

export interface IngredientStrategyAdjustment {
  minInclusionPct: number;
  maxInclusionPct: number;
  priceMxnPerKgAsFed: number | null;
}

const strategyCatalog: Record<IngredientStrategyId, Record<string, IngredientStrategyAdjustment>> = {
  EDGE_MIN: {
    'maiz molido': { minInclusionPct: 0, maxInclusionPct: 70, priceMxnPerKgAsFed: 6.0 },
    'sorgo rolado': { minInclusionPct: 15, maxInclusionPct: 80, priceMxnPerKgAsFed: 5.4 },
    'pasta de soya': { minInclusionPct: 0, maxInclusionPct: 10, priceMxnPerKgAsFed: 10.2 },
    'pasta de canola': { minInclusionPct: 0, maxInclusionPct: 8, priceMxnPerKgAsFed: 8.9 },
    'melaza de cana': { minInclusionPct: 0, maxInclusionPct: 8, priceMxnPerKgAsFed: 4.1 },
    'rastrojo de maiz': { minInclusionPct: 4, maxInclusionPct: 18, priceMxnPerKgAsFed: 2.0 },
    'heno de alfalfa': { minInclusionPct: 0, maxInclusionPct: 8, priceMxnPerKgAsFed: 5.7 },
    'pollinaza seca': { minInclusionPct: 0, maxInclusionPct: 8, priceMxnPerKgAsFed: 1.7 },
    'ddgs maiz': { minInclusionPct: 0, maxInclusionPct: 12, priceMxnPerKgAsFed: 6.8 },
    'cascarilla de soya': { minInclusionPct: 0, maxInclusionPct: 10, priceMxnPerKgAsFed: 4.0 },
    'grasa protegida': { minInclusionPct: 0, maxInclusionPct: 1.5, priceMxnPerKgAsFed: 23.0 },
    'urea pecuaria': { minInclusionPct: 0, maxInclusionPct: 1.0, priceMxnPerKgAsFed: 12.8 },
    'carbonato de calcio': { minInclusionPct: 0, maxInclusionPct: 1.2, priceMxnPerKgAsFed: 3.6 },
    'fosfato dicalcico': { minInclusionPct: 0, maxInclusionPct: 0.7, priceMxnPerKgAsFed: 17.0 },
    'nucleo mineral engorda': { minInclusionPct: 0.3, maxInclusionPct: 1.2, priceMxnPerKgAsFed: 15.5 },
    'sal comun': { minInclusionPct: 0.2, maxInclusionPct: 0.8, priceMxnPerKgAsFed: 2.5 },
  },
  BALANCED: {
    'maiz molido': { minInclusionPct: 5, maxInclusionPct: 55, priceMxnPerKgAsFed: 6.2 },
    'sorgo rolado': { minInclusionPct: 10, maxInclusionPct: 45, priceMxnPerKgAsFed: 5.8 },
    'pasta de soya': { minInclusionPct: 0, maxInclusionPct: 14, priceMxnPerKgAsFed: 10.8 },
    'pasta de canola': { minInclusionPct: 0, maxInclusionPct: 12, priceMxnPerKgAsFed: 9.6 },
    'melaza de cana': { minInclusionPct: 0, maxInclusionPct: 10, priceMxnPerKgAsFed: 4.4 },
    'rastrojo de maiz': { minInclusionPct: 8, maxInclusionPct: 20, priceMxnPerKgAsFed: 2.1 },
    'heno de alfalfa': { minInclusionPct: 2, maxInclusionPct: 12, priceMxnPerKgAsFed: 5.9 },
    'pollinaza seca': { minInclusionPct: 0, maxInclusionPct: 6, priceMxnPerKgAsFed: 1.8 },
    'ddgs maiz': { minInclusionPct: 0, maxInclusionPct: 15, priceMxnPerKgAsFed: 7.1 },
    'cascarilla de soya': { minInclusionPct: 0, maxInclusionPct: 14, priceMxnPerKgAsFed: 4.5 },
    'grasa protegida': { minInclusionPct: 0, maxInclusionPct: 2.0, priceMxnPerKgAsFed: 24.0 },
    'urea pecuaria': { minInclusionPct: 0, maxInclusionPct: 0.8, priceMxnPerKgAsFed: 13.5 },
    'carbonato de calcio': { minInclusionPct: 0, maxInclusionPct: 1.0, priceMxnPerKgAsFed: 3.7 },
    'fosfato dicalcico': { minInclusionPct: 0, maxInclusionPct: 0.8, priceMxnPerKgAsFed: 18.2 },
    'nucleo mineral engorda': { minInclusionPct: 0.5, maxInclusionPct: 1.8, priceMxnPerKgAsFed: 16.0 },
    'sal comun': { minInclusionPct: 0.3, maxInclusionPct: 1.0, priceMxnPerKgAsFed: 2.7 },
  },
  PERFECT: {
    'maiz molido': { minInclusionPct: 10, maxInclusionPct: 45, priceMxnPerKgAsFed: 6.6 },
    'sorgo rolado': { minInclusionPct: 8, maxInclusionPct: 35, priceMxnPerKgAsFed: 6.1 },
    'pasta de soya': { minInclusionPct: 4, maxInclusionPct: 18, priceMxnPerKgAsFed: 11.6 },
    'pasta de canola': { minInclusionPct: 2, maxInclusionPct: 14, priceMxnPerKgAsFed: 10.2 },
    'melaza de cana': { minInclusionPct: 1, maxInclusionPct: 10, priceMxnPerKgAsFed: 4.7 },
    'rastrojo de maiz': { minInclusionPct: 10, maxInclusionPct: 22, priceMxnPerKgAsFed: 2.3 },
    'heno de alfalfa': { minInclusionPct: 5, maxInclusionPct: 16, priceMxnPerKgAsFed: 6.5 },
    'pollinaza seca': { minInclusionPct: 0, maxInclusionPct: 4, priceMxnPerKgAsFed: 2.2 },
    'ddgs maiz': { minInclusionPct: 0, maxInclusionPct: 12, priceMxnPerKgAsFed: 7.6 },
    'cascarilla de soya': { minInclusionPct: 0, maxInclusionPct: 12, priceMxnPerKgAsFed: 4.9 },
    'grasa protegida': { minInclusionPct: 0, maxInclusionPct: 2.5, priceMxnPerKgAsFed: 25.0 },
    'urea pecuaria': { minInclusionPct: 0, maxInclusionPct: 0.6, priceMxnPerKgAsFed: 14.0 },
    'carbonato de calcio': { minInclusionPct: 0.2, maxInclusionPct: 1.2, priceMxnPerKgAsFed: 4.0 },
    'fosfato dicalcico': { minInclusionPct: 0.2, maxInclusionPct: 1.0, priceMxnPerKgAsFed: 19.5 },
    'nucleo mineral engorda': { minInclusionPct: 0.8, maxInclusionPct: 2.0, priceMxnPerKgAsFed: 17.5 },
    'sal comun': { minInclusionPct: 0.4, maxInclusionPct: 1.0, priceMxnPerKgAsFed: 2.9 },
  },
  ULTRA_PREMIUM: {
    'maiz molido': { minInclusionPct: 8, maxInclusionPct: 35, priceMxnPerKgAsFed: 7.1 },
    'sorgo rolado': { minInclusionPct: 5, maxInclusionPct: 28, priceMxnPerKgAsFed: 6.7 },
    'pasta de soya': { minInclusionPct: 8, maxInclusionPct: 20, priceMxnPerKgAsFed: 12.8 },
    'pasta de canola': { minInclusionPct: 4, maxInclusionPct: 16, priceMxnPerKgAsFed: 11.4 },
    'melaza de cana': { minInclusionPct: 1, maxInclusionPct: 8, priceMxnPerKgAsFed: 5.1 },
    'rastrojo de maiz': { minInclusionPct: 12, maxInclusionPct: 24, priceMxnPerKgAsFed: 2.6 },
    'heno de alfalfa': { minInclusionPct: 8, maxInclusionPct: 20, priceMxnPerKgAsFed: 7.2 },
    'pollinaza seca': { minInclusionPct: 0, maxInclusionPct: 2, priceMxnPerKgAsFed: 2.8 },
    'ddgs maiz': { minInclusionPct: 0, maxInclusionPct: 10, priceMxnPerKgAsFed: 8.2 },
    'cascarilla de soya': { minInclusionPct: 0, maxInclusionPct: 10, priceMxnPerKgAsFed: 5.5 },
    'grasa protegida': { minInclusionPct: 0, maxInclusionPct: 3.0, priceMxnPerKgAsFed: 27.0 },
    'urea pecuaria': { minInclusionPct: 0, maxInclusionPct: 0.3, priceMxnPerKgAsFed: 15.0 },
    'carbonato de calcio': { minInclusionPct: 0.3, maxInclusionPct: 1.3, priceMxnPerKgAsFed: 4.4 },
    'fosfato dicalcico': { minInclusionPct: 0.3, maxInclusionPct: 1.2, priceMxnPerKgAsFed: 21.5 },
    'nucleo mineral engorda': { minInclusionPct: 1.0, maxInclusionPct: 2.2, priceMxnPerKgAsFed: 19.2 },
    'sal comun': { minInclusionPct: 0.5, maxInclusionPct: 1.1, priceMxnPerKgAsFed: 3.3 },
  },
};

export const ingredientStrategyMetas: IngredientStrategyMeta[] = [
  {
    id: 'EDGE_MIN',
    label: 'En el borde minimo',
    description: 'Costo bajo y riesgo operativo alto; trabaja cerca de limites minimos.',
  },
  {
    id: 'BALANCED',
    label: 'Balanceado calidad-precio',
    description: 'Compromiso recomendado para operacion diaria estable.',
  },
  {
    id: 'PERFECT',
    label: 'Perfecto',
    description: 'Mayor consistencia nutricional con costo moderado-alto.',
  },
  {
    id: 'ULTRA_PREMIUM',
    label: 'Ultra premium',
    description: 'Enfoque de maxima calidad y robustez nutricional.',
  },
];

export function getIngredientStrategyAdjustment(
  strategyId: IngredientStrategyId,
  ingredient: Ingredient,
): IngredientStrategyAdjustment | null {
  const name = normalizeName(ingredient.name);
  const strategy = strategyCatalog[strategyId];
  const match = strategy[name];
  if (!match) {
    return null;
  }
  return {
    minInclusionPct: clampPct(match.minInclusionPct),
    maxInclusionPct: clampPct(Math.max(match.minInclusionPct, match.maxInclusionPct)),
    priceMxnPerKgAsFed: match.priceMxnPerKgAsFed,
  };
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

