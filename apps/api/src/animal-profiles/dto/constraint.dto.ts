import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class ConstraintDto {
  @IsString()
  code!: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  min?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  max?: number;

  @IsIn(['fraction_dm', 'pct_dm', 'kg_per_day', 'per_kg_dm'])
  unit!: 'fraction_dm' | 'pct_dm' | 'kg_per_day' | 'per_kg_dm';

  @IsString()
  @IsOptional()
  label?: string;
}
