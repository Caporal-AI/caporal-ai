import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AgentContext,
  AgentRespondRequest,
  AgentRespondResponse,
  AgentTraceResponse,
  AskRequest,
  AskResponse,
  IngredientInput,
} from '../../../../packages/contracts/src';
import { ComputeClientPort, COMPUTE_CLIENT } from '../compute/compute-client.port';
import { BatchProjection } from '../batches/batch-projection.entity';
import { Batch } from '../batches/batch.entity';
import { DietRun, DietRunStatus } from '../diets/diet-run.entity';
import { IngredientPrice } from '../ingredients/ingredient-price.entity';
import { Ingredient } from '../ingredients/ingredient.entity';
import { MetricsService } from '../metrics/metrics.service';
import { Repository } from 'typeorm';
import { AskAssistantDto } from './dto/ask-assistant.dto';
import { CreateAgentSessionDto } from './dto/create-agent-session.dto';
import { SendAgentMessageDto } from './dto/send-agent-message.dto';
import { SimulateAgentDto } from './dto/simulate-agent.dto';
import { AssistantMessage, AssistantMessageRole } from './assistant-message.entity';
import { AssistantSession } from './assistant-session.entity';
import {
  AssistantToolCall,
  AssistantToolStatus,
} from './assistant-tool-call.entity';
import { RagInteraction } from './rag-interaction.entity';

@Injectable()
export class AssistantService {
  private readonly defaultLocationCode = 'MX-NL';

  constructor(
    @InjectRepository(DietRun)
    private readonly dietRunRepository: Repository<DietRun>,
    @InjectRepository(RagInteraction)
    private readonly ragInteractionRepository: Repository<RagInteraction>,
    @InjectRepository(AssistantSession)
    private readonly assistantSessionRepository: Repository<AssistantSession>,
    @InjectRepository(AssistantMessage)
    private readonly assistantMessageRepository: Repository<AssistantMessage>,
    @InjectRepository(AssistantToolCall)
    private readonly assistantToolCallRepository: Repository<AssistantToolCall>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    @InjectRepository(BatchProjection)
    private readonly batchProjectionRepository: Repository<BatchProjection>,
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(IngredientPrice)
    private readonly ingredientPriceRepository: Repository<IngredientPrice>,
    @Inject(COMPUTE_CLIENT)
    private readonly computeClient: ComputeClientPort,
    private readonly metricsService: MetricsService,
  ) {}

  async createSession(dto: CreateAgentSessionDto): Promise<AssistantSession> {
    if (!dto.dietRunId && !dto.batchId) {
      throw new BadRequestException('Create session requires dietRunId or batchId.');
    }

    const dietRun = dto.dietRunId
      ? await this.dietRunRepository.findOne({
          where: { id: dto.dietRunId },
          relations: ['batch', 'animalProfile'],
        })
      : null;

    if (dto.dietRunId && !dietRun) {
      throw new NotFoundException(`DietRun ${dto.dietRunId} not found`);
    }

    const batchId = dto.batchId ?? dietRun?.batchId ?? undefined;
    const batch = batchId
      ? await this.batchRepository.findOne({
          where: { id: batchId },
        })
      : null;

    if (batchId && !batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    const session = this.assistantSessionRepository.create({
      dietRun: dietRun ?? null,
      batch: batch ?? null,
      title:
        dto.title?.trim() ||
        `Copiloto ${new Date().toISOString().slice(0, 10)} ${batch?.name ?? dietRun?.id ?? ''}`.trim(),
    });

    return this.assistantSessionRepository.save(session);
  }

  async sendSessionMessage(
    sessionId: string,
    dto: SendAgentMessageDto,
    correlationId: string,
  ): Promise<AssistantMessage> {
    const startedAt = Date.now();
    const session = await this.loadSession(sessionId);
    const userMessage = await this.assistantMessageRepository.save(
      this.assistantMessageRepository.create({
        session,
        role: AssistantMessageRole.USER,
        mode: null,
        content: dto.message.trim(),
        citationsJson: [],
        safetyFlagsJson: [],
        simulationDiffJson: null,
        traceJson: [],
      }),
    );

    const context = await this.buildAgentContext(session);
    const request: AgentRespondRequest = {
      sessionId: session.id,
      message: dto.message.trim(),
      mode: dto.mode ?? 'AUTO',
      context,
      options: {
        topK: 5,
        maxToolCalls: 3,
      },
    };

    let response: AgentRespondResponse;
    const computeStartedAt = Date.now();
    try {
      response = await this.computeClient.agentRespond(request, correlationId);
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Agentic assistant request failed due compute error.',
        reason: error instanceof Error ? error.message : String(error),
        correlationId,
      });
    }

