import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComputeModule } from '../compute/compute.module';
import { DietRun } from '../diets/diet-run.entity';
import { MetricsModule } from '../metrics/metrics.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { RagInteraction } from './rag-interaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DietRun, RagInteraction]), ComputeModule, MetricsModule],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
