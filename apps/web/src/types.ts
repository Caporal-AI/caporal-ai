export type ConstraintUnit = 'fraction_dm' | 'pct_dm' | 'kg_per_day' | 'per_kg_dm';

export interface Constraint {
  code: string;
  min?: number;
  max?: number;
  unit: ConstraintUnit;
  label?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  dryMatterPct: number;
  nutrientsJson: Record<string, number>;
  minInclusionPct: number;
  maxInclusionPct: number;
  isActive: boolean;
}

export interface IngredientPrice {
  id: string;
  ingredientId: string;
  priceMxnPerKgAsFed: number;
  effectiveDate: string;
  locationCode?: string | null;
}

export interface AnimalProfile {
  id: string;
  name: string;
  intakeDmKgPerDay: number;
  constraintsJson: Constraint[];
}

export interface Batch {
  id: string;
  name: string;
  breed?: string | null;
  headCount: number;
  initialWeightKg: number;
  targetSaleWeightKg?: number | null;
  startDate?: string | null;
  status: 'ACTIVE' | 'CLOSED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BatchWeighIn {
  id: string;
  batchId: string;
  measuredAt: string;
  averageWeightKg: number;
  notes?: string | null;
  createdAt: string;
}

export interface BatchHealthEvent {
  id: string;
  batchId: string;
  eventDate: string;
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string | null;
  createdAt: string;
}

export type DietRunStatus = 'SUCCESS' | 'INFEASIBLE' | 'ERROR';

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

export interface EconomicProjection {
  estimatedRevenueMxnPerHead: number;
  estimatedCostMxnPerHead: number;
  estimatedMarginMxnPerHead: number;
  costPerKgGainMxn: number;
}

export interface SellSignal {
  shouldSell: boolean;
  recommendedDay: number;
  expectedMarginTrend: 'UP' | 'STABLE' | 'DOWN';
  reason: string;
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

export interface BatchProjection {
  id: string;
  batchId: string;
  dietRunId?: string | null;
  horizonDays: number;
  projectionJson: ProjectionResponse;
  generatedAt: string;
}

export interface DietRunSolution {
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

export interface DietRun {
  id: string;
  animalProfileId: string;
  batchId?: string | null;
  status: DietRunStatus;
  inputsSnapshotJson: {
    animalProfile: {
      intakeDmKgPerDay: number;
      constraints: Constraint[];
    };
  };
  solutionSnapshotJson: DietRunSolution;
  createdAt: string;
}

export interface RagInteraction {
  id: string;
  dietRunId: string;
  question: string;
  answer: string;
  citationsJson: Array<{
    docId: string;
    title: string;
    snippet: string;
    score: number;
  }>;
  safetyFlagsJson: string[];
  createdAt: string;
}