    const assistantMessage = await this.assistantMessageRepository.save(
      this.assistantMessageRepository.create({
        session,
        role: AssistantMessageRole.ASSISTANT,
        mode: response.mode,
        content: response.answer,
        citationsJson: response.citations as unknown as Array<Record<string, unknown>>,
        safetyFlagsJson: response.safetyFlags,
        simulationDiffJson:
          (response.simulationDiff as unknown as Record<string, unknown>) ?? null,
        traceJson: response.toolCalls as unknown as Array<Record<string, unknown>>,
      }),
    );

    if (response.toolCalls.length > 0) {
      const toolCallEntities = response.toolCalls.map((item) =>
        this.assistantToolCallRepository.create({
          session,
          message: assistantMessage,
          toolName: item.toolName,
          status: item.status as AssistantToolStatus,
          latencyMs: item.latencyMs,
          inputJson: item.input as Record<string, unknown>,
          outputJson: item.output as Record<string, unknown>,
        }),
      );
      await this.assistantToolCallRepository.save(toolCallEntities);
    }

    this.metricsService.recordAssistantCall(
      Date.now() - startedAt,
      Date.now() - computeStartedAt,
      response.safetyFlags.length > 0,
    );
    this.metricsService.recordAgentToolCalls(
      response.toolCalls,
      response.mode,
      response.mode === 'WHAT_IF' && Boolean(response.simulationDiff),
    );

    if (userMessage.id.length === 0) {
      throw new InternalServerErrorException('Unexpected empty user message id.');
    }

