import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { Batch } from './batch.entity';

@Entity({ name: 'batch_weigh_ins' })
export class BatchWeighIn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Batch, (batch) => batch.weighIns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch!: Batch;

  @RelationId((weighIn: BatchWeighIn) => weighIn.batch)
  batchId!: string;

  @Column({ name: 'measured_at', type: 'date' })
  measuredAt!: string;

  @Column({
    name: 'average_weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    transformer: numericTransformer,
  })
  averageWeightKg!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
