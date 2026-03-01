import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { AssistantSession } from './assistant-session.entity';

export enum AssistantMessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
}

export type AssistantMode = 'WHY' | 'WHAT_IF' | 'NEXT_BEST_ACTION';

@Entity({ name: 'assistant_messages' })
export class AssistantMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AssistantSession, (session) => session.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session!: AssistantSession;

  @RelationId((message: AssistantMessage) => message.session)
  sessionId!: string;

  @Column({
    type: 'enum',
    enum: AssistantMessageRole,
    enumName: 'assistant_message_role_enum',
  })
  role!: AssistantMessageRole;

  @Column({ type: 'varchar', length: 40, nullable: true })
  mode!: AssistantMode | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'citations_json', type: 'jsonb', default: () => "'[]'::jsonb" })
  citationsJson!: Array<Record<string, unknown>>;

  @Column({ name: 'safety_flags_json', type: 'jsonb', default: () => "'[]'::jsonb" })
  safetyFlagsJson!: string[];

  @Column({ name: 'simulation_diff_json', type: 'jsonb', nullable: true })
  simulationDiffJson!: Record<string, unknown> | null;

  @Column({ name: 'trace_json', type: 'jsonb', default: () => "'[]'::jsonb" })
  traceJson!: Array<Record<string, unknown>>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
