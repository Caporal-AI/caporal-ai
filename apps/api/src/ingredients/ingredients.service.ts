import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sanitizeNutrientsMap } from '../common/nutrients.util';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { CreateIngredientPriceDto } from './dto/create-ingredient-price.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { IngredientPrice } from './ingredient-price.entity';
import { Ingredient } from './ingredient.entity';

@Injectable()
export class IngredientsService {
  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(IngredientPrice)
    private readonly ingredientPriceRepository: Repository<IngredientPrice>,
  ) {}

  create(dto: CreateIngredientDto): Promise<Ingredient> {
    this.validateBounds(dto.minInclusionPct, dto.maxInclusionPct);
    const ingredient = this.ingredientRepository.create({
      ...dto,
      nutrientsJson: sanitizeNutrientsMap(dto.nutrientsJson),
    });
    return this.ingredientRepository.save(ingredient);
  }

  findAll(): Promise<Ingredient[]> {
    return this.ingredientRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Ingredient> {
    const ingredient = await this.ingredientRepository.findOne({ where: { id } });

    if (!ingredient) {
      throw new NotFoundException(`Ingredient ${id} not found`);
    }

    return ingredient;
  }

  async update(id: string, dto: UpdateIngredientDto): Promise<Ingredient> {
    const ingredient = await this.findOne(id);
    const nextMin = dto.minInclusionPct ?? ingredient.minInclusionPct;
    const nextMax = dto.maxInclusionPct ?? ingredient.maxInclusionPct;
    this.validateBounds(nextMin, nextMax);
    const nextNutrients = dto.nutrientsJson
      ? {
          ...(ingredient.nutrientsJson ?? {}),
          ...sanitizeNutrientsMap(dto.nutrientsJson),
        }
      : ingredient.nutrientsJson;
    Object.assign(ingredient, {
      ...dto,
      nutrientsJson: nextNutrients,
    });
    return this.ingredientRepository.save(ingredient);
  }

  async createPrice(
    ingredientId: string,
    dto: CreateIngredientPriceDto,
  ): Promise<IngredientPrice> {
    const ingredient = await this.findOne(ingredientId);
    const locationCode = dto.locationCode?.trim() ? dto.locationCode.trim() : null;

    const existing = await this.ingredientPriceRepository
      .createQueryBuilder('price')
      .where('price.ingredient_id = :ingredientId', { ingredientId })
      .andWhere('price.effective_date = :effectiveDate', { effectiveDate: dto.effectiveDate })
      .andWhere("COALESCE(price.location_code, '') = COALESCE(:locationCode, '')", {
        locationCode,
      })
      .getOne();

    if (existing) {
      existing.priceMxnPerKgAsFed = dto.priceMxnPerKgAsFed;
      existing.locationCode = locationCode;
      return this.ingredientPriceRepository.save(existing);
    }

    const price = this.ingredientPriceRepository.create({
      ...dto,
      locationCode,
      ingredient,
    });

    return this.ingredientPriceRepository.save(price);
  }

  async listPrices(ingredientId: string): Promise<IngredientPrice[]> {
    await this.findOne(ingredientId);

    return this.ingredientPriceRepository
      .createQueryBuilder('price')
      .where('price.ingredient_id = :ingredientId', { ingredientId })
      .orderBy('price.created_at', 'DESC')
      .addOrderBy('price.effective_date', 'DESC')
      .getMany();
  }

  private validateBounds(minPct: number, maxPct: number): void {
    if (minPct > maxPct) {
      throw new BadRequestException(
        `Invalid ingredient bounds: minInclusionPct (${minPct}) must be <= maxInclusionPct (${maxPct}).`,
      );
    }
  }
}
