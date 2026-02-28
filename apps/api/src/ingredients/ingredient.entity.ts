import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IngredientPrice } from './ingredient-price.entity';
import { numericTransformer } from '../common/numeric.transformer';

@Entity({ name: 'ingredients' })
export class Ingredient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({
    name: 'dry_matter_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: numericTransformer,
  })
  dryMatterPct!: number;

  @Column({ name: 'nutrients_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  nutrientsJson!: Record<string, number>;

  @Column({
    name: 'min_inclusion_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  minInclusionPct!: number;

  @Column({
    name: 'max_inclusion_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 100,
    transformer: numericTransformer,
  })
  maxInclusionPct!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => IngredientPrice, (price) => price.ingredient)
  prices!: IngredientPrice[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
