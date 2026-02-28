import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AnimalProfile } from '../animal-profiles/animal-profile.entity';
import { RagInteraction } from '../assistant/rag-interaction.entity';
import { RagDocument } from '../assistant/rag-document.entity';
import { BatchHealthEvent } from '../batches/batch-health-event.entity';
import { BatchProjection } from '../batches/batch-projection.entity';
import { BatchWeighIn } from '../batches/batch-weigh-in.entity';
import { Batch } from '../batches/batch.entity';
import { DietRun } from '../diets/diet-run.entity';
import { IngredientPrice } from '../ingredients/ingredient-price.entity';
import { Ingredient } from '../ingredients/ingredient.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USER ?? 'caporal',
  password: process.env.DB_PASSWORD ?? 'caporal',
  database: process.env.DB_NAME ?? 'caporal',
  entities: [
    Ingredient,
    IngredientPrice,
    AnimalProfile,
    Batch,
    BatchWeighIn,
    BatchHealthEvent,
    BatchProjection,
    DietRun,
    RagInteraction,
    RagDocument,
  ],
  migrations: ['src/migrations/*.ts'],
});

export default dataSource;
