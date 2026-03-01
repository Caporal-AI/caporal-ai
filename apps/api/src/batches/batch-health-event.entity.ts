import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Batch } from './batch.entity';

export enum HealthSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Entity({ name: 'batch_health_events' })
export class BatchHealthEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Batch, (batch) => batch.healthEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch!: Batch;

  @RelationId((event: BatchHealthEvent) => event.batch)
  batchId!: string;

  @Column({ name: 'event_date', type: 'date' })
  eventDate!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType!: string;

  @Column({
    name: 'severity',
    type: 'enum',
    enum: HealthSeverity,
    enumName: 'batch_health_severity_enum',
    default: HealthSeverity.MEDIUM,
  })
  severity!: HealthSeverity;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
