import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { BatchStatus } from '../batch.entity';
import { CreateBatchDto } from './create-batch.dto';

export class UpdateBatchDto extends PartialType(CreateBatchDto) {
  @IsIn([BatchStatus.ACTIVE, BatchStatus.CLOSED])
  @IsOptional()
  status?: BatchStatus;
}
