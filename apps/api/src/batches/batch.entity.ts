import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { BatchHealthEvent } from './batch-health-event.entity';
import { BatchProjection } from './batch-projection.entity';
import { BatchWeighIn } from './batch-weigh-in.entity';
import { DietRun } from '../diets/diet-run.entity';

export enum BatchStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

@Entity({ name: 'batches' })
export class Batch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  breed!: string | null;

  @Column({
    name: 'head_count',
    type: 'integer',
  })
  headCount!: number;

  @Column({
    name: 'initial_weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    transformer: numericTransformer,
  })
  initialWeightKg!: number;

  @Column({
    name: 'target_sale_weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  targetSaleWeightKg!: number | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: BatchStatus,
    enumName: 'batch_status_enum',
    default: BatchStatus.ACTIVE,
  })
  status!: BatchStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => BatchWeighIn, (weighIn) => weighIn.batch)
  weighIns!: BatchWeighIn[];

  @OneToMany(() => BatchHealthEvent, (event) => event.batch)
  healthEvents!: BatchHealthEvent[];

  @OneToMany(() => BatchProjection, (projection) => projection.batch)
  projections!: BatchProjection[];

  @OneToMany(() => DietRun, (dietRun) => dietRun.batch)
  dietRuns!: DietRun[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
