import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AskAssistantDto {
  @IsString()
  dietRunId!: string;

  @IsString()
  question!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  topK?: number;
}
