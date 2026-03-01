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

export type InfeasibilityReasonCode =
  | 'LOWER_BOUNDS_SUM'
  | 'UPPER_BOUNDS_SUM'
  | 'CONSTRAINT_CONFLICT'
  | 'SOLVER_FAILURE'
  | 'UNKNOWN';

export interface InfeasibilityPriorityAction {
  priority: number;
  title: string;
  reason: string;
  ingredientId?: string;
  ingredientName?: string;
  constraintCode?: string;
  currentMinPct?: number;
  currentMaxPct?: number;
  suggestedMinPct?: number;
  suggestedMaxPct?: number;
  deltaPct?: number;
}

export interface InfeasibilityAlternative {
  title: string;
  summary: string;
  tradeoff?: string;
}

export interface InfeasibilityAnalysis {
  reasonCode: InfeasibilityReasonCode;
  summary: string;
  priorityActions: InfeasibilityPriorityAction[];
  alternatives: InfeasibilityAlternative[];
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
  infeasibilityAnalysis?: InfeasibilityAnalysis;
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
    ingredients?: Array<{
      id: string;
      name: string;
      priceMxnPerKgAsFed: number;
      dryMatterPct: number;
      nutrients: Record<string, number>;
      boundsPct: {
        min: number;
        max: number;
      };
    }>;
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

export type AgentMode = 'AUTO' | 'WHY' | 'WHAT_IF' | 'NEXT_BEST_ACTION';

export interface CitationEvidence {
  sourceId: string;
  chunkId: string;
  sourceTitle: string;
  snippet: string;
  offsetStart: number;
  offsetEnd: number;
  score: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface SimulationDiff {
  costDeltaMxnPerHeadDay: number;
  feasibleBefore: boolean;
  feasibleAfter: boolean;
  hardConstraintDelta: number;
  riskFlags: string[];
}

export interface AgentSession {
  id: string;
  dietRunId?: string | null;
  batchId?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT';
  mode?: Exclude<AgentMode, 'AUTO'> | null;
  content: string;
  citationsJson: CitationEvidence[];
  safetyFlagsJson: string[];
  simulationDiffJson?: SimulationDiff | null;
  createdAt: string;
}

export interface AgentTraceStep {
  id: string;
  sessionId: string;
  messageId?: string | null;
  toolName: string;
  status: 'SUCCESS' | 'ERROR' | 'SKIPPED';
  latencyMs: number;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  createdAt: string;
}

export interface AgentTraceResponse {
  session: AgentSession;
  messages: AgentMessage[];
  toolCalls: AgentTraceStep[];
}
