import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAgentSessionDto {
  @IsUUID()
  @IsOptional()
  dietRunId?: string;

  @IsUUID()
  @IsOptional()
  batchId?: string;

  @IsString()
  @IsOptional()
  title?: string;
}
