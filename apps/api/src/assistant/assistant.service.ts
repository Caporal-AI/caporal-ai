import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { AskRequest, AskResponse } from '../../../../packages/contracts/src';
import { ComputeClientPort, COMPUTE_CLIENT } from '../compute/compute-client.port';
import { DietRun, DietRunStatus } from '../diets/diet-run.entity';
import { MetricsService } from '../metrics/metrics.service';
import { Repository } from 'typeorm';
import { AskAssistantDto } from './dto/ask-assistant.dto';
import { RagInteraction } from './rag-interaction.entity';

@Injectable()
export class AssistantService {
  constructor(
    @InjectRepository(DietRun)
    private readonly dietRunRepository: Repository<DietRun>,
    @InjectRepository(RagInteraction)
    private readonly ragInteractionRepository: Repository<RagInteraction>,
    @Inject(COMPUTE_CLIENT)
    private readonly computeClient: ComputeClientPort,
    private readonly metricsService: MetricsService,
  ) {}

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
}
