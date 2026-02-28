import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnimalProfile } from '../animal-profiles/animal-profile.entity';
import { Batch, BatchStatus } from '../batches/batch.entity';
import { IngredientPrice } from '../ingredients/ingredient-price.entity';
import { Ingredient } from '../ingredients/ingredient.entity';
import { ENGORDA_CONSTRAINTS, SEED_INGREDIENTS } from './seed.constants';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(IngredientPrice)
    private readonly ingredientPriceRepository: Repository<IngredientPrice>,
    @InjectRepository(AnimalProfile)
    private readonly animalProfileRepository: Repository<AnimalProfile>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedIngredientsAndPrices();
    await this.seedAnimalProfile();
    await this.seedBatch();
  }

  private async seedIngredientsAndPrices(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    for (const item of SEED_INGREDIENTS) {
      let ingredient = await this.ingredientRepository.findOne({ where: { name: item.name } });

      if (!ingredient) {
        ingredient = await this.ingredientRepository.save(
          this.ingredientRepository.create({
            name: item.name,
            dryMatterPct: item.dryMatterPct,
            nutrientsJson: item.nutrientsJson,
            minInclusionPct: item.minInclusionPct,
            maxInclusionPct: item.maxInclusionPct,
            isActive: true,
          }),
        );
      }

      const existingPrice = await this.ingredientPriceRepository.findOne({
        where: {
          ingredient: { id: ingredient.id },
          effectiveDate: today,
        },
      });

      if (!existingPrice) {
        await this.ingredientPriceRepository.save(
          this.ingredientPriceRepository.create({
            ingredient,
            effectiveDate: today,
            priceMxnPerKgAsFed: item.priceMxnPerKgAsFed,
            locationCode: 'MX-NL',
          }),
        );
      }
    }

    this.logger.log(`Seeded ${SEED_INGREDIENTS.length} ingredients with current prices.`);
  }

  private async seedAnimalProfile(): Promise<void> {
    const existing = await this.animalProfileRepository.findOne({ where: { name: 'Engorda feedlot' } });

    if (existing) {
      return;
    }

    await this.animalProfileRepository.save(
      this.animalProfileRepository.create({
        name: 'Engorda feedlot',
        intakeDmKgPerDay: 10.2,
        constraintsJson: ENGORDA_CONSTRAINTS,
      }),
    );

    this.logger.log('Seeded Engorda feedlot profile.');
  }

  private async seedBatch(): Promise<void> {
    const existing = await this.batchRepository.findOne({ where: { name: 'Lote Demo Bajio' } });
    if (existing) {
      return;
    }

    const today = new Date();
    const startDate = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await this.batchRepository.save(
      this.batchRepository.create({
        name: 'Lote Demo Bajio',
        breed: 'Cruzado',
        headCount: 120,
        initialWeightKg: 330,
        targetSaleWeightKg: 520,
        startDate,
        status: BatchStatus.ACTIVE,
        notes: 'Lote semilla para flujo semanal y proyecciones.',
      }),
    );

    this.logger.log('Seeded demo batch for weekly workflow.');
  }
}
