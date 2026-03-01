import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { DietRun } from '../diets/diet-run.entity';
import { Batch } from './batch.entity';

@Entity({ name: 'batch_projections' })
export class BatchProjection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Batch, (batch) => batch.projections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch!: Batch;

  @RelationId((projection: BatchProjection) => projection.batch)
  batchId!: string;

  @ManyToOne(() => DietRun, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'diet_run_id' })
  dietRun!: DietRun | null;

  @RelationId((projection: BatchProjection) => projection.dietRun)
  dietRunId!: string | null;

  @Column({ name: 'horizon_days', type: 'integer' })
  horizonDays!: number;

  @Column({ name: 'projection_json', type: 'jsonb' })
  projectionJson!: Record<string, unknown>;

  @CreateDateColumn({ name: 'generated_at', type: 'timestamptz' })
  generatedAt!: Date;
}
