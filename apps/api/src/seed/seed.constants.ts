import type { AnimalConstraint } from '../animal-profiles/animal-profile.entity';

interface SeedIngredient {
  name: string;
  dryMatterPct: number;
  nutrientsJson: Record<string, number>;
  minInclusionPct: number;
  maxInclusionPct: number;
  priceMxnPerKgAsFed: number;
}

export const SEED_INGREDIENTS: SeedIngredient[] = [
  {
    name: 'Maiz molido',
    dryMatterPct: 88,
    nutrientsJson: { CP: 0.09, NDF: 0.11, ME_MCAL_KGDM: 3.05, Ca: 0.0003, P: 0.003 },
    minInclusionPct: 5,
    maxInclusionPct: 70,
    priceMxnPerKgAsFed: 6.2,
  },
  {
    name: 'Sorgo rolado',
    dryMatterPct: 89,
    nutrientsJson: { CP: 0.1, NDF: 0.13, ME_MCAL_KGDM: 2.9, Ca: 0.0004, P: 0.0032 },
    minInclusionPct: 0,
    maxInclusionPct: 55,
    priceMxnPerKgAsFed: 5.8,
  },
  {
    name: 'Pasta de soya',
    dryMatterPct: 89,
    nutrientsJson: { CP: 0.47, NDF: 0.12, ME_MCAL_KGDM: 3.0, Ca: 0.003, P: 0.0065 },
    minInclusionPct: 0,
    maxInclusionPct: 18,
    priceMxnPerKgAsFed: 10.8,
  },
  {
    name: 'Pasta de canola',
    dryMatterPct: 90,
    nutrientsJson: { CP: 0.38, NDF: 0.22, ME_MCAL_KGDM: 2.75, Ca: 0.006, P: 0.011 },
    minInclusionPct: 0,
    maxInclusionPct: 15,
    priceMxnPerKgAsFed: 9.6,
  },
  {
    name: 'Melaza de cana',
    dryMatterPct: 75,
    nutrientsJson: { CP: 0.05, NDF: 0.0, ME_MCAL_KGDM: 2.6, Ca: 0.008, P: 0.0008 },
    minInclusionPct: 0,
    maxInclusionPct: 12,
    priceMxnPerKgAsFed: 4.4,
  },
  {
    name: 'Rastrojo de maiz',
    dryMatterPct: 90,
    nutrientsJson: { CP: 0.05, NDF: 0.68, ME_MCAL_KGDM: 1.75, Ca: 0.003, P: 0.0011 },
    minInclusionPct: 5,
    maxInclusionPct: 25,
    priceMxnPerKgAsFed: 2.1,
  },
  {
    name: 'Heno de alfalfa',
    dryMatterPct: 89,
    nutrientsJson: { CP: 0.19, NDF: 0.43, ME_MCAL_KGDM: 2.25, Ca: 0.014, P: 0.0023 },
    minInclusionPct: 0,
    maxInclusionPct: 20,
    priceMxnPerKgAsFed: 5.9,
  },
  {
    name: 'Pollinaza seca',
    dryMatterPct: 86,
    nutrientsJson: { CP: 0.24, NDF: 0.34, ME_MCAL_KGDM: 2.05, Ca: 0.035, P: 0.018 },
    minInclusionPct: 0,
    maxInclusionPct: 8,
    priceMxnPerKgAsFed: 1.8,
  },
  {
    name: 'DDGS maiz',
    dryMatterPct: 90,
    nutrientsJson: { CP: 0.3, NDF: 0.32, ME_MCAL_KGDM: 3.05, Ca: 0.0012, P: 0.009 },
    minInclusionPct: 0,
    maxInclusionPct: 20,
    priceMxnPerKgAsFed: 7.1,
  },
  {
    name: 'Cascarilla de soya',
    dryMatterPct: 90,
    nutrientsJson: { CP: 0.12, NDF: 0.64, ME_MCAL_KGDM: 2.3, Ca: 0.005, P: 0.0017 },
    minInclusionPct: 0,
    maxInclusionPct: 22,
    priceMxnPerKgAsFed: 4.5,
  },
  {
    name: 'Grasa protegida',
    dryMatterPct: 99,
    nutrientsJson: { CP: 0.0, NDF: 0.0, ME_MCAL_KGDM: 5.8, Ca: 0.08, P: 0.0 },
    minInclusionPct: 0,
    maxInclusionPct: 3,
    priceMxnPerKgAsFed: 24.0,
  },
  {
    name: 'Urea pecuaria',
    dryMatterPct: 99,
    nutrientsJson: { CP: 2.81, NDF: 0.0, ME_MCAL_KGDM: 0.0, Ca: 0.0, P: 0.0 },
    minInclusionPct: 0,
    maxInclusionPct: 1,
    priceMxnPerKgAsFed: 13.5,
  },
  {
    name: 'Carbonato de calcio',
    dryMatterPct: 99,
    nutrientsJson: { CP: 0.0, NDF: 0.0, ME_MCAL_KGDM: 0.0, Ca: 0.38, P: 0.0 },
    minInclusionPct: 0,
    maxInclusionPct: 1.2,
    priceMxnPerKgAsFed: 3.7,
  },
  {
    name: 'Fosfato dicalcico',
    dryMatterPct: 98,
    nutrientsJson: { CP: 0.0, NDF: 0.0, ME_MCAL_KGDM: 0.0, Ca: 0.22, P: 0.18 },
    minInclusionPct: 0,
    maxInclusionPct: 1,
    priceMxnPerKgAsFed: 18.2,
  },
  {
    name: 'Nucleo mineral engorda',
    dryMatterPct: 97,
    nutrientsJson: { CP: 0.0, NDF: 0.0, ME_MCAL_KGDM: 0.0, Ca: 0.16, P: 0.06 },
    minInclusionPct: 0.5,
    maxInclusionPct: 2,
    priceMxnPerKgAsFed: 16.0,
  },
  {
    name: 'Sal comun',
    dryMatterPct: 99,
    nutrientsJson: { CP: 0.0, NDF: 0.0, ME_MCAL_KGDM: 0.0, Ca: 0.0, P: 0.0 },
    minInclusionPct: 0.3,
    maxInclusionPct: 1,
    priceMxnPerKgAsFed: 2.7,
  },
];

export const ENGORDA_CONSTRAINTS: AnimalConstraint[] = [
  { code: 'CP', min: 0.125, max: 0.175, unit: 'fraction_dm', label: 'Proteina cruda' },
  { code: 'NDF', min: 0.18, max: 0.34, unit: 'fraction_dm', label: 'Fibra detergente neutro' },
  { code: 'ME_MCAL_KGDM', min: 2.3, max: 3.05, unit: 'per_kg_dm', label: 'Energia metabolizable' },
  { code: 'Ca', min: 0.004, max: 0.012, unit: 'fraction_dm', label: 'Calcio' },
  { code: 'P', min: 0.0025, max: 0.007, unit: 'fraction_dm', label: 'Fosforo' },
];