    return assistantMessage;
  }

  async simulateSession(
    sessionId: string,
    dto: SimulateAgentDto,
    correlationId: string,
  ): Promise<AssistantMessage> {
    return this.sendSessionMessage(
      sessionId,
      {
        message: dto.hypothesis,
        mode: 'WHAT_IF',
      },
      correlationId,
    );
  }

  async getSessionTrace(sessionId: string): Promise<AgentTraceResponse> {
    const session = await this.loadSession(sessionId);
    const messages = await this.assistantMessageRepository.find({
      where: { session: { id: sessionId } },
      order: { createdAt: 'ASC' },
    });
    const toolCalls = await this.assistantToolCallRepository.find({
      where: { session: { id: sessionId } },
      order: { createdAt: 'ASC' },
    });

    return {
      session: {
        id: session.id,
        dietRunId: session.dietRunId,
        batchId: session.batchId,
        title: session.title,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
      messages: messages.map((message) => ({
        id: message.id,
        sessionId: message.sessionId,
        role: message.role,
        mode: message.mode,
        content: message.content,
        citationsJson: message.citationsJson as unknown as Array<{
          sourceId: string;
          chunkId: string;
          sourceTitle: string;
          snippet: string;
          offsetStart: number;
          offsetEnd: number;
          score: number;
        }>,
        safetyFlagsJson: message.safetyFlagsJson,
        simulationDiffJson: message.simulationDiffJson as
          | {
              costDeltaMxnPerHeadDay: number;
              feasibleBefore: boolean;
              feasibleAfter: boolean;
              hardConstraintDelta: number;
              riskFlags: string[];
            }
          | null,
        createdAt: message.createdAt.toISOString(),
      })),
      toolCalls: toolCalls.map((toolCall) => ({
        id: toolCall.id,
        sessionId: toolCall.sessionId,
        messageId: toolCall.messageId,
        toolName: toolCall.toolName,
        status: toolCall.status,
        latencyMs: toolCall.latencyMs,
        inputJson: toolCall.inputJson,
        outputJson: toolCall.outputJson,
        createdAt: toolCall.createdAt.toISOString(),
      })),
    };
  }

  async ask(dto: AskAssistantDto, correlationId: string): Promise<RagInteraction> {
    const startedAt = Date.now();

    const dietRun = await this.dietRunRepository.findOne({
      where: { id: dto.dietRunId },
      relations: ['animalProfile'],
    });

    if (!dietRun) {
      throw new NotFoundException(`DietRun ${dto.dietRunId} not found`);
    }

    if (dietRun.status !== DietRunStatus.SUCCESS) {
      throw new BadRequestException(
        `DietRun ${dto.dietRunId} is not successful; assistant requires a successful diet run.`,
      );
    }

    const solution = dietRun.solutionSnapshotJson as {
      mix: Array<Record<string, unknown>>;
      constraintsReport: Array<Record<string, unknown>>;
    };

    const askRequest: AskRequest = {
      question: dto.question,
      dietContext: {
        animalProfile: {
          intakeDmKgPerDay: dietRun.animalProfile.intakeDmKgPerDay,
          constraints: dietRun.animalProfile.constraintsJson,
        },
        dietMix: (solution.mix ?? []) as unknown as AskRequest['dietContext']['dietMix'],
        constraintsReport: (solution.constraintsReport ??
          []) as unknown as AskRequest['dietContext']['constraintsReport'],
      },
      retrievalOptions: {
        topK: dto.topK ?? 3,
      },
    };

    let askResponse: AskResponse;
    const computeStartedAt = Date.now();
    try {
      askResponse = await this.computeClient.ask(askRequest, correlationId);
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Assistant request failed due compute error.',
        reason: error instanceof Error ? error.message : String(error),
        correlationId,
      });
    }

    const interaction = this.ragInteractionRepository.create({
      dietRun,
      question: dto.question,
      answer: askResponse.answer,
      citationsJson: askResponse.citations as unknown as Array<Record<string, unknown>>,
      safetyFlagsJson: askResponse.safetyFlags,
    });

    const saved = await this.ragInteractionRepository.save(interaction);

    const guardrailTriggered = askResponse.safetyFlags.length > 0;
    this.metricsService.recordAssistantCall(
      Date.now() - startedAt,
      Date.now() - computeStartedAt,
      guardrailTriggered,
    );

    return saved;
  }

  listByDietRun(dietRunId: string): Promise<RagInteraction[]> {
    return this.ragInteractionRepository.find({
      where: { dietRun: { id: dietRunId } },
      order: { createdAt: 'ASC' },
    });
  }

  private async loadSession(sessionId: string): Promise<AssistantSession> {
    const session = await this.assistantSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['dietRun', 'dietRun.animalProfile', 'dietRun.batch', 'batch'],
    });

    if (!session) {
      throw new NotFoundException(`AssistantSession ${sessionId} not found`);
    }

    return session;
  }

  private async buildAgentContext(session: AssistantSession): Promise<AgentContext> {
    const dietRun =
      session.dietRun ??
      (session.batchId
        ? await this.dietRunRepository.findOne({
            where: { batch: { id: session.batchId }, status: DietRunStatus.SUCCESS },
            order: { createdAt: 'DESC' },
            relations: ['animalProfile', 'batch'],
          })
        : null);

    const batch = session.batch ?? dietRun?.batch ?? null;
    const solution = (dietRun?.solutionSnapshotJson ?? {}) as {
      mix?: Array<Record<string, unknown>>;
      constraintsReport?: Array<Record<string, unknown>>;
      totalCostMxnPerHeadDay?: number;
    };

    const ingredients = await this.buildIngredientInputs();

    const latestProjection = batch
      ? await this.batchProjectionRepository.findOne({
          where: { batch: { id: batch.id } },
          order: { generatedAt: 'DESC' },
        })
      : null;

    return {
      dietRunId: dietRun?.id,
      batchId: batch?.id,
      animalProfile: dietRun
        ? {
            intakeDmKgPerDay: dietRun.animalProfile.intakeDmKgPerDay,
            constraints: dietRun.animalProfile.constraintsJson,
          }
        : undefined,
      currentMix: (solution.mix ?? []) as unknown as AgentContext['currentMix'],
      constraintsReport:
        (solution.constraintsReport ?? []) as unknown as AgentContext['constraintsReport'],
      totalCostMxnPerHeadDay:
        solution.totalCostMxnPerHeadDay ??
        (latestProjection?.projectionJson as { economicProjection?: { estimatedCostMxnPerHead?: number } })
          ?.economicProjection?.estimatedCostMxnPerHead ??
        undefined,
      ingredients,
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
      projection: (latestProjection?.projectionJson ?? undefined) as AgentContext['projection'],
      salePriceMxnPerKg: 55,
      purchasePriceMxnPerKg: 43,
    };
  }

  private async buildIngredientInputs(): Promise<IngredientInput[]> {
    const ingredients = await this.ingredientRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    const result: IngredientInput[] = [];

    for (const ingredient of ingredients) {
      const latestPrice = await this.findLatestPrice(ingredient.id);
      if (!latestPrice) {
        continue;
      }

      result.push({
        id: ingredient.id,
        name: ingredient.name,
        priceMxnPerKgAsFed: ingredient.isActive ? latestPrice.priceMxnPerKgAsFed : 0,
        dryMatterPct: ingredient.dryMatterPct,
        nutrients: ingredient.nutrientsJson,
        boundsPct: {
          min: ingredient.minInclusionPct,
          max: ingredient.maxInclusionPct,
        },
      });
    }

    return result;
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
