import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { SellSignal } from '../../../../packages/contracts/src';
import { DietRun } from '../diets/diet-run.entity';
import { BatchHealthEvent } from './batch-health-event.entity';
import { BatchProjection } from './batch-projection.entity';
import { BatchWeighIn } from './batch-weigh-in.entity';
import { Batch } from './batch.entity';
import { BatchesService } from './batches.service';
import { CreateBatchHealthEventDto } from './dto/create-batch-health-event.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateBatchWeighInDto } from './dto/create-batch-weigh-in.dto';
import { GenerateWeeklyDietDto } from './dto/generate-weekly-diet.dto';
import { GetProjectionQueryDto } from './dto/get-projection-query.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  create(@Body() dto: CreateBatchDto): Promise<Batch> {
    return this.batchesService.create(dto);
  }

  @Get()
  list(): Promise<Batch[]> {
    return this.batchesService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Batch> {
    return this.batchesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBatchDto): Promise<Batch> {
    return this.batchesService.update(id, dto);
  }

  @Post(':id/weigh-ins')
  addWeighIn(@Param('id') id: string, @Body() dto: CreateBatchWeighInDto): Promise<BatchWeighIn> {
    return this.batchesService.addWeighIn(id, dto);
  }

  @Get(':id/weigh-ins')
  listWeighIns(@Param('id') id: string): Promise<BatchWeighIn[]> {
    return this.batchesService.listWeighIns(id);
  }

  @Post(':id/health-events')
  addHealthEvent(
    @Param('id') id: string,
    @Body() dto: CreateBatchHealthEventDto,
  ): Promise<BatchHealthEvent> {
    return this.batchesService.addHealthEvent(id, dto);
  }

  @Get(':id/health-events')
  listHealthEvents(@Param('id') id: string): Promise<BatchHealthEvent[]> {
    return this.batchesService.listHealthEvents(id);
  }

  @Post(':id/diets/generate-weekly')
  generateWeeklyDiet(
    @Param('id') id: string,
    @Body() dto: GenerateWeeklyDietDto,
    @Headers('x-correlation-id') incomingCorrelationId?: string,
  ): Promise<DietRun> {
    const correlationId = incomingCorrelationId ?? randomUUID();
    return this.batchesService.generateWeeklyDiet(id, dto, correlationId);
  }

  @Get(':id/projections')
  getProjection(
    @Param('id') id: string,
    @Query() query: GetProjectionQueryDto,
    @Headers('x-correlation-id') incomingCorrelationId?: string,
  ): Promise<BatchProjection> {
    const correlationId = incomingCorrelationId ?? randomUUID();
    return this.batchesService.getProjection(id, query, correlationId);
  }

  @Get(':id/sell-signal')
  getSellSignal(
    @Param('id') id: string,
    @Query() query: GetProjectionQueryDto,
    @Headers('x-correlation-id') incomingCorrelationId?: string,
  ): Promise<SellSignal> {
    const correlationId = incomingCorrelationId ?? randomUUID();
    return this.batchesService.getSellSignal(id, query, correlationId);
  }
}
