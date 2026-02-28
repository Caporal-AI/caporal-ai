import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { OptimizeRequest, OptimizeResponse } from '../../../../packages/contracts/src';
import { AnimalProfile } from '../animal-profiles/animal-profile.entity';
import { Batch } from '../batches/batch.entity';
import { COMPUTE_CLIENT, ComputeClientPort } from '../compute/compute-client.port';
import { IngredientPrice } from '../ingredients/ingredient-price.entity';
import { Ingredient } from '../ingredients/ingredient.entity';
import { MetricsService } from '../metrics/metrics.service';
import { Repository } from 'typeorm';
import { DietRun, DietRunStatus } from './diet-run.entity';
import { GenerateDietDto } from './dto/generate-diet.dto';

@Injectable()
export class DietsService {
  constructor(
    @InjectRepository(DietRun)
    private readonly dietRunRepository: Repository<DietRun>,
    @InjectRepository(AnimalProfile)
    private readonly animalProfileRepository: Repository<AnimalProfile>,
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(IngredientPrice)
    private readonly ingredientPriceRepository: Repository<IngredientPrice>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    @Inject(COMPUTE_CLIENT)
    private readonly computeClient: ComputeClientPort,
    private readonly metricsService: MetricsService,
  ) {}

  async generate(dto: GenerateDietDto, correlationId: string): Promise<DietRun> {
    const startedAt = Date.now();

    const animalProfile = await this.animalProfileRepository.findOne({
      where: { id: dto.animalProfileId },
    });

    if (!animalProfile) {
      throw new NotFoundException(`AnimalProfile ${dto.animalProfileId} not found`);
    }

    const batch = dto.batchId
      ? await this.batchRepository.findOne({
          where: { id: dto.batchId },
        })
      : null;

    if (dto.batchId && !batch) {
      throw new NotFoundException(`Batch ${dto.batchId} not found`);
    }

    const ingredients = await this.ingredientRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    if (ingredients.length === 0) {
      throw new BadRequestException('No active ingredients found.');
    }

    const ingredientInputs = [] as OptimizeRequest['ingredients'];

    for (const ingredient of ingredients) {
      const latestPrice = await this.ingredientPriceRepository.findOne({
        where: { ingredient: { id: ingredient.id } },
        order: { effectiveDate: 'DESC', createdAt: 'DESC' },
      });

      if (!latestPrice) {
        continue;
      }

      ingredientInputs.push({
        id: ingredient.id,
        name: ingredient.name,
        priceMxnPerKgAsFed: latestPrice.priceMxnPerKgAsFed,
        dryMatterPct: ingredient.dryMatterPct,
        nutrients: ingredient.nutrientsJson,
        boundsPct: {
          min: ingredient.minInclusionPct,
          max: ingredient.maxInclusionPct,
        },
      });
    }

    if (ingredientInputs.length === 0) {
      throw new BadRequestException('No ingredients have prices available.');
    }

    const optimizeRequest: OptimizeRequest = {
      animalProfile: {
        intakeDmKgPerDay: animalProfile.intakeDmKgPerDay,
        constraints: animalProfile.constraintsJson,
      },
      ingredients: ingredientInputs,
      options: {
        maxSolveMs: dto.maxSolveMs ?? 4000,
        objective: 'MIN_COST',
      },
      batchContext: batch
        ? {
            batchId: batch.id,
            breed: batch.breed ?? 'Cruzado',
            headCount: batch.headCount,
            currentAverageWeightKg: batch.initialWeightKg,
            targetSaleWeightKg: batch.targetSaleWeightKg ?? batch.initialWeightKg + 110,
            daysOnFeed: 0,
            climate: {
              avgTemperatureC: 32,
              humidityPct: 45,
            },
          }
        : undefined,
    };

    const dietRun = this.dietRunRepository.create({
      userId: null,
      animalProfile,
      batch: batch ?? null,
      inputsSnapshotJson: optimizeRequest as unknown as Record<string, unknown>,
      solutionSnapshotJson: {},
      status: DietRunStatus.ERROR,
    });

    let computeResponse: OptimizeResponse;
    const computeStartedAt = Date.now();

    try {
      computeResponse = await this.computeClient.optimize(optimizeRequest, correlationId);
    } catch (error) {
      dietRun.solutionSnapshotJson = {
        error: error instanceof Error ? error.message : String(error),
      };
      dietRun.status = DietRunStatus.ERROR;
      await this.dietRunRepository.save(dietRun);

      throw new InternalServerErrorException({
        message: 'Failed to generate diet due compute error.',
        correlationId,
      });
    }

    dietRun.solutionSnapshotJson = computeResponse as unknown as Record<string, unknown>;
    dietRun.status = computeResponse.feasible ? DietRunStatus.SUCCESS : DietRunStatus.INFEASIBLE;
    const saved = await this.dietRunRepository.save(dietRun);

    const hardViolations = computeResponse.constraintsReport.filter((item) => !item.met).length;
    this.metricsService.recordDietRun(
      computeResponse.feasible,
      hardViolations,
      Date.now() - startedAt,
      Date.now() - computeStartedAt,
    );

    return saved;
  }

  async findOne(id: string): Promise<DietRun> {
    const dietRun = await this.dietRunRepository.findOne({
      where: { id },
      relations: ['animalProfile', 'batch'],
    });

    if (!dietRun) {
      throw new NotFoundException(`DietRun ${id} not found`);
    }

    return dietRun;
  }

  listRecent(): Promise<DietRun[]> {
    return this.dietRunRepository.find({
      relations: ['animalProfile', 'batch'],
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }
}
