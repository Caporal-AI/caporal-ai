import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBatchDomain1700000002000 implements MigrationInterface {
  name = 'AddBatchDomain1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_status_enum') THEN
          CREATE TYPE batch_status_enum AS ENUM ('ACTIVE', 'CLOSED');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_health_severity_enum') THEN
          CREATE TYPE batch_health_severity_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL UNIQUE,
        breed varchar(120),
        head_count integer NOT NULL,
        initial_weight_kg numeric(10,3) NOT NULL,
        target_sale_weight_kg numeric(10,3),
        start_date date,
        status batch_status_enum NOT NULL DEFAULT 'ACTIVE',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS batch_weigh_ins (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        measured_at date NOT NULL,
        average_weight_kg numeric(10,3) NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_batch_weigh_ins_batch_measured
      ON batch_weigh_ins(batch_id, measured_at DESC, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS batch_health_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        event_date date NOT NULL,
        event_type varchar(100) NOT NULL,
        severity batch_health_severity_enum NOT NULL DEFAULT 'MEDIUM',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_batch_health_events_batch_date
      ON batch_health_events(batch_id, event_date DESC, created_at DESC);
    `);

    await queryRunner.query(`
      ALTER TABLE diet_runs
      ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_diet_runs_batch_created
      ON diet_runs(batch_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS batch_projections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        diet_run_id uuid REFERENCES diet_runs(id) ON DELETE SET NULL,
        horizon_days integer NOT NULL,
        projection_json jsonb NOT NULL,
        generated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_batch_projections_batch_generated
      ON batch_projections(batch_id, generated_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_batch_projections_batch_generated');
    await queryRunner.query('DROP TABLE IF EXISTS batch_projections');

    await queryRunner.query('DROP INDEX IF EXISTS idx_diet_runs_batch_created');
    await queryRunner.query('ALTER TABLE diet_runs DROP COLUMN IF EXISTS batch_id');

    await queryRunner.query('DROP INDEX IF EXISTS idx_batch_health_events_batch_date');
    await queryRunner.query('DROP TABLE IF EXISTS batch_health_events');

    await queryRunner.query('DROP INDEX IF EXISTS idx_batch_weigh_ins_batch_measured');
    await queryRunner.query('DROP TABLE IF EXISTS batch_weigh_ins');

    await queryRunner.query('DROP TABLE IF EXISTS batches');

    await queryRunner.query('DROP TYPE IF EXISTS batch_health_severity_enum');
    await queryRunner.query('DROP TYPE IF EXISTS batch_status_enum');
  }
}
