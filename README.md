# Caporal AI MVP

MVP end-to-end para formulacion de dietas de engorda bovina:

- `apps/api`: NestJS + TypeORM + Postgres
- `services/compute`: FastAPI + SciPy HiGHS + RAG (pgvector)
- `apps/web`: React + TypeScript + MUI + RTK Query
- `packages/contracts`: contratos compartidos (TS + JSON schema)
- `infra`: Docker Compose + Nginx + init DB

Incluye flujo extendido de lotes:

- CRUD de lotes (`batches`)
- pesajes y eventos sanitarios
- generacion de plan semanal por lote
- proyeccion economica + senal de venta (modelo ML con fallback lineal)

## Estructura

```text
/apps/api
/apps/web
/services/compute
/packages/contracts
/infra
```

## Levantar entorno

```bash
docker compose -f infra/docker-compose.yml up --build -d
```

Servicios:

- Postgres (host): `localhost:5433`
- API: `http://localhost:3000`
- Compute: `http://localhost:8000`
- Web (Vite): `http://localhost:5174`
- Nginx gateway: `http://localhost`

Health:

- `GET /api/health` (API)
- `GET /health` (Compute)
- `GET /api/metrics` (Métricas MVP)

## Modelo MVP

- `Ingredient`
- `IngredientPrice`
- `AnimalProfile`
- `DietRun`
- `Batch`
- `BatchWeighIn`
- `BatchHealthEvent`
- `BatchProjection`
- `RagInteraction`
- `RagDocument` (pgvector `vector(64)`)

Migraciones principales:

- `apps/api/src/migrations/1700000000000-InitMvpSchema.ts`
- `apps/api/src/migrations/1700000001000-AddDietAndRagTables.ts`
- `apps/api/src/migrations/1700000002000-AddBatchDomain.ts`

## Endpoints principales

### API (NestJS)

- `POST /api/diets/generate`
- `POST /api/assistant/ask`
- `GET /api/profiles`
- `GET /api/ingredients`
- `PATCH /api/ingredients/:id`
- `POST /api/ingredients/:id/prices`
- `POST /api/batches`
- `GET /api/batches`
- `PATCH /api/batches/:id`
- `POST /api/batches/:id/weigh-ins`
- `POST /api/batches/:id/health-events`
- `POST /api/batches/:id/diets/generate-weekly`
- `GET /api/batches/:id/projections`
- `GET /api/batches/:id/sell-signal`

### Compute (FastAPI)

- `POST /v1/optimize` (LP solver real con `linprog(method="highs")`)
- `POST /v1/ask` (RAG con citas + guardrails)
- `POST /v1/rag/documents/upsert`
- `POST /v1/project` (proyeccion de peso/margen con fallback lineal)

## Seed automático

En arranque del API (`SeedService`):

- 16 ingredientes con nutrientes y bounds
- precios vigentes
- perfil `Engorda feedlot`
- lote `Lote Demo Bajio`

En arranque de compute:

- inicializa `rag_documents`
- carga corpus RAG semilla (24 docs)

## Pruebas

### Compute

```bash
docker compose -f infra/docker-compose.yml exec -T compute pytest -q
```

### API

```bash
docker compose -f infra/docker-compose.yml exec -T api npm test -- --runInBand
```

### Build checks

```bash
docker compose -f infra/docker-compose.yml exec -T api npm run build
docker compose -f infra/docker-compose.yml exec -T web npm run build
```
