import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBatchWeighInDto {
  @IsDateString()
  measuredAt!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(80)
  @Max(1500)
  averageWeightKg!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
