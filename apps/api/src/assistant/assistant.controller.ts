import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AskAssistantDto } from './dto/ask-assistant.dto';
import { RagInteraction } from './rag-interaction.entity';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

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
