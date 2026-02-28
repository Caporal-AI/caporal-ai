import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalProfile } from './animal-profile.entity';
import { AnimalProfilesController } from './animal-profiles.controller';
import { AnimalProfilesService } from './animal-profiles.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnimalProfile])],
  controllers: [AnimalProfilesController],
  providers: [AnimalProfilesService],
  exports: [AnimalProfilesService],
})
export class AnimalProfilesModule {}
