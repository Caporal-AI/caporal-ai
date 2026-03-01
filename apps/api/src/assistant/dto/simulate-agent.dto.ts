import { IsNotEmpty, IsString } from 'class-validator';

export class SimulateAgentDto {
  @IsString()
  @IsNotEmpty()
  hypothesis!: string;
}
