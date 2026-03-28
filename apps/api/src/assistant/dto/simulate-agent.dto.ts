import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SimulateAgentDto {
  @IsString()
  @IsNotEmpty()
  hypothesis!: string;

  @IsOptional()
  @IsIn(['AUTO', 'OPENAI', 'LOCAL', 'OFF'])
  llmMode?: 'AUTO' | 'OPENAI' | 'LOCAL' | 'OFF';
}
