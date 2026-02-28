import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const ingredient = this.ingredientRepository.create(dto);
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
    Object.assign(ingredient, dto);
    return this.ingredientRepository.save(ingredient);
  }

  async createPrice(
    ingredientId: string,
    dto: CreateIngredientPriceDto,
  ): Promise<IngredientPrice> {
    const ingredient = await this.findOne(ingredientId);
    const price = this.ingredientPriceRepository.create({
      ...dto,
      locationCode: dto.locationCode ?? null,
      ingredient,
    });

    return this.ingredientPriceRepository.save(price);
  }

  async listPrices(ingredientId: string): Promise<IngredientPrice[]> {
    await this.findOne(ingredientId);

    return this.ingredientPriceRepository.find({
      where: { ingredient: { id: ingredientId } },
      order: { effectiveDate: 'DESC', createdAt: 'DESC' },
    });
  }

  private validateBounds(minPct: number, maxPct: number): void {
    if (minPct > maxPct) {
      throw new BadRequestException(
        `Invalid ingredient bounds: minInclusionPct (${minPct}) must be <= maxInclusionPct (${maxPct}).`,
      );
    }
  }
}
