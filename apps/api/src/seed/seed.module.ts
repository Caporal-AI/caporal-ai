import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalProfile } from '../animal-profiles/animal-profile.entity';
import { Batch } from '../batches/batch.entity';
import { IngredientPrice } from '../ingredients/ingredient-price.entity';
import { Ingredient } from '../ingredients/ingredient.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ingredient, IngredientPrice, AnimalProfile, Batch])],
  providers: [SeedService],
})
export class SeedModule {}
