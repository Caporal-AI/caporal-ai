import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAnimalProfileDto } from './dto/create-animal-profile.dto';
import { UpdateAnimalProfileDto } from './dto/update-animal-profile.dto';
import { AnimalConstraint, AnimalProfile } from './animal-profile.entity';

@Injectable()
export class AnimalProfilesService {
  constructor(
    @InjectRepository(AnimalProfile)
    private readonly animalProfileRepository: Repository<AnimalProfile>,
  ) {}

  async create(dto: CreateAnimalProfileDto): Promise<AnimalProfile> {
    this.validateConstraints(dto.constraintsJson);
    const profile = this.animalProfileRepository.create(dto);
    return this.animalProfileRepository.save(profile);
  }

  findAll(): Promise<AnimalProfile[]> {
    return this.animalProfileRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<AnimalProfile> {
    const profile = await this.animalProfileRepository.findOne({ where: { id } });

    if (!profile) {
      throw new NotFoundException(`AnimalProfile ${id} not found`);
    }

    return profile;
  }

  async update(id: string, dto: UpdateAnimalProfileDto): Promise<AnimalProfile> {
    const profile = await this.findOne(id);

    if (dto.constraintsJson) {
      this.validateConstraints(dto.constraintsJson);
    }

    Object.assign(profile, dto);
    return this.animalProfileRepository.save(profile);
  }

  private validateConstraints(constraints: AnimalConstraint[]): void {
    for (const constraint of constraints) {
      if (constraint.min !== undefined && constraint.max !== undefined && constraint.min > constraint.max) {
        throw new BadRequestException(
          `Constraint ${constraint.code} has min (${constraint.min}) greater than max (${constraint.max}).`,
        );
      }

      if (constraint.unit === 'fraction_dm') {
        if (constraint.min !== undefined && (constraint.min < 0 || constraint.min > 1)) {
          throw new BadRequestException(
            `Constraint ${constraint.code} min must be in [0, 1] for fraction_dm unit.`,
          );
        }

        if (constraint.max !== undefined && (constraint.max < 0 || constraint.max > 1)) {
          throw new BadRequestException(
            `Constraint ${constraint.code} max must be in [0, 1] for fraction_dm unit.`,
          );
        }
      }

      if (constraint.unit === 'pct_dm') {
        if (constraint.min !== undefined && (constraint.min < 0 || constraint.min > 100)) {
          throw new BadRequestException(
            `Constraint ${constraint.code} min must be in [0, 100] for pct_dm unit.`,
          );
        }

        if (constraint.max !== undefined && (constraint.max < 0 || constraint.max > 100)) {
          throw new BadRequestException(
            `Constraint ${constraint.code} max must be in [0, 100] for pct_dm unit.`,
          );
        }
      }
    }
  }
}
