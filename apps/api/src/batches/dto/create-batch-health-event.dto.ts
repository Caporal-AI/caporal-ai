import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { HealthSeverity } from '../batch-health-event.entity';

export class CreateBatchHealthEventDto {
  @IsDateString()
  eventDate!: string;

  @IsString()
  eventType!: string;

  @IsIn([HealthSeverity.LOW, HealthSeverity.MEDIUM, HealthSeverity.HIGH])
  @IsOptional()
  severity?: HealthSeverity;

  @IsString()
  @IsOptional()
  notes?: string;
}
