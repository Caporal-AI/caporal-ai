import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgenticAssistantDomain1700000003000 implements MigrationInterface {
  name = 'AddAgenticAssistantDomain1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assistant_message_role_enum') THEN
          CREATE TYPE assistant_message_role_enum AS ENUM ('USER', 'ASSISTANT');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assistant_tool_status_enum') THEN
          CREATE TYPE assistant_tool_status_enum AS ENUM ('SUCCESS', 'ERROR', 'SKIPPED');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS assistant_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        diet_run_id uuid REFERENCES diet_runs(id) ON DELETE SET NULL,
        batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
        title varchar(180) NOT NULL DEFAULT 'Sesion copiloto',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assistant_sessions_batch_created
      ON assistant_sessions(batch_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assistant_sessions_diet_run_created
      ON assistant_sessions(diet_run_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS assistant_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid NOT NULL REFERENCES assistant_sessions(id) ON DELETE CASCADE,
        role assistant_message_role_enum NOT NULL,
        mode varchar(40),
        content text NOT NULL,
        citations_json jsonb NOT NULL DEFAULT '[]'::jsonb,
        safety_flags_json jsonb NOT NULL DEFAULT '[]'::jsonb,
        simulation_diff_json jsonb,
        trace_json jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assistant_messages_session_created
      ON assistant_messages(session_id, created_at ASC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS assistant_tool_calls (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid NOT NULL REFERENCES assistant_sessions(id) ON DELETE CASCADE,
        message_id uuid REFERENCES assistant_messages(id) ON DELETE SET NULL,
        tool_name varchar(120) NOT NULL,
        status assistant_tool_status_enum NOT NULL,
        latency_ms integer NOT NULL DEFAULT 0,
        input_json jsonb NOT NULL DEFAULT '{}'::jsonb,
        output_json jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assistant_tool_calls_session_created
      ON assistant_tool_calls(session_id, created_at ASC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rag_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(240) NOT NULL UNIQUE,
        content text NOT NULL,
        source_type varchar(80) NOT NULL DEFAULT 'technical_note',
        region varchar(80),
        published_on date,
        metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rag_chunks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id uuid NOT NULL REFERENCES rag_sources(id) ON DELETE CASCADE,
        chunk_index integer NOT NULL,
        chunk_text text NOT NULL,
        token_count integer NOT NULL DEFAULT 0,
        metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
        embedding vector(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(source_id, chunk_index)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding
      ON rag_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 24);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_index
      ON rag_chunks(source_id, chunk_index);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rag_eval_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        run_name varchar(160) NOT NULL,
        result_json jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS rag_eval_runs');
    await queryRunner.query('DROP INDEX IF EXISTS idx_rag_chunks_source_index');
    await queryRunner.query('DROP INDEX IF EXISTS idx_rag_chunks_embedding');
    await queryRunner.query('DROP TABLE IF EXISTS rag_chunks');
    await queryRunner.query('DROP TABLE IF EXISTS rag_sources');

    await queryRunner.query('DROP INDEX IF EXISTS idx_assistant_tool_calls_session_created');
    await queryRunner.query('DROP TABLE IF EXISTS assistant_tool_calls');

    await queryRunner.query('DROP INDEX IF EXISTS idx_assistant_messages_session_created');
    await queryRunner.query('DROP TABLE IF EXISTS assistant_messages');

    await queryRunner.query('DROP INDEX IF EXISTS idx_assistant_sessions_diet_run_created');
    await queryRunner.query('DROP INDEX IF EXISTS idx_assistant_sessions_batch_created');
    await queryRunner.query('DROP TABLE IF EXISTS assistant_sessions');

    await queryRunner.query('DROP TYPE IF EXISTS assistant_tool_status_enum');
    await queryRunner.query('DROP TYPE IF EXISTS assistant_message_role_enum');
  }
}
