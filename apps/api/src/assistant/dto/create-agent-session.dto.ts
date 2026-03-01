import { IsOptional, IsString } from 'class-validator';

export class CreateAgentSessionDto {
  @IsString()
  @IsOptional()
  dietRunId?: string;

  @IsString()
  @IsOptional()
  batchId?: string;

  @IsString()
  @IsOptional()
  title?: string;
}
