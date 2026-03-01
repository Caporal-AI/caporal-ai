import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateIngredientPriceDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  priceMxnPerKgAsFed!: number;

  @IsDateString()
  effectiveDate!: string;

  @IsString()
  @IsOptional()
  locationCode?: string;
}
