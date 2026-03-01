import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AskAssistantDto } from './dto/ask-assistant.dto';
import { CreateAgentSessionDto } from './dto/create-agent-session.dto';
import { SendAgentMessageDto } from './dto/send-agent-message.dto';
import { SimulateAgentDto } from './dto/simulate-agent.dto';
import { AssistantMessage } from './assistant-message.entity';
import { AssistantSession } from './assistant-session.entity';
import { RagInteraction } from './rag-interaction.entity';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('sessions')
  createSession(@Body() dto: CreateAgentSessionDto): Promise<AssistantSession> {
    return this.assistantService.createSession(dto);
  }

  @Post('sessions/:id/messages')
  sendSessionMessage(
    @Param('id') id: string,
    @Body() dto: SendAgentMessageDto,
    @Headers('x-correlation-id') incomingCorrelationId?: string,
  ): Promise<AssistantMessage> {
    const correlationId = incomingCorrelationId ?? randomUUID();
    return this.assistantService.sendSessionMessage(id, dto, correlationId);
  }

  @Get('sessions/:id/trace')
  getSessionTrace(@Param('id') id: string) {
    return this.assistantService.getSessionTrace(id);
  }

  @Post('sessions/:id/simulate')
  simulate(
    @Param('id') id: string,
    @Body() dto: SimulateAgentDto,
    @Headers('x-correlation-id') incomingCorrelationId?: string,
  ): Promise<AssistantMessage> {
    const correlationId = incomingCorrelationId ?? randomUUID();
    return this.assistantService.simulateSession(id, dto, correlationId);
  }

  @Post('ask')
  ask(
    @Body() dto: AskAssistantDto,
    @Headers('x-correlation-id') incomingCorrelationId?: string,
  ): Promise<RagInteraction> {
    const correlationId = incomingCorrelationId ?? randomUUID();
    return this.assistantService.ask(dto, correlationId);
  }

  @Get('diet-runs/:dietRunId/interactions')
  listByDietRun(@Param('dietRunId') dietRunId: string): Promise<RagInteraction[]> {
    return this.assistantService.listByDietRun(dietRunId);
  }
}
