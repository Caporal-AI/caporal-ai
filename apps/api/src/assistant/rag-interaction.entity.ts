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

@Entity({ name: 'rag_interactions' })
export class RagInteraction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DietRun, (dietRun) => dietRun.interactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'diet_run_id' })
  dietRun!: DietRun;

  @RelationId((interaction: RagInteraction) => interaction.dietRun)
  dietRunId!: string;

  @Column({ type: 'text' })
  question!: string;

  @Column({ type: 'text' })
  answer!: string;

  @Column({ name: 'citations_json', type: 'jsonb', default: () => "'[]'::jsonb" })
  citationsJson!: Array<Record<string, unknown>>;

  @Column({ name: 'safety_flags_json', type: 'jsonb', default: () => "'[]'::jsonb" })
  safetyFlagsJson!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
