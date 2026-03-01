from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

ConstraintUnit = Literal["fraction_dm", "pct_dm", "kg_per_day", "per_kg_dm"]


class Constraint(BaseModel):
    code: str = Field(min_length=1)
    min: float | None = None
    max: float | None = None
    unit: ConstraintUnit
    label: str | None = None

    @model_validator(mode="after")
    def validate_bounds(self) -> "Constraint":
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError(f"Constraint {self.code} has min > max")

        if self.unit == "fraction_dm":
            for value, name in ((self.min, "min"), (self.max, "max")):
                if value is not None and not 0 <= value <= 1:
                    raise ValueError(f"Constraint {self.code} {name} must be between 0 and 1")

        if self.unit == "pct_dm":
            for value, name in ((self.min, "min"), (self.max, "max")):
                if value is not None and not 0 <= value <= 100:
                    raise ValueError(f"Constraint {self.code} {name} must be between 0 and 100")

        return self


class IngredientBounds(BaseModel):
    min: float = Field(default=0, ge=0, le=100)
    max: float = Field(default=100, ge=0, le=100)

    @model_validator(mode="after")
    def validate_min_max(self) -> "IngredientBounds":
        if self.min > self.max:
            raise ValueError("Ingredient bounds min must be <= max")
        return self


class IngredientInput(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    priceMxnPerKgAsFed: float = Field(ge=0)
    dryMatterPct: float = Field(gt=0, le=100)
    nutrients: dict[str, float] = Field(default_factory=dict)
    boundsPct: IngredientBounds = Field(default_factory=IngredientBounds)


class AnimalProfileInput(BaseModel):
    intakeDmKgPerDay: float = Field(gt=0)
    constraints: list[Constraint] = Field(default_factory=list)


class ClimateInput(BaseModel):
    avgTemperatureC: float = Field(default=30)
    humidityPct: float = Field(default=50, ge=0, le=100)


class BatchContextInput(BaseModel):
    batchId: str = Field(min_length=1)
    breed: str = Field(min_length=1)
    headCount: int = Field(ge=1)
    currentAverageWeightKg: float = Field(gt=0)
    targetSaleWeightKg: float = Field(gt=0)
    daysOnFeed: int = Field(ge=0)
    climate: ClimateInput | None = None


class OptimizeOptions(BaseModel):
    maxSolveMs: int = Field(default=3000, gt=0)
    objective: Literal["MIN_COST"] = "MIN_COST"


class OptimizeRequest(BaseModel):
    animalProfile: AnimalProfileInput
    ingredients: list[IngredientInput]
    options: OptimizeOptions = Field(default_factory=OptimizeOptions)
    batchContext: BatchContextInput | None = None


class MixItem(BaseModel):
    ingredientId: str
    kgAsFedPerHeadDay: float
    kgDmPerHeadDay: float
    pctDm: float


class ConstraintReportItem(BaseModel):
    code: str
    target: str
    actual: float
    met: bool
    slack: float


class SolverMeta(BaseModel):
    method: Literal["highs"]
    runtimeMs: int


class WeeklyDietDay(BaseModel):
    dayNumber: int = Field(ge=1)
    mix: list[MixItem]
    costMxnPerHeadDay: float = Field(ge=0)
    cumulativeCostMxnPerHead: float = Field(ge=0)


class WeeklyDietPlan(BaseModel):
    days: list[WeeklyDietDay]
    totalCostMxnPerHeadWeek: float = Field(ge=0)
    totalCostMxnPerBatchWeek: float = Field(ge=0)


class SellSignal(BaseModel):
    shouldSell: bool
    recommendedDay: int = Field(ge=0)
    expectedMarginTrend: Literal["UP", "STABLE", "DOWN"]
    reason: str


class EconomicProjection(BaseModel):
    estimatedRevenueMxnPerHead: float
    estimatedCostMxnPerHead: float
    estimatedMarginMxnPerHead: float
    costPerKgGainMxn: float


class ProjectionResponse(BaseModel):
    modelType: Literal["xgboost", "linear_fallback"]
    confidence: Literal["LOW", "MEDIUM", "HIGH"]
    horizonDays: int = Field(ge=7, le=180)
    projectedDailyGainKg: float
    projectedWeightSeries: list[dict[str, float]]
    economicProjection: EconomicProjection
    sellSignal: SellSignal
    warnings: list[str] = Field(default_factory=list)


class OptimizeResponse(BaseModel):
    feasible: bool
    mix: list[MixItem]
    totalCostMxnPerHeadDay: float
    constraintsReport: list[ConstraintReportItem]
    solverMeta: SolverMeta
    warnings: list[str] = Field(default_factory=list)
    weeklyPlan: WeeklyDietPlan | None = None


class AskDietContext(BaseModel):
    animalProfile: AnimalProfileInput
    dietMix: list[MixItem]
    constraintsReport: list[ConstraintReportItem]


class AskRequest(BaseModel):
    question: str = Field(min_length=1)
    dietContext: AskDietContext
    retrievalOptions: dict = Field(default_factory=lambda: {"topK": 3})


class Citation(BaseModel):
    docId: str
    title: str
    snippet: str
    score: float


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]
    safetyFlags: list[str] = Field(default_factory=list)


