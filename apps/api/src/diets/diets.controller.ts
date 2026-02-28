import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DietRun } from './diet-run.entity';
import { GenerateDietDto } from './dto/generate-diet.dto';
import { DietsService } from './diets.service';

@Controller('diets')
export class DietsController {
  constructor(private readonly dietsService: DietsService) {}

  @Post('generate')
  generate(
    @Body() dto: GenerateDietDto,
    @Headers('x-correlation-id') incomingCorrelationId?: string,
  ): Promise<DietRun> {
    const correlationId = incomingCorrelationId ?? randomUUID();
    return this.dietsService.generate(dto, correlationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<DietRun> {
    return this.dietsService.findOne(id);
  }

  @Get()
  listRecent(): Promise<DietRun[]> {
    return this.dietsService.listRecent();
  }
}
