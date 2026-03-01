import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendAgentMessageDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsIn(['AUTO', 'WHY', 'WHAT_IF', 'NEXT_BEST_ACTION'])
  mode?: 'AUTO' | 'WHY' | 'WHAT_IF' | 'NEXT_BEST_ACTION';
}
