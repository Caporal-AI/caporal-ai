import { PartialType } from '@nestjs/mapped-types';
import { CreateAnimalProfileDto } from './create-animal-profile.dto';

export class UpdateAnimalProfileDto extends PartialType(CreateAnimalProfileDto) {}
