import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'rag_eval_runs' })
export class RagEvalRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'run_name', type: 'varchar', length: 160 })
  runName!: string;

  @Column({ name: 'result_json', type: 'jsonb' })
  resultJson!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