AgentMode = Literal["AUTO", "WHY", "WHAT_IF", "NEXT_BEST_ACTION"]


class CitationEvidence(BaseModel):
    sourceId: str
    chunkId: str
    sourceTitle: str
    snippet: str
    offsetStart: int = Field(ge=0)
    offsetEnd: int = Field(ge=0)
    score: float
    metadata: dict[str, str | float | int | bool | None] = Field(default_factory=dict)


class ToolCallRecord(BaseModel):
    toolName: str
    status: Literal["SUCCESS", "ERROR", "SKIPPED"]
    latencyMs: int = Field(ge=0)
    input: dict[str, object] = Field(default_factory=dict)
    output: dict[str, object] = Field(default_factory=dict)


class SimulationDiff(BaseModel):
    costDeltaMxnPerHeadDay: float
    feasibleBefore: bool
    feasibleAfter: bool
    hardConstraintDelta: int
    riskFlags: list[str] = Field(default_factory=list)


class AgentContext(BaseModel):
    dietRunId: str | None = None
    batchId: str | None = None
    animalProfile: AnimalProfileInput | None = None
    currentMix: list[MixItem] = Field(default_factory=list)
    constraintsReport: list[ConstraintReportItem] = Field(default_factory=list)
    totalCostMxnPerHeadDay: float | None = None
    ingredients: list[IngredientInput] = Field(default_factory=list)
    batchContext: BatchContextInput | None = None
    projection: ProjectionResponse | None = None
    salePriceMxnPerKg: float | None = None
    purchasePriceMxnPerKg: float | None = None


class AgentRespondRequest(BaseModel):
    sessionId: str = Field(min_length=1)
    message: str = Field(min_length=1)
    mode: AgentMode = "AUTO"
    context: AgentContext
    options: dict = Field(default_factory=dict)


class AgentRespondResponse(BaseModel):
    mode: Literal["WHY", "WHAT_IF", "NEXT_BEST_ACTION"]
    answer: str
    citations: list[CitationEvidence]
    safetyFlags: list[str] = Field(default_factory=list)
    toolCalls: list[ToolCallRecord] = Field(default_factory=list)
    simulationDiff: SimulationDiff | None = None
    confidence: Literal["LOW", "MEDIUM", "HIGH"]


class RagRetrieveRequest(BaseModel):
    question: str = Field(min_length=1)
    topK: int = Field(default=5, ge=1, le=20)
    filters: dict[str, str] = Field(default_factory=dict)


class RagChunkResult(BaseModel):
    sourceId: str
    chunkId: str
    sourceTitle: str
    snippet: str
    scoreVector: float
    scoreLexical: float
    scoreHybrid: float
    metadata: dict[str, str | float | int | bool | None] = Field(default_factory=dict)


class RagRetrieveResponse(BaseModel):
    question: str
    chunks: list[RagChunkResult]


class RagEvalScenario(BaseModel):
    id: str = Field(min_length=1)
    question: str = Field(min_length=1)
    requiresCitation: bool = True
    expectedKeywords: list[str] = Field(default_factory=list)


class RagEvaluateRequest(BaseModel):
    runName: str = Field(min_length=1)
    scenarios: list[RagEvalScenario] = Field(default_factory=list)


class RagEvalRow(BaseModel):
    id: str
    retrieved: int
    hasCitation: bool
    grounded: bool
    leakedNumeric: bool
    topSourceTitle: str | None


class RagEvaluateResponse(BaseModel):
    runName: str
    summary: dict[str, float | int]
    rows: list[RagEvalRow]


class RagDocumentInput(BaseModel):
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    snippet: str | None = None


class ProjectionRequest(BaseModel):
    batchContext: BatchContextInput
    horizonDays: int = Field(default=56, ge=7, le=180)
    dietCostMxnPerHeadDay: float = Field(ge=0)
    salePriceMxnPerKg: float = Field(gt=0)
    purchasePriceMxnPerKg: float = Field(gt=0)
    otherCostMxnPerHead: float = Field(default=350, ge=0)
    historicalWeighIns: list[dict[str, float | str]] = Field(default_factory=list)
    dietMix: list[MixItem] = Field(default_factory=list)
