import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AnimalProfile } from './animal-profile.entity';
import { AnimalProfilesService } from './animal-profiles.service';
import { CreateAnimalProfileDto } from './dto/create-animal-profile.dto';
import { UpdateAnimalProfileDto } from './dto/update-animal-profile.dto';

@Controller('profiles')
export class AnimalProfilesController {
  constructor(private readonly animalProfilesService: AnimalProfilesService) {}

  @Post()
  create(@Body() dto: CreateAnimalProfileDto): Promise<AnimalProfile> {
    return this.animalProfilesService.create(dto);
  }

  @Get()
  findAll(): Promise<AnimalProfile[]> {
    return this.animalProfilesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<AnimalProfile> {
    return this.animalProfilesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAnimalProfileDto): Promise<AnimalProfile> {
    return this.animalProfilesService.update(id, dto);
  }
}
