import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDietAndRagTables1700000001000 implements MigrationInterface {
  name = 'AddDietAndRagTables1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS animal_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL UNIQUE,
        intake_dm_kg_per_day numeric(10,4) NOT NULL,
        constraints_json jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'diet_runs_status_enum') THEN
          CREATE TYPE diet_runs_status_enum AS ENUM ('SUCCESS', 'INFEASIBLE', 'ERROR');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS diet_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar(120),
        animal_profile_id uuid NOT NULL REFERENCES animal_profiles(id) ON DELETE RESTRICT,
        inputs_snapshot_json jsonb NOT NULL,
        solution_snapshot_json jsonb NOT NULL,
        status diet_runs_status_enum NOT NULL DEFAULT 'ERROR',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_diet_runs_profile_created
      ON diet_runs(animal_profile_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rag_interactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        diet_run_id uuid NOT NULL REFERENCES diet_runs(id) ON DELETE CASCADE,
        question text NOT NULL,
        answer text NOT NULL,
        citations_json jsonb NOT NULL DEFAULT '[]'::jsonb,
        safety_flags_json jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rag_interactions_diet_run_created
      ON rag_interactions(diet_run_id, created_at ASC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rag_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(180) NOT NULL UNIQUE,
        content text NOT NULL,
        snippet varchar(2000),
        embedding vector(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding
      ON rag_documents USING ivfflat (embedding vector_l2_ops) WITH (lists = 16);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_rag_documents_embedding');
    await queryRunner.query('DROP TABLE IF EXISTS rag_documents');

    await queryRunner.query('DROP INDEX IF EXISTS idx_rag_interactions_diet_run_created');
    await queryRunner.query('DROP TABLE IF EXISTS rag_interactions');

    await queryRunner.query('DROP INDEX IF EXISTS idx_diet_runs_profile_created');
    await queryRunner.query('DROP TABLE IF EXISTS diet_runs');

    await queryRunner.query('DROP TYPE IF EXISTS diet_runs_status_enum');

    await queryRunner.query('DROP TABLE IF EXISTS animal_profiles');
  }
}
