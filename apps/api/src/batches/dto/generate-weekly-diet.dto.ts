import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateWeeklyDietDto {
  @IsString()
  animalProfileId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSolveMs?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(7)
  @Max(180)
  @IsOptional()
  horizonDays?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(150)
  @IsOptional()
  salePriceMxnPerKg?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(120)
  @IsOptional()
  purchasePriceMxnPerKg?: number;
}
