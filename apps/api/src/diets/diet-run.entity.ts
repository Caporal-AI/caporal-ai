import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { AnimalProfile } from '../animal-profiles/animal-profile.entity';
import { RagInteraction } from '../assistant/rag-interaction.entity';
import { Batch } from '../batches/batch.entity';

export enum DietRunStatus {
  SUCCESS = 'SUCCESS',
  INFEASIBLE = 'INFEASIBLE',
  ERROR = 'ERROR',
}

@Entity({ name: 'diet_runs' })
export class DietRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 120, nullable: true })
  userId!: string | null;

  @ManyToOne(() => AnimalProfile, (animalProfile) => animalProfile.dietRuns, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'animal_profile_id' })
  animalProfile!: AnimalProfile;

  @RelationId((dietRun: DietRun) => dietRun.animalProfile)
  animalProfileId!: string;

  @ManyToOne(() => Batch, (batch) => batch.dietRuns, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'batch_id' })
  batch!: Batch | null;

  @RelationId((dietRun: DietRun) => dietRun.batch)
  batchId!: string | null;

  @Column({ name: 'inputs_snapshot_json', type: 'jsonb' })
  inputsSnapshotJson!: Record<string, unknown>;

  @Column({ name: 'solution_snapshot_json', type: 'jsonb' })
  solutionSnapshotJson!: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: DietRunStatus,
    enumName: 'diet_runs_status_enum',
    default: DietRunStatus.ERROR,
  })
  status!: DietRunStatus;

  @OneToMany(() => RagInteraction, (interaction) => interaction.dietRun)
  interactions!: RagInteraction[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
