import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchProjection } from '../batches/batch-projection.entity';
import { Batch } from '../batches/batch.entity';
import { ComputeModule } from '../compute/compute.module';
import { DietRun } from '../diets/diet-run.entity';
import { IngredientPrice } from '../ingredients/ingredient-price.entity';
import { Ingredient } from '../ingredients/ingredient.entity';
import { MetricsModule } from '../metrics/metrics.module';
import { AssistantController } from './assistant.controller';
import { AssistantMessage } from './assistant-message.entity';
import { AssistantSession } from './assistant-session.entity';
import { AssistantService } from './assistant.service';
import { AssistantToolCall } from './assistant-tool-call.entity';
import { RagInteraction } from './rag-interaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DietRun,
      RagInteraction,
      AssistantSession,
      AssistantMessage,
      AssistantToolCall,
      Batch,
      BatchProjection,
      Ingredient,
      IngredientPrice,
    ]),
    ComputeModule,
    MetricsModule,
  ],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
