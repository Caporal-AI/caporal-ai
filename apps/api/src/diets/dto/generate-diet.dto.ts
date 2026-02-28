import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GenerateDietDto {
  @IsString()
  animalProfileId!: string;

  @IsString()
  @IsOptional()
  batchId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSolveMs?: number;
}
