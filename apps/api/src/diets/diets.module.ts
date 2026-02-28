import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalProfile } from '../animal-profiles/animal-profile.entity';
import { Batch } from '../batches/batch.entity';
import { ComputeModule } from '../compute/compute.module';
import { IngredientPrice } from '../ingredients/ingredient-price.entity';
import { Ingredient } from '../ingredients/ingredient.entity';
import { MetricsModule } from '../metrics/metrics.module';
import { DietRun } from './diet-run.entity';
import { DietsController } from './diets.controller';
import { DietsService } from './diets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DietRun, AnimalProfile, Ingredient, IngredientPrice, Batch]),
    ComputeModule,
    MetricsModule,
  ],
  controllers: [DietsController],
  providers: [DietsService],
  exports: [DietsService],
})
export class DietsModule {}
