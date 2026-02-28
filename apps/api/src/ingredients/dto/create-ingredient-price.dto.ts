import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateIngredientPriceDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMxnPerKgAsFed!: number;

  @IsDateString()
  effectiveDate!: string;

  @IsString()
  @IsOptional()
  locationCode?: string;
}
