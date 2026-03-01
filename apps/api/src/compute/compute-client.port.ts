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

export interface ComputeClientPort {
  optimize(payload: OptimizeRequest, correlationId: string): Promise<OptimizeResponse>;
  ask(payload: AskRequest, correlationId: string): Promise<AskResponse>;
  project(payload: ProjectionRequest, correlationId: string): Promise<ProjectionResponse>;
  agentRespond(payload: AgentRespondRequest, correlationId: string): Promise<AgentRespondResponse>;
}

export const COMPUTE_CLIENT = Symbol('COMPUTE_CLIENT');
