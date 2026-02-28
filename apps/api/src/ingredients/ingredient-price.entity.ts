import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Ingredient } from './ingredient.entity';
import { numericTransformer } from '../common/numeric.transformer';

@Entity({ name: 'ingredient_prices' })
export class IngredientPrice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Ingredient, (ingredient) => ingredient.prices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: Ingredient;

  @RelationId((price: IngredientPrice) => price.ingredient)
  ingredientId!: string;

  @Column({
    name: 'price_mxn_per_kg_as_fed',
    type: 'decimal',
    precision: 12,
    scale: 4,
    transformer: numericTransformer,
  })
  priceMxnPerKgAsFed!: number;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate!: string;

  @Column({ name: 'location_code', type: 'varchar', length: 50, nullable: true })
  locationCode!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
