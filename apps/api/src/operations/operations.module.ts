import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsModule } from '../metrics/metrics.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { RagEvalRun } from './rag-eval-run.entity';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([RagEvalRun]), MetricsModule],
  controllers: [OperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
