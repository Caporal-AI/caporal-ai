import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { AssistantMessage } from './assistant-message.entity';
import { AssistantSession } from './assistant-session.entity';

export enum AssistantToolStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  SKIPPED = 'SKIPPED',
}

@Entity({ name: 'assistant_tool_calls' })
export class AssistantToolCall {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AssistantSession, (session) => session.toolCalls, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session!: AssistantSession;

  @RelationId((toolCall: AssistantToolCall) => toolCall.session)
  sessionId!: string;

  @ManyToOne(() => AssistantMessage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'message_id' })
  message!: AssistantMessage | null;

  @RelationId((toolCall: AssistantToolCall) => toolCall.message)
  messageId!: string | null;

  @Column({ name: 'tool_name', type: 'varchar', length: 120 })
  toolName!: string;

  @Column({
    type: 'enum',
    enum: AssistantToolStatus,
    enumName: 'assistant_tool_status_enum',
  })
  status!: AssistantToolStatus;

  @Column({ name: 'latency_ms', type: 'integer', default: 0 })
  latencyMs!: number;

  @Column({ name: 'input_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  inputJson!: Record<string, unknown>;

  @Column({ name: 'output_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  outputJson!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
