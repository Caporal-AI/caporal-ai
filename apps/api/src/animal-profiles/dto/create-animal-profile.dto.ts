import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ConstraintDto } from './constraint.dto';

export class CreateAnimalProfileDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  intakeDmKgPerDay!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConstraintDto)
  constraintsJson!: ConstraintDto[];
}
