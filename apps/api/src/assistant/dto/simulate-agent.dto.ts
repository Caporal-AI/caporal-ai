import { IsString } from 'class-validator';

export class SimulateAgentDto {
  @IsString()
  hypothesis!: string;
}
