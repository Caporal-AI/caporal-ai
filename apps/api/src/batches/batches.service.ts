import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  OptimizeRequest,
  OptimizeResponse,
  ProjectionRequest,
  ProjectionResponse,
  SellSignal,
  WeeklyDietPlan,
} from '../../../../packages/contracts/src';
import { Repository } from 'typeorm';
import { AnimalProfile } from '../animal-profiles/animal-profile.entity';
import { COMPUTE_CLIENT, ComputeClientPort } from '../compute/compute-client.port';
import { DietRun, DietRunStatus } from '../diets/diet-run.entity';
import { IngredientPrice } from '../ingredients/ingredient-price.entity';
import { Ingredient } from '../ingredients/ingredient.entity';
import { MetricsService } from '../metrics/metrics.service';
import { BatchHealthEvent, HealthSeverity } from './batch-health-event.entity';
import { BatchProjection } from './batch-projection.entity';
import { BatchWeighIn } from './batch-weigh-in.entity';
import { Batch, BatchStatus } from './batch.entity';
import { ensureInfeasibilityAnalysis } from '../common/infeasibility-analysis.util';
import { enrichNutrientsFromSeedFallback, sanitizeNutrientsMap } from '../common/nutrients.util';
import { CreateBatchHealthEventDto } from './dto/create-batch-health-event.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateBatchWeighInDto } from './dto/create-batch-weigh-in.dto';
import { GenerateWeeklyDietDto } from './dto/generate-weekly-diet.dto';
import { GetProjectionQueryDto } from './dto/get-projection-query.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

interface SolverSolutionSnapshot extends OptimizeResponse {
  weeklyPlan?: WeeklyDietPlan;
  projection?: ProjectionResponse;
  sellSignal?: SellSignal;
}

@Injectable()
export class BatchesService {
  private readonly defaultLocationCode = 'MX-NL';

  constructor(
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    @InjectRepository(BatchWeighIn)
    private readonly weighInRepository: Repository<BatchWeighIn>,
    @InjectRepository(BatchHealthEvent)
    private readonly healthEventRepository: Repository<BatchHealthEvent>,
    @InjectRepository(BatchProjection)
    private readonly projectionRepository: Repository<BatchProjection>,
    @InjectRepository(DietRun)
    private readonly dietRunRepository: Repository<DietRun>,
    @InjectRepository(AnimalProfile)
    private readonly animalProfileRepository: Repository<AnimalProfile>,
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(IngredientPrice)
    private readonly ingredientPriceRepository: Repository<IngredientPrice>,
    @Inject(COMPUTE_CLIENT)
    private readonly computeClient: ComputeClientPort,
    private readonly metricsService: MetricsService,
  ) {}

  async create(dto: CreateBatchDto): Promise<Batch> {
    const batch = this.batchRepository.create({
      ...dto,
      breed: dto.breed ?? null,
      targetSaleWeightKg: dto.targetSaleWeightKg ?? null,
      startDate: dto.startDate ?? new Date().toISOString().slice(0, 10),
      notes: dto.notes ?? null,
      status: BatchStatus.ACTIVE,
    });

    return this.batchRepository.save(batch);
  }

