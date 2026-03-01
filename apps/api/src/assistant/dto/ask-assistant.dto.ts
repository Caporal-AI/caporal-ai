import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AskAssistantDto {
  @IsUUID()
  dietRunId!: string;

  @IsString()
  @IsNotEmpty()
  question!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  topK?: number;
}
