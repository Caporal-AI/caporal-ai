# Caporal AI - Codebase Guide (45 minutes)

Objective: stop treating the system as a black box and understand exactly where each behavior lives.

## What you will understand at the end

1. How the end-to-end flow works: UI -> API -> Compute -> DB -> UI.
2. Where the LP solver is implemented and how hard constraints are enforced.
3. Where RAG is seeded, chunked, retrieved, and evaluated.
4. How the agentic copilot decides mode and invokes tools.
5. How historical prices are stored and how the operational "current price" is selected.

---

## 0-5 min: System map

Read:

1. `README.md`
2. `infra/docker-compose.yml`
3. `infra/nginx.conf`

Expected understanding:

1. Services running in containers (`web`, `api`, `compute`, `postgres`, `nginx`).
2. Port map and network boundaries.
3. Gateway routing (`/`, `/api`, `/compute`).

---

## 5-10 min: Shared contracts

Read:

1. `packages/contracts/src/index.ts`

Focus on:

1. `OptimizeRequest`, `OptimizeResponse`
2. `AskRequest`, `AskResponse`
3. `AgentRespondRequest`, `AgentRespondResponse`
4. `ProjectionRequest`, `ProjectionResponse`

Expected understanding:

1. Exact payloads crossing API <-> Compute.
2. Which fields are optional vs mandatory.
3. Which objects are persisted as snapshots.

---

## 10-16 min: API bootstrap and compute adapter

Read:

1. `apps/api/src/main.ts`
2. `apps/api/src/app.module.ts`
3. `apps/api/src/compute/fastapi-compute-http.adapter.ts`

Expected understanding:

1. Global prefix (`/api`), validation pipe, CORS.
2. Correlation-id middleware behavior.
3. Timeout/retry/circuit-breaker behavior for Compute calls.

---

## 16-23 min: Diet and price core

Read:

1. `apps/api/src/ingredients/ingredients.controller.ts`
2. `apps/api/src/ingredients/ingredients.service.ts`
3. `apps/api/src/diets/diets.service.ts`

Expected understanding:

1. Historical pricing model in `ingredient_prices`.
2. Same day/location price overwrite behavior.
3. How latest operational price is selected for optimization.
4. How `OptimizeRequest` is assembled and `DietRun` snapshots are persisted.

Checkpoint:

1. Can you explain why multiple rows for one ingredient can be valid historically?
2. Can you explain what row is used operationally for solver inputs?

---

## 23-29 min: Batch domain and weekly operation

Read:

1. `apps/api/src/batches/batches.controller.ts`
2. `apps/api/src/batches/batches.service.ts`

Expected understanding:

1. Batch lifecycle: create/update, weigh-ins, health events.
2. Weekly plan generation from one feasible optimize response.
3. Projection generation and fallback behavior.
4. Sell signal language normalization.

---

## 29-35 min: Compute internals (solver + projection)

Read:

1. `services/compute/app/api/optimize.py`
2. `services/compute/app/core/solver.py`
3. `services/compute/app/api/projection.py`
4. `services/compute/app/core/projection.py`

Expected understanding:

1. LP decision variables (`kg DM/head/day`) and objective function.
2. Constraint building and infeasibility hint generation.
3. Conversion from DM basis to as-fed output.
4. Projection model path (`xgboost` when available, linear fallback otherwise).
5. Sell signal logic from margin time series.

---

## 35-41 min: RAG and Agentic layer

Read:

1. `services/compute/app/main.py`
2. `services/compute/app/core/rag_store.py`
3. `services/compute/app/core/rag_seed_data.py`
4. `services/compute/app/api/rag.py`
5. `services/compute/app/api/ask.py`
6. `services/compute/app/api/agent.py`
7. `services/compute/app/core/agent.py`
8. `services/compute/app/core/llm_client.py`

Expected understanding:

1. Startup bootstrap: schema + seed corpus loading.
2. Current RAG corpus source (seed notes, not auto-ingested thesis docs).
3. Chunking, embedding, hybrid retrieval and reranking.
4. Agent modes (`WHY`, `WHAT_IF`, `NEXT_BEST_ACTION`) and tool invocation.
5. Optional OpenAI rewriting behavior controlled by env vars.

Checkpoint:

1. Can you state exactly what corpus is ingested by default?
2. Can you identify the endpoint to ingest external docs?

---

## 41-45 min: Frontend orchestration and UX mapping

Read:

1. `apps/web/src/App.tsx`
2. `apps/web/src/api/caporalApi.ts`
3. `apps/web/src/screens/IngredientsScreen.tsx`
4. `apps/web/src/screens/GenerateDietScreen.tsx`
5. `apps/web/src/screens/BatchWorkflowScreen.tsx`
6. `apps/web/src/screens/AssistantScreen.tsx`
7. `apps/web/src/ui/labels.ts`

Expected understanding:

1. Which screen calls which endpoint.
2. Which response fields are displayed to non-expert users.
3. How citations, safety flags, simulation diff, and tool trace are rendered.
4. How Spanish labeling is enforced in the UI.

---

## Quick architecture anchors (for memory)

1. API is the orchestrator and persistence boundary.
2. Compute is the deterministic/AI engine.
3. Contracts are the interface truth.
4. Postgres stores both business snapshots and vector retrieval artifacts.
5. UI is mostly a thin flow/controller layer over API endpoints.

---

## Recommended next reading (optional, +15 min)

1. `apps/api/src/migrations/*` for schema evolution.
2. `apps/api/src/seed/*` for initial domain defaults.
3. `services/compute/tests/*` and `apps/api/test/*` for behavior expectations.
