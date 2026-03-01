import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class GetProjectionQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(7)
  @Max(180)
  @IsOptional()
  horizonDays?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(150)
  @IsOptional()
  salePriceMxnPerKg?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(120)
  @IsOptional()
  purchasePriceMxnPerKg?: number;
}
