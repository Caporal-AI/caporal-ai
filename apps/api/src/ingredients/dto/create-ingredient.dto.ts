import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  dryMatterPct!: number;

  @IsObject()
  @IsOptional()
  nutrientsJson: Record<string, number> = {};

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minInclusionPct = 0;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxInclusionPct = 100;

  @IsBoolean()
  @IsOptional()
  isActive = true;
}
