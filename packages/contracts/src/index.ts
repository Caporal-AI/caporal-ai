export type Objective = 'MIN_COST';

export type ConstraintUnit = 'fraction_dm' | 'pct_dm' | 'kg_per_day' | 'per_kg_dm';

export interface Constraint {
  code: string;
  min?: number;
  max?: number;
  unit: ConstraintUnit;
  label?: string;
}

export interface AnimalProfileInput {
  intakeDmKgPerDay: number;
  constraints: Constraint[];
}

export interface IngredientInput {
  id: string;
  name: string;
  priceMxnPerKgAsFed: number;
  dryMatterPct: number;
  nutrients: Record<string, number>;
  boundsPct: {
    min: number;
    max: number;
  };
}

export interface BatchContext {
  batchId: string;
  breed: string;
  headCount: number;
  currentAverageWeightKg: number;
  targetSaleWeightKg: number;
  daysOnFeed: number;
  climate?: {
    avgTemperatureC: number;
    humidityPct: number;
  };
}

export interface OptimizeRequest {
  animalProfile: AnimalProfileInput;
  ingredients: IngredientInput[];
  options: {
    maxSolveMs: number;
    objective: Objective;
  };
  batchContext?: BatchContext;
}

export interface MixItem {
  ingredientId: string;
  kgAsFedPerHeadDay: number;
  kgDmPerHeadDay: number;
  pctDm: number;
}

export interface ConstraintReportItem {
  code: string;
  target: string;
  actual: number;
  met: boolean;
  slack: number;
}

export interface WeeklyDietDay {
  dayNumber: number;
  mix: MixItem[];
  costMxnPerHeadDay: number;
  cumulativeCostMxnPerHead: number;
}

export interface WeeklyDietPlan {
  days: WeeklyDietDay[];
  totalCostMxnPerHeadWeek: number;
  totalCostMxnPerBatchWeek: number;
}

export interface SellSignal {
  shouldSell: boolean;
  recommendedDay: number;
  expectedMarginTrend: 'UP' | 'STABLE' | 'DOWN';
  reason: string;
}

export interface EconomicProjection {
  estimatedRevenueMxnPerHead: number;
  estimatedCostMxnPerHead: number;
  estimatedMarginMxnPerHead: number;
  costPerKgGainMxn: number;
}

export interface ProjectionResponse {
  modelType: 'xgboost' | 'linear_fallback';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  horizonDays: number;
  projectedDailyGainKg: number;
  projectedWeightSeries: Array<{
    day: number;
    averageWeightKg: number;
  }>;
  economicProjection: EconomicProjection;
  sellSignal: SellSignal;
  warnings: string[];
}

export interface OptimizeResponse {
  feasible: boolean;
  mix: MixItem[];
  totalCostMxnPerHeadDay: number;
  constraintsReport: ConstraintReportItem[];
  solverMeta: {
    method: 'highs';
    runtimeMs: number;
  };
  warnings: string[];
  weeklyPlan?: WeeklyDietPlan;
}

export interface AskDietContext {
  animalProfile: AnimalProfileInput;
  dietMix: MixItem[];
  constraintsReport: ConstraintReportItem[];
}

export interface AskRequest {
  question: string;
  dietContext: AskDietContext;
  retrievalOptions: {
    topK: number;
  };
}

export interface Citation {
  docId: string;
  title: string;
  snippet: string;
  score: number;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  safetyFlags: string[];
}

export interface ProjectionRequest {
  batchContext: BatchContext;
  horizonDays: number;
  dietCostMxnPerHeadDay: number;
  salePriceMxnPerKg: number;
  purchasePriceMxnPerKg: number;
  otherCostMxnPerHead?: number;
  historicalWeighIns: Array<{
    measuredAt: string;
    averageWeightKg: number;
  }>;
  dietMix: MixItem[];
}

export type DietRunStatus = 'SUCCESS' | 'INFEASIBLE' | 'ERROR';

export interface DietRunSolutionSnapshot {
  feasible: boolean;
  mix: MixItem[];
  totalCostMxnPerHeadDay: number;
  constraintsReport: ConstraintReportItem[];
  solverMeta: {
    method: 'highs';
    runtimeMs: number;
  };
  warnings: string[];
  weeklyPlan?: WeeklyDietPlan;
  projection?: ProjectionResponse;
  sellSignal?: SellSignal;
}

export interface DietRunInputSnapshot {
  animalProfile: AnimalProfileInput;
  ingredients: IngredientInput[];
  options: {
    maxSolveMs: number;
    objective: Objective;
  };
  batchContext?: BatchContext;
}
