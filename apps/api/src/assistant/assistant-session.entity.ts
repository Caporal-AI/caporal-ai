import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { Batch } from '../batches/batch.entity';
import { DietRun } from '../diets/diet-run.entity';
import { AssistantMessage } from './assistant-message.entity';
import { AssistantToolCall } from './assistant-tool-call.entity';

@Entity({ name: 'assistant_sessions' })
export class AssistantSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DietRun, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'diet_run_id' })
  dietRun!: DietRun | null;

  @RelationId((session: AssistantSession) => session.dietRun)
  dietRunId!: string | null;

  @ManyToOne(() => Batch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'batch_id' })
  batch!: Batch | null;

  @RelationId((session: AssistantSession) => session.batch)
  batchId!: string | null;

  @Column({ type: 'varchar', length: 180, default: 'Sesion copiloto' })
  title!: string;

  @OneToMany(() => AssistantMessage, (message) => message.session)
  messages!: AssistantMessage[];

  @OneToMany(() => AssistantToolCall, (toolCall) => toolCall.session)
  toolCalls!: AssistantToolCall[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