  list(): Promise<Batch[]> {
    return this.batchRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Batch> {
    const batch = await this.batchRepository.findOne({ where: { id } });
    if (!batch) {
      throw new NotFoundException(`Batch ${id} not found`);
    }

    return batch;
  }

  async update(id: string, dto: UpdateBatchDto): Promise<Batch> {
    const batch = await this.findOne(id);
    Object.assign(batch, dto);
    return this.batchRepository.save(batch);
  }

  async addWeighIn(batchId: string, dto: CreateBatchWeighInDto): Promise<BatchWeighIn> {
    const batch = await this.findOne(batchId);
    const weighIn = this.weighInRepository.create({
      batch,
      measuredAt: dto.measuredAt,
      averageWeightKg: dto.averageWeightKg,
      notes: dto.notes ?? null,
    });

    return this.weighInRepository.save(weighIn);
  }

  async addHealthEvent(batchId: string, dto: CreateBatchHealthEventDto): Promise<BatchHealthEvent> {
    const batch = await this.findOne(batchId);

    const event = this.healthEventRepository.create({
      batch,
      eventDate: dto.eventDate,
      eventType: dto.eventType,
      severity: dto.severity ?? HealthSeverity.MEDIUM,
      notes: dto.notes ?? null,
    });

    return this.healthEventRepository.save(event);
  }

  async generateWeeklyDiet(
    batchId: string,
    dto: GenerateWeeklyDietDto,
    correlationId: string,
  ): Promise<DietRun> {
    const startedAt = Date.now();
    const batch = await this.findOne(batchId);

    const animalProfile = await this.animalProfileRepository.findOne({ where: { id: dto.animalProfileId } });
    if (!animalProfile) {
      throw new NotFoundException(`AnimalProfile ${dto.animalProfileId} not found`);
    }

    const optimizeRequest = await this.buildOptimizeRequest(batch, animalProfile, dto.maxSolveMs ?? 4000);

    const dietRun = this.dietRunRepository.create({
      userId: null,
      batch,
      animalProfile,
      inputsSnapshotJson: optimizeRequest as unknown as Record<string, unknown>,
      solutionSnapshotJson: {},
      status: DietRunStatus.ERROR,
    });

    let optimizeResponse: OptimizeResponse;
    const computeStartedAt = Date.now();

    try {
      optimizeResponse = await this.computeClient.optimize(optimizeRequest, correlationId);
    } catch (error) {
      dietRun.solutionSnapshotJson = {
        error: error instanceof Error ? error.message : String(error),
      };
      dietRun.status = DietRunStatus.ERROR;
      await this.dietRunRepository.save(dietRun);

      throw new InternalServerErrorException({
        message: 'Failed to generate weekly diet due compute error.',
        correlationId,
      });
    }

    const normalizedOptimizeResponse = ensureInfeasibilityAnalysis(optimizeRequest, optimizeResponse);
    const weeklyPlan = this.buildWeeklyPlan(normalizedOptimizeResponse, batch.headCount);
    let projection: ProjectionResponse | null = null;

    if (normalizedOptimizeResponse.feasible) {
      try {
        const projectionRequest = await this.buildProjectionRequest(
          batch,
          normalizedOptimizeResponse,
          dto.horizonDays ?? 56,
          dto.salePriceMxnPerKg,
          dto.purchasePriceMxnPerKg,
        );
        projection = await this.computeClient.project(projectionRequest, correlationId);
        projection = this.normalizeProjectionLanguage(projection);
      } catch {
        projection = this.buildFallbackProjection(batch, optimizeResponse, dto.horizonDays ?? 56);
        projection.warnings.push(
          'Fallo el servicio de proyeccion; se uso el modelo de respaldo en la API.',
        );
      }
    }

    const solutionSnapshot: SolverSolutionSnapshot = {
      ...normalizedOptimizeResponse,
      weeklyPlan,
      projection: projection ?? undefined,
      sellSignal: projection?.sellSignal,
    };

    dietRun.solutionSnapshotJson = solutionSnapshot as unknown as Record<string, unknown>;
    dietRun.status = normalizedOptimizeResponse.feasible ? DietRunStatus.SUCCESS : DietRunStatus.INFEASIBLE;

    const savedDietRun = await this.dietRunRepository.save(dietRun);

    if (projection) {
      const projectionEntity = this.projectionRepository.create({
        batch,
        dietRun: savedDietRun,
        horizonDays: projection.horizonDays,
        projectionJson: projection as unknown as Record<string, unknown>,
      });
      await this.projectionRepository.save(projectionEntity);
    }

    const hardViolations = normalizedOptimizeResponse.constraintsReport.filter((item) => !item.met).length;
    this.metricsService.recordDietRun(
      normalizedOptimizeResponse.feasible,
      hardViolations,
      Date.now() - startedAt,
      Date.now() - computeStartedAt,
    );

    return savedDietRun;
  }

  async getProjection(
    batchId: string,
    query: GetProjectionQueryDto,
    correlationId: string,
  ): Promise<BatchProjection> {
    const batch = await this.findOne(batchId);

    const latestDietRun = await this.dietRunRepository.findOne({
      where: {
        batch: { id: batch.id },
        status: DietRunStatus.SUCCESS,
      },
      order: { createdAt: 'DESC' },
      relations: ['animalProfile', 'batch'],
    });

    if (!latestDietRun) {
      throw new BadRequestException(
        `Batch ${batchId} has no successful diet run yet. Generate a weekly diet first.`,
      );
    }

    const solution = latestDietRun.solutionSnapshotJson as unknown as SolverSolutionSnapshot;

    const projectionRequest = await this.buildProjectionRequest(
      batch,
      {
        mix: solution.mix,
        totalCostMxnPerHeadDay: solution.totalCostMxnPerHeadDay,
      },
      query.horizonDays ?? 56,
      query.salePriceMxnPerKg,
      query.purchasePriceMxnPerKg,
    );

    const computeStartedAt = Date.now();
    let projection: ProjectionResponse;

    try {
      projection = await this.computeClient.project(projectionRequest, correlationId);
      projection = this.normalizeProjectionLanguage(projection);
    } catch {
      projection = this.buildFallbackProjection(batch, solution, query.horizonDays ?? 56);
      projection.warnings.push(
        'Fallo el servicio de proyeccion; se uso el modelo de respaldo en la API.',
      );
    }

    this.metricsService.recordProjectionCall(Date.now() - computeStartedAt);

    const projectionEntity = this.projectionRepository.create({
      batch,
      dietRun: latestDietRun,
      horizonDays: projection.horizonDays,
      projectionJson: projection as unknown as Record<string, unknown>,
    });

    return this.projectionRepository.save(projectionEntity);
  }

  async getSellSignal(
    batchId: string,
    query: GetProjectionQueryDto,
    correlationId: string,
  ): Promise<SellSignal> {
    const projection = await this.getProjection(batchId, query, correlationId);
    const payload = projection.projectionJson as unknown as ProjectionResponse;
    return payload.sellSignal;
  }

  async listWeighIns(batchId: string): Promise<BatchWeighIn[]> {
    await this.findOne(batchId);
    return this.weighInRepository.find({
      where: { batch: { id: batchId } },
      order: { measuredAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async listHealthEvents(batchId: string): Promise<BatchHealthEvent[]> {
    await this.findOne(batchId);
    return this.healthEventRepository.find({
      where: { batch: { id: batchId } },
      order: { eventDate: 'DESC', createdAt: 'DESC' },
    });
  }

  private async buildOptimizeRequest(
    batch: Batch,
    animalProfile: AnimalProfile,
    maxSolveMs: number,
  ): Promise<OptimizeRequest> {
    const ingredients = await this.ingredientRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    if (ingredients.length === 0) {
      throw new BadRequestException('No active ingredients found.');
    }

    const ingredientInputs = [] as OptimizeRequest['ingredients'];

    for (const ingredient of ingredients) {
      const latestPrice = await this.findLatestPrice(ingredient.id);

      if (!latestPrice) {
        continue;
      }

      ingredientInputs.push({
        id: ingredient.id,
        name: ingredient.name,
        priceMxnPerKgAsFed: latestPrice.priceMxnPerKgAsFed,
        dryMatterPct: ingredient.dryMatterPct,
        nutrients: enrichNutrientsFromSeedFallback(
          ingredient.name,
          sanitizeNutrientsMap(ingredient.nutrientsJson as Record<string, unknown>),
        ),
        boundsPct: {
          min: ingredient.minInclusionPct,
          max: ingredient.maxInclusionPct,
        },
      });
    }

    if (ingredientInputs.length === 0) {
      throw new BadRequestException('No ingredients have prices available.');
    }

    const latestWeighIn = await this.weighInRepository.findOne({
      where: { batch: { id: batch.id } },
      order: { measuredAt: 'DESC', createdAt: 'DESC' },
    });

    const currentWeight = latestWeighIn?.averageWeightKg ?? batch.initialWeightKg;

    return {
      animalProfile: {
        intakeDmKgPerDay: animalProfile.intakeDmKgPerDay,
        constraints: animalProfile.constraintsJson,
      },
      ingredients: ingredientInputs,
      options: {
        maxSolveMs,
        objective: 'MIN_COST',
      },
      batchContext: {
        batchId: batch.id,
        breed: batch.breed ?? 'Cruzado',
        headCount: batch.headCount,
        currentAverageWeightKg: currentWeight,
        targetSaleWeightKg: batch.targetSaleWeightKg ?? currentWeight + 110,
        daysOnFeed: this.getDaysOnFeed(batch.startDate),
        climate: {
          avgTemperatureC: 32,
          humidityPct: 45,
        },
      },
    };
  }

  private async buildProjectionRequest(
    batch: Batch,
    optimizeResponse: Pick<OptimizeResponse, 'totalCostMxnPerHeadDay' | 'mix'>,
    horizonDays: number,
    salePriceMxnPerKg?: number,
    purchasePriceMxnPerKg?: number,
  ): Promise<ProjectionRequest> {
    const latestWeighIn = await this.weighInRepository.findOne({
      where: { batch: { id: batch.id } },
      order: { measuredAt: 'DESC', createdAt: 'DESC' },
    });

    const allWeighIns = await this.weighInRepository.find({
      where: { batch: { id: batch.id } },
      order: { measuredAt: 'ASC', createdAt: 'ASC' },
      take: 12,
    });

    const currentWeight = latestWeighIn?.averageWeightKg ?? batch.initialWeightKg;

    return {
      batchContext: {
        batchId: batch.id,
        breed: batch.breed ?? 'Cruzado',
        headCount: batch.headCount,
        currentAverageWeightKg: currentWeight,
        targetSaleWeightKg: batch.targetSaleWeightKg ?? currentWeight + 110,
        daysOnFeed: this.getDaysOnFeed(batch.startDate),
        climate: {
          avgTemperatureC: 32,
          humidityPct: 45,
        },
      },
      horizonDays,
      dietCostMxnPerHeadDay: optimizeResponse.totalCostMxnPerHeadDay,
      salePriceMxnPerKg: salePriceMxnPerKg ?? 55,
      purchasePriceMxnPerKg: purchasePriceMxnPerKg ?? 43,
      otherCostMxnPerHead: 350,
      historicalWeighIns: allWeighIns.map((item) => ({
        measuredAt: item.measuredAt,
        averageWeightKg: item.averageWeightKg,
      })),
      dietMix: optimizeResponse.mix,
    };
  }

  private buildWeeklyPlan(solution: OptimizeResponse, headCount: number): WeeklyDietPlan {
    const totalCostMxnPerHeadWeek = solution.totalCostMxnPerHeadDay * 7;

    return {
      days: Array.from({ length: 7 }, (_, index) => {
        const dayNumber = index + 1;
        return {
          dayNumber,
          mix: solution.mix,
          costMxnPerHeadDay: solution.totalCostMxnPerHeadDay,
          cumulativeCostMxnPerHead: solution.totalCostMxnPerHeadDay * dayNumber,
        };
      }),
      totalCostMxnPerHeadWeek,
      totalCostMxnPerBatchWeek: totalCostMxnPerHeadWeek * headCount,
    };
  }

  private buildFallbackProjection(
    batch: Batch,
    solution: Pick<OptimizeResponse, 'totalCostMxnPerHeadDay'>,
    horizonDays: number,
  ): ProjectionResponse {
    const currentWeight = batch.initialWeightKg;
    const predictedDailyGainKg = 1.18;

    const projectedWeightSeries = Array.from({ length: horizonDays + 1 }, (_, index) => ({
      day: index,
      averageWeightKg: Number((currentWeight + predictedDailyGainKg * index).toFixed(3)),
    }));

    const estimatedCostMxnPerHead = solution.totalCostMxnPerHeadDay * horizonDays;
    const finalWeight = projectedWeightSeries.at(-1)?.averageWeightKg ?? currentWeight;
    const estimatedRevenueMxnPerHead = finalWeight * 55;
    const baselineAnimalCost = currentWeight * 43;
    const estimatedMarginMxnPerHead = estimatedRevenueMxnPerHead - baselineAnimalCost - estimatedCostMxnPerHead - 350;

    return {
      modelType: 'linear_fallback',
      confidence: 'LOW',
      horizonDays,
      projectedDailyGainKg: Number(predictedDailyGainKg.toFixed(4)),
      projectedWeightSeries,
      economicProjection: {
        estimatedRevenueMxnPerHead: Number(estimatedRevenueMxnPerHead.toFixed(2)),
        estimatedCostMxnPerHead: Number(estimatedCostMxnPerHead.toFixed(2)),
        estimatedMarginMxnPerHead: Number(estimatedMarginMxnPerHead.toFixed(2)),
        costPerKgGainMxn: Number((estimatedCostMxnPerHead / Math.max(finalWeight - currentWeight, 0.0001)).toFixed(4)),
      },
      sellSignal: {
        shouldSell: false,
        recommendedDay: horizonDays,
        expectedMarginTrend: 'STABLE',
        reason:
          'El modelo de respaldo sugiere mantener el horizonte actual mientras se registran mas pesajes.',
      },
      warnings: ['Se uso un modelo determinista de respaldo por indisponibilidad del servicio de proyeccion.'],
    };
  }

  private getDaysOnFeed(startDate: string | null): number {
    if (!startDate) {
      return 0;
    }

    const startedAt = new Date(startDate);
    if (Number.isNaN(startedAt.getTime())) {
      return 0;
    }

    const diffMs = Date.now() - startedAt.getTime();
    return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
  }

  private normalizeProjectionLanguage(projection: ProjectionResponse): ProjectionResponse {
    return {
      ...projection,
      sellSignal: {
        ...projection.sellSignal,
        reason: this.normalizeSellSignalReason(projection.sellSignal.reason),
      },
    };
  }

  private normalizeSellSignalReason(reason: string): string {
    const normalized = reason.trim();
    const lower = normalized.toLowerCase();

    if (lower.includes('projected margin is still stable')) {
      return 'El margen proyectado se mantiene estable durante el horizonte seleccionado.';
    }
    if (lower.includes('projected margin peaks before')) {
      return 'El margen proyectado alcanza su punto maximo antes del horizonte; considera vender cerca del dia recomendado.';
    }
    if (lower.includes('margin starts dropping today')) {
      return 'La proyeccion indica que el margen empieza a caer desde hoy; conviene vender hoy o lo antes posible.';
    }
    if (lower.includes('no sufficient data to generate a reliable projection')) {
      return 'No hay datos suficientes para generar una proyeccion confiable.';
    }

    return normalized;
  }

  private findLatestPrice(ingredientId: string): Promise<IngredientPrice | null> {
    return this.ingredientPriceRepository
      .createQueryBuilder('price')
      .where('price.ingredient_id = :ingredientId', { ingredientId })
      .andWhere('(price.location_code = :locationCode OR price.location_code IS NULL)', {
        locationCode: this.defaultLocationCode,
      })
      .orderBy('CASE WHEN price.location_code = :locationCode THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('price.created_at', 'DESC')
      .addOrderBy('price.effective_date', 'DESC')
      .setParameter('locationCode', this.defaultLocationCode)
      .getOne();
  }
}
