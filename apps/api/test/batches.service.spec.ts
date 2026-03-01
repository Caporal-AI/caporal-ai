import { BatchesService } from '../src/batches/batches.service';
import { BatchStatus } from '../src/batches/batch.entity';
import { DietRunStatus } from '../src/diets/diet-run.entity';
import { MetricsService } from '../src/metrics/metrics.service';

describe('BatchesService', () => {
  const makeRepository = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  it('generates weekly diet and stores projection snapshot', async () => {
    const batchRepository = makeRepository();
    const weighInRepository = makeRepository();
    const healthEventRepository = makeRepository();
    const projectionRepository = makeRepository();
    const dietRunRepository = makeRepository();
    const animalProfileRepository = makeRepository();
    const ingredientRepository = makeRepository();
    const ingredientPriceRepository = makeRepository();

    const computeClient = {
      optimize: jest.fn().mockResolvedValue({
        feasible: true,
        mix: [
          {
            ingredientId: 'i-1',
            kgAsFedPerHeadDay: 6.2,
            kgDmPerHeadDay: 5.4,
            pctDm: 53,
          },
        ],
        totalCostMxnPerHeadDay: 51.2,
        constraintsReport: [
          {
            code: 'CP',
            target: '>= 0.125 fraction_dm',
            actual: 0.13,
            met: true,
            slack: 0.005,
          },
        ],
        solverMeta: {
          method: 'highs',
          runtimeMs: 35,
        },
        warnings: [],
      }),
      project: jest.fn().mockResolvedValue({
        modelType: 'linear_fallback',
        confidence: 'LOW',
        horizonDays: 56,
        projectedDailyGainKg: 1.2,
        projectedWeightSeries: [{ day: 0, averageWeightKg: 340 }],
        economicProjection: {
          estimatedRevenueMxnPerHead: 20000,
          estimatedCostMxnPerHead: 18000,
          estimatedMarginMxnPerHead: 2000,
          costPerKgGainMxn: 42,
        },
        sellSignal: {
          shouldSell: false,
          recommendedDay: 56,
          expectedMarginTrend: 'STABLE',
          reason: 'Horizonte estable',
        },
        warnings: [],
      }),
    };

    const metricsService = new MetricsService();

    batchRepository.findOne.mockResolvedValue({
      id: 'batch-1',
      name: 'Lote Norte 01',
      breed: 'Cruzado',
      headCount: 120,
      initialWeightKg: 340,
      targetSaleWeightKg: 520,
      startDate: '2026-01-15',
      status: BatchStatus.ACTIVE,
    });

    animalProfileRepository.findOne.mockResolvedValue({
      id: 'profile-1',
      intakeDmKgPerDay: 10.2,
      constraintsJson: [{ code: 'CP', min: 0.125, unit: 'fraction_dm' }],
    });

    ingredientRepository.find.mockResolvedValue([
      {
        id: 'i-1',
        name: 'Sorgo rolado',
        dryMatterPct: 89,
        nutrientsJson: { CP: 0.1 },
        minInclusionPct: 0,
        maxInclusionPct: 55,
      },
    ]);

    const priceQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        priceMxnPerKgAsFed: 5.8,
        effectiveDate: '2026-02-28',
      }),
    };
    ingredientPriceRepository.createQueryBuilder.mockReturnValue(priceQb);

    weighInRepository.findOne.mockResolvedValue(null);
    weighInRepository.find.mockResolvedValue([]);

    dietRunRepository.create.mockImplementation((payload: Record<string, unknown>) => payload);
    dietRunRepository.save.mockImplementation(async (payload: Record<string, unknown>) => ({
      id: 'run-weekly-1',
      createdAt: '2026-02-28T00:00:00.000Z',
      ...payload,
      status: DietRunStatus.SUCCESS,
    }));

    projectionRepository.create.mockImplementation((payload: Record<string, unknown>) => payload);
    projectionRepository.save.mockImplementation(async (payload: Record<string, unknown>) => ({
      id: 'proj-1',
      ...payload,
    }));

    const service = new BatchesService(
      batchRepository as never,
      weighInRepository as never,
      healthEventRepository as never,
      projectionRepository as never,
      dietRunRepository as never,
      animalProfileRepository as never,
      ingredientRepository as never,
      ingredientPriceRepository as never,
      computeClient as never,
      metricsService,
    );

    const result = await service.generateWeeklyDiet(
      'batch-1',
      {
        animalProfileId: 'profile-1',
      },
      'corr-weekly-1',
    );

    expect(result.id).toBe('run-weekly-1');
    expect(result.status).toBe(DietRunStatus.SUCCESS);

    const savedPayload = dietRunRepository.save.mock.calls[0]?.[0] as {
      solutionSnapshotJson: {
        weeklyPlan?: { days: Array<Record<string, unknown>> };
      };
    };

    expect(savedPayload.solutionSnapshotJson.weeklyPlan?.days.length).toBe(7);
    expect(computeClient.optimize).toHaveBeenCalledTimes(1);
    expect(computeClient.project).toHaveBeenCalledTimes(1);
  });
});
