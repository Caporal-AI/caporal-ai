import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { CreateIngredientPriceDto } from './dto/create-ingredient-price.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { IngredientPrice } from './ingredient-price.entity';
import { Ingredient } from './ingredient.entity';
import { IngredientsService } from './ingredients.service';

@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Post()
  create(@Body() dto: CreateIngredientDto): Promise<Ingredient> {
    return this.ingredientsService.create(dto);
  }

  @Get()
  findAll(): Promise<Ingredient[]> {
    return this.ingredientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Ingredient> {
    return this.ingredientsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIngredientDto): Promise<Ingredient> {
    return this.ingredientsService.update(id, dto);
  }

  @Post(':id/prices')
  createPrice(
    @Param('id') id: string,
    @Body() dto: CreateIngredientPriceDto,
  ): Promise<IngredientPrice> {
    return this.ingredientsService.createPrice(id, dto);
  }

  @Get(':id/prices')
  listPrices(@Param('id') id: string): Promise<IngredientPrice[]> {
    return this.ingredientsService.listPrices(id);
  }
}
