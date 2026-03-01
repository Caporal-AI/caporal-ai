import { AssistantService } from '../src/assistant/assistant.service';
import { AssistantMessageRole } from '../src/assistant/assistant-message.entity';
import { MetricsService } from '../src/metrics/metrics.service';

describe('AssistantService (agentic sessions)', () => {
  const makeRepository = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  it('creates assistant session bound to diet run', async () => {
    const dietRunRepository = makeRepository();
    const ragInteractionRepository = makeRepository();
    const assistantSessionRepository = makeRepository();
    const assistantMessageRepository = makeRepository();
    const assistantToolCallRepository = makeRepository();
    const batchRepository = makeRepository();
    const batchProjectionRepository = makeRepository();
    const ingredientRepository = makeRepository();
    const ingredientPriceRepository = makeRepository();

    const computeClient = {
      ask: jest.fn(),
      optimize: jest.fn(),
      project: jest.fn(),
      agentRespond: jest.fn(),
    };

    const metrics = new MetricsService();

    dietRunRepository.findOne.mockResolvedValue({
      id: 'run-1',
      batchId: null,
      batch: null,
      animalProfile: {
        intakeDmKgPerDay: 10,
        constraintsJson: [],
      },
    });
    assistantSessionRepository.create.mockImplementation((payload: Record<string, unknown>) => payload);
    assistantSessionRepository.save.mockImplementation(async (payload: Record<string, unknown>) => ({
      id: 'sess-1',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      ...payload,
    }));

    const service = new AssistantService(
      dietRunRepository as never,
      ragInteractionRepository as never,
      assistantSessionRepository as never,
      assistantMessageRepository as never,
      assistantToolCallRepository as never,
      batchRepository as never,
      batchProjectionRepository as never,
      ingredientRepository as never,
      ingredientPriceRepository as never,
      computeClient as never,
      metrics,
    );

    const session = await service.createSession({ dietRunId: 'run-1' });
    expect(session.id).toBe('sess-1');
  });

  it('sends session message and persists tool trace', async () => {
    const dietRunRepository = makeRepository();
    const ragInteractionRepository = makeRepository();
    const assistantSessionRepository = makeRepository();
    const assistantMessageRepository = makeRepository();
    const assistantToolCallRepository = makeRepository();
    const batchRepository = makeRepository();
    const batchProjectionRepository = makeRepository();
    const ingredientRepository = makeRepository();
    const ingredientPriceRepository = makeRepository();

    const computeClient = {
      ask: jest.fn(),
      optimize: jest.fn(),
      project: jest.fn(),
      agentRespond: jest.fn().mockResolvedValue({
        mode: 'WHY',
        answer: 'Respuesta de prueba',
        citations: [],
        safetyFlags: [],
        toolCalls: [
          {
            toolName: 'rag.retrieve',
            status: 'SUCCESS',
            latencyMs: 12,
            input: { question: 'por que?' },
            output: { chunks: [] },
          },
        ],
        simulationDiff: null,
        confidence: 'MEDIUM',
      }),
    };

    const metrics = new MetricsService();

    assistantSessionRepository.findOne.mockResolvedValue({
      id: 'sess-1',
      dietRunId: 'run-1',
      batchId: null,
      dietRun: {
        id: 'run-1',
        batch: null,
        batchId: null,
        animalProfile: {
          intakeDmKgPerDay: 10.2,
          constraintsJson: [],
        },
        solutionSnapshotJson: {
          mix: [],
          constraintsReport: [],
          totalCostMxnPerHeadDay: 50,
        },
      },
      batch: null,
    });
    ingredientRepository.find.mockResolvedValue([]);
    batchProjectionRepository.findOne.mockResolvedValue(null);

    assistantMessageRepository.create.mockImplementation((payload: Record<string, unknown>) => payload);
    assistantMessageRepository.save
      .mockImplementationOnce(async (payload: Record<string, unknown>) => ({
        id: 'msg-user-1',
        role: AssistantMessageRole.USER,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        ...payload,
      }))
      .mockImplementationOnce(async (payload: Record<string, unknown>) => ({
        id: 'msg-assistant-1',
        role: AssistantMessageRole.ASSISTANT,
        sessionId: 'sess-1',
        createdAt: new Date('2026-03-01T00:00:05.000Z'),
        ...payload,
      }));

    assistantToolCallRepository.create.mockImplementation((payload: Record<string, unknown>) => payload);
    assistantToolCallRepository.save.mockImplementation(async (payload: Record<string, unknown>) => payload);

    const service = new AssistantService(
      dietRunRepository as never,
      ragInteractionRepository as never,
      assistantSessionRepository as never,
      assistantMessageRepository as never,
      assistantToolCallRepository as never,
      batchRepository as never,
      batchProjectionRepository as never,
      ingredientRepository as never,
      ingredientPriceRepository as never,
      computeClient as never,
      metrics,
    );

    const message = await service.sendSessionMessage(
      'sess-1',
      { message: 'por que esta mezcla?' },
      'corr-1',
    );

    expect(message.id).toBe('msg-assistant-1');
    expect(computeClient.agentRespond).toHaveBeenCalledTimes(1);
    expect(assistantToolCallRepository.save).toHaveBeenCalledTimes(1);
  });
});
