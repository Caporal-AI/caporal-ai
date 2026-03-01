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
  infeasibilityAnalysis?: InfeasibilityAnalysis;
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

export interface ToolCallRecord {
  toolName: string;
  status: 'SUCCESS' | 'ERROR' | 'SKIPPED';
  latencyMs: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface SimulationDiff {
  costDeltaMxnPerHeadDay: number;
  feasibleBefore: boolean;
  feasibleAfter: boolean;
  hardConstraintDelta: number;
  riskFlags: string[];
}

export interface AgentContext {
  dietRunId?: string;
  batchId?: string;
  animalProfile?: AnimalProfileInput;
  currentMix?: MixItem[];
  constraintsReport?: ConstraintReportItem[];
  totalCostMxnPerHeadDay?: number;
  ingredients?: IngredientInput[];
  solverWarnings?: string[];
  infeasibilityAnalysis?: InfeasibilityAnalysis;
  batchContext?: BatchContext;
  projection?: ProjectionResponse;
  salePriceMxnPerKg?: number;
  purchasePriceMxnPerKg?: number;
}

export interface AgentRespondRequest {
  sessionId: string;
  message: string;
  mode?: AgentMode;
  context: AgentContext;
  options?: {
    topK?: number;
    maxToolCalls?: number;
  };
}

export interface AgentRespondResponse {
  mode: Exclude<AgentMode, 'AUTO'>;
  answer: string;
  citations: CitationEvidence[];
  safetyFlags: string[];
  toolCalls: ToolCallRecord[];
  simulationDiff?: SimulationDiff;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RagChunkResult {
  sourceId: string;
  chunkId: string;
  sourceTitle: string;
  snippet: string;
  scoreVector: number;
  scoreLexical: number;
  scoreHybrid: number;
  metadata: Record<string, string | number | boolean | null>;
}

export interface RagRetrieveRequest {
  question: string;
  topK?: number;
  filters?: {
    region?: string;
    sourceType?: string;
    topic?: string;
  };
}

export interface RagRetrieveResponse {
  question: string;
  chunks: RagChunkResult[];
}

export interface RagEvalScenario {
  id: string;
  question: string;
  requiresCitation: boolean;
  expectedKeywords?: string[];
}

export interface RagEvaluateRequest {
  runName: string;
  scenarios: RagEvalScenario[];
}

export interface RagEvaluateResponse {
  runName: string;
  summary: {
    totalScenarios: number;
    citationCoverageTechnical: number;
    groundedResponseRate: number;
    unsafeNumericLeakageRate: number;
  };
  rows: Array<{
    id: string;
    retrieved: number;
    hasCitation: boolean;
    grounded: boolean;
    leakedNumeric: boolean;
    topSourceTitle: string | null;
  }>;
}

export interface RagDocumentInput {
  title: string;
  content: string;
  snippet?: string;
  sourceType?: string;
  region?: string;
  topic?: string;
  metadata?: Record<string, string | number | boolean | null>;
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
