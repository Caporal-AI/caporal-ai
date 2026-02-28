import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitMvpSchema1700000000000 implements MigrationInterface {
  name = 'InitMvpSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL UNIQUE,
        dry_matter_pct numeric(5,2) NOT NULL,
        nutrients_json jsonb NOT NULL DEFAULT '{}'::jsonb,
        min_inclusion_pct numeric(5,2) NOT NULL DEFAULT 0,
        max_inclusion_pct numeric(5,2) NOT NULL DEFAULT 100,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ingredient_prices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
        price_mxn_per_kg_as_fed numeric(12,4) NOT NULL,
        effective_date date NOT NULL,
        location_code varchar(50),
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ingredient_prices_ingredient_effective
      ON ingredient_prices(ingredient_id, effective_date DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS ingredient_prices');
    await queryRunner.query('DROP TABLE IF EXISTS ingredients');
  }
}
