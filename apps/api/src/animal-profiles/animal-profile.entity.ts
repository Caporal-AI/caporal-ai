import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { DietRun } from '../diets/diet-run.entity';

export interface AnimalConstraint {
  code: string;
  min?: number;
  max?: number;
  unit: 'fraction_dm' | 'pct_dm' | 'kg_per_day' | 'per_kg_dm';
  label?: string;
}

@Entity({ name: 'animal_profiles' })
export class AnimalProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({
    name: 'intake_dm_kg_per_day',
    type: 'decimal',
    precision: 10,
    scale: 4,
    transformer: numericTransformer,
  })
  intakeDmKgPerDay!: number;

  @Column({ name: 'constraints_json', type: 'jsonb', default: () => "'[]'::jsonb" })
  constraintsJson!: AnimalConstraint[];

  @OneToMany(() => DietRun, (dietRun) => dietRun.animalProfile)
  dietRuns!: DietRun[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
