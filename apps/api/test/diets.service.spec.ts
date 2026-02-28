import { InternalServerErrorException } from '@nestjs/common';
import { DietsService } from '../src/diets/diets.service';
import { DietRunStatus } from '../src/diets/diet-run.entity';
import { MetricsService } from '../src/metrics/metrics.service';

describe('DietsService', () => {
  const makeRepository = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  it('persists snapshots when diet generation succeeds', async () => {
    const dietRunRepository = makeRepository();
    const animalProfileRepository = makeRepository();
    const ingredientRepository = makeRepository();
    const ingredientPriceRepository = makeRepository();
    const batchRepository = makeRepository();

    const computeClient = {
      optimize: jest.fn().mockResolvedValue({
        feasible: true,
        mix: [
          {
            ingredientId: 'i-1',
            kgAsFedPerHeadDay: 8.5,
            kgDmPerHeadDay: 7.5,
            pctDm: 73.5,
          },
        ],
        totalCostMxnPerHeadDay: 82.15,
        constraintsReport: [
          {
            code: 'CP',
            target: '>= 0.12 fraction_dm',
            actual: 0.13,
            met: true,
            slack: 0.01,
          },
        ],
        solverMeta: {
          method: 'highs',
          runtimeMs: 30,
        },
        warnings: [],
      }),
    };

    const metricsService = new MetricsService();

    animalProfileRepository.findOne.mockResolvedValue({
      id: 'profile-1',
      intakeDmKgPerDay: 10,
      constraintsJson: [{ code: 'CP', min: 0.12, unit: 'fraction_dm' }],
    });

    ingredientRepository.find.mockResolvedValue([
      {
        id: 'i-1',
        name: 'Corn',
        dryMatterPct: 88,
        nutrientsJson: { CP: 0.09 },
        minInclusionPct: 0,
        maxInclusionPct: 100,
      },
    ]);

    ingredientPriceRepository.findOne.mockResolvedValue({ priceMxnPerKgAsFed: 6.2 });

    dietRunRepository.create.mockImplementation((payload: Record<string, unknown>) => payload);
    dietRunRepository.save.mockImplementation(async (payload: Record<string, unknown>) => ({ id: 'run-1', ...payload }));

    const service = new DietsService(
      dietRunRepository as never,
      animalProfileRepository as never,
      ingredientRepository as never,
      ingredientPriceRepository as never,
      batchRepository as never,
      computeClient as never,
      metricsService,
    );

    const response = await service.generate({ animalProfileId: 'profile-1' }, 'corr-123');

    expect(response.id).toBe('run-1');
    expect(response.status).toBe(DietRunStatus.SUCCESS);
    expect(computeClient.optimize).toHaveBeenCalledTimes(1);

    const savedPayload = dietRunRepository.save.mock.calls.at(-1)?.[0] as {
      inputsSnapshotJson: Record<string, unknown>;
      solutionSnapshotJson: Record<string, unknown>;
    };

    expect(savedPayload.inputsSnapshotJson).toBeDefined();
    expect(savedPayload.solutionSnapshotJson).toBeDefined();
    expect(savedPayload.solutionSnapshotJson.feasible).toBe(true);
  });

  it('persists error status when compute call fails', async () => {
    const dietRunRepository = makeRepository();
    const animalProfileRepository = makeRepository();
    const ingredientRepository = makeRepository();
    const ingredientPriceRepository = makeRepository();
    const batchRepository = makeRepository();

    const computeClient = {
      optimize: jest.fn().mockRejectedValue(new Error('timeout')),
    };

    const metricsService = new MetricsService();

    animalProfileRepository.findOne.mockResolvedValue({
      id: 'profile-1',
      intakeDmKgPerDay: 10,
      constraintsJson: [{ code: 'CP', min: 0.12, unit: 'fraction_dm' }],
    });

    ingredientRepository.find.mockResolvedValue([
      {
        id: 'i-1',
        name: 'Corn',
        dryMatterPct: 88,
        nutrientsJson: { CP: 0.09 },
        minInclusionPct: 0,
        maxInclusionPct: 100,
      },
    ]);

    ingredientPriceRepository.findOne.mockResolvedValue({ priceMxnPerKgAsFed: 6.2 });

    dietRunRepository.create.mockImplementation((payload: Record<string, unknown>) => payload);
    dietRunRepository.save.mockImplementation(async (payload: Record<string, unknown>) => ({ id: 'run-2', ...payload }));

    const service = new DietsService(
      dietRunRepository as never,
      animalProfileRepository as never,
      ingredientRepository as never,
      ingredientPriceRepository as never,
      batchRepository as never,
      computeClient as never,
      metricsService,
    );

    await expect(service.generate({ animalProfileId: 'profile-1' }, 'corr-timeout')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );

    const savedPayload = dietRunRepository.save.mock.calls.at(-1)?.[0] as {
      status: DietRunStatus;
      solutionSnapshotJson: Record<string, unknown>;
    };

    expect(savedPayload.status).toBe(DietRunStatus.ERROR);
    expect(savedPayload.solutionSnapshotJson.error).toContain('timeout');
  });
});
