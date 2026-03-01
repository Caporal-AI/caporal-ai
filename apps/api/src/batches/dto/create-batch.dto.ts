import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBatchDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  breed?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  headCount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(50)
  @Max(1200)
  initialWeightKg!: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(120)
  @Max(1500)
  targetSaleWeightKg?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
