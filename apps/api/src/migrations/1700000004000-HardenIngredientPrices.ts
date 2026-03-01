import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenIngredientPrices1700000004000 implements MigrationInterface {
  name = 'HardenIngredientPrices1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY ingredient_id, effective_date, COALESCE(location_code, '')
            ORDER BY created_at DESC, id DESC
          ) AS row_num
        FROM ingredient_prices
      )
      DELETE FROM ingredient_prices target
      USING ranked
      WHERE target.id = ranked.id
        AND ranked.row_num > 1;
    `);

    await queryRunner.query(`
      DELETE FROM ingredient_prices
      WHERE price_mxn_per_kg_as_fed <= 0;
    `);

    await queryRunner.query(`
      ALTER TABLE ingredient_prices
      ADD CONSTRAINT chk_ingredient_prices_positive
      CHECK (price_mxn_per_kg_as_fed > 0);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ingredient_prices_effective_location
      ON ingredient_prices (ingredient_id, effective_date, COALESCE(location_code, ''));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_ingredient_prices_effective_location;
    `);

    await queryRunner.query(`
      ALTER TABLE ingredient_prices
      DROP CONSTRAINT IF EXISTS chk_ingredient_prices_positive;
    `);
  }
}
