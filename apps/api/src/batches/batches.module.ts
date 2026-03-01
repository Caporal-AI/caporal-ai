import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalProfile } from '../animal-profiles/animal-profile.entity';
import { ComputeModule } from '../compute/compute.module';
import { DietRun } from '../diets/diet-run.entity';
import { IngredientPrice } from '../ingredients/ingredient-price.entity';
import { Ingredient } from '../ingredients/ingredient.entity';
import { MetricsModule } from '../metrics/metrics.module';
import { BatchHealthEvent } from './batch-health-event.entity';
import { BatchProjection } from './batch-projection.entity';
import { BatchWeighIn } from './batch-weigh-in.entity';
import { Batch } from './batch.entity';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Batch,
      BatchWeighIn,
      BatchHealthEvent,
      BatchProjection,
      DietRun,
      AnimalProfile,
      Ingredient,
      IngredientPrice,
    ]),
    ComputeModule,
    MetricsModule,
  ],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
