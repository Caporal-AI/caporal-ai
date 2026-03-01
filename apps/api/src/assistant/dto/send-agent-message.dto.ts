import { IsIn, IsOptional, IsString } from 'class-validator';

export class SendAgentMessageDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsIn(['AUTO', 'WHY', 'WHAT_IF', 'NEXT_BEST_ACTION'])
  mode?: 'AUTO' | 'WHY' | 'WHAT_IF' | 'NEXT_BEST_ACTION';
}
