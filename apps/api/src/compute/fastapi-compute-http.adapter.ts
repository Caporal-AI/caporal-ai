import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  AgentRespondRequest,
  AgentRespondResponse,
  AskRequest,
  AskResponse,
  OptimizeRequest,
  OptimizeResponse,
  ProjectionRequest,
  ProjectionResponse,
} from '../../../../packages/contracts/src';
import { ComputeClientPort } from './compute-client.port';

@Injectable()
export class FastApiComputeHttpAdapter implements ComputeClientPort {
  private readonly logger = new Logger(FastApiComputeHttpAdapter.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries = 2;
  private readonly breakerFailureThreshold = 3;
  private readonly breakerOpenMs = 20_000;

  private failureCount = 0;
  private circuitOpenedAt = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('COMPUTE_BASE_URL', 'http://localhost:8000');
    this.timeoutMs = Number(this.configService.get<string>('COMPUTE_TIMEOUT_MS', '5000'));
  }

  optimize(payload: OptimizeRequest, correlationId: string): Promise<OptimizeResponse> {
    return this.postWithRetry<OptimizeResponse>('/v1/optimize', payload, correlationId);
  }

  ask(payload: AskRequest, correlationId: string): Promise<AskResponse> {
    return this.postWithRetry<AskResponse>('/v1/ask', payload, correlationId);
  }

  project(payload: ProjectionRequest, correlationId: string): Promise<ProjectionResponse> {
    return this.postWithRetry<ProjectionResponse>('/v1/project', payload, correlationId);
  }

  agentRespond(payload: AgentRespondRequest, correlationId: string): Promise<AgentRespondResponse> {
    return this.postWithRetry<AgentRespondResponse>('/v1/agent/respond', payload, correlationId);
  }

  private async postWithRetry<T>(
    path: string,
    payload: unknown,
    correlationId: string,
  ): Promise<T> {
    this.assertCircuitHealthy(correlationId, path);

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.maxRetries) {
      try {
        this.logger.log(
          `[${correlationId}] compute request ${path} attempt=${attempt + 1} payload=${JSON.stringify(payload)}`,
        );

        const startedAt = Date.now();
        const response = await firstValueFrom(
          this.httpService.post<T>(`${this.baseUrl}${path}`, payload, {
            timeout: this.timeoutMs,
            headers: {
              'x-correlation-id': correlationId,
            },
          }),
        );

        const elapsedMs = Date.now() - startedAt;
        this.logger.log(
          `[${correlationId}] compute response ${path} status=${response.status} latencyMs=${elapsedMs} body=${JSON.stringify(response.data)}`,
        );

        this.failureCount = 0;
        this.circuitOpenedAt = 0;
        return response.data;
      } catch (error) {
        lastError = error;
        attempt += 1;

        this.logger.warn(
          `[${correlationId}] compute error ${path} attempt=${attempt} err=${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        if (attempt > this.maxRetries) {
          break;
        }

        await this.delay(200 * attempt);
      }
    }

    this.failureCount += 1;

    if (this.failureCount >= this.breakerFailureThreshold) {
      this.circuitOpenedAt = Date.now();
      this.logger.error(
        `[${correlationId}] compute circuit opened after ${this.failureCount} failures`,
      );
    }

    throw new ServiceUnavailableException({
      message: 'Compute service unavailable',
      reason: lastError instanceof Error ? lastError.message : String(lastError),
      correlationId,
    });
  }

  private assertCircuitHealthy(correlationId: string, path: string): void {
    if (this.circuitOpenedAt === 0) {
      return;
    }

    const elapsed = Date.now() - this.circuitOpenedAt;
    if (elapsed > this.breakerOpenMs) {
      this.circuitOpenedAt = 0;
      this.failureCount = 0;
      return;
    }

    throw new HttpException(
      {
        message: 'Compute circuit breaker open',
        path,
        correlationId,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
