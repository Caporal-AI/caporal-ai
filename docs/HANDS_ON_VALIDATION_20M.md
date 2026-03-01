# Caporal AI - Hands-on Validation (20 minutes)

Objective: run a fast, reproducible operational test of the full stack and validate Solver + RAG + Agentic integration.

Assumptions:

1. Stack is up: `docker compose -f infra/docker-compose.yml up -d`
2. You have `curl` installed.
3. Optional but recommended: `jq` installed for easier JSON parsing.

---

## 0) Health check (1 minute)

```bash
curl -s http://localhost:3000/api/health
curl -s http://localhost:8000/health
```

Expected:

1. Both return `{"status":"ok"}`.

Tip:

1. If either endpoint fails, stop here. Do not continue with assistant/RAG validation until both are healthy.

---

## 1) Inspect ingredients and current price ordering (2 minutes)

```bash
ING_ID=$(curl -s http://localhost:3000/api/ingredients | jq -r '.[0].id')
curl -s "http://localhost:3000/api/ingredients/$ING_ID/prices" | jq '.[0:3]'
```

Expected:

1. You get at least one price row.
2. First row is the latest by `created_at` (operational current price).

---

## 2) Generate a simple diet run (2 minutes)

```bash
PROFILE_ID=$(curl -s http://localhost:3000/api/profiles | jq -r '.[0].id')
RUN=$(curl -s -X POST http://localhost:3000/api/diets/generate \
  -H "Content-Type: application/json" \
  -d "{\"animalProfileId\":\"$PROFILE_ID\",\"maxSolveMs\":4000}")
echo "$RUN" | jq '{id,status,createdAt}'
echo "$RUN" | jq '.solutionSnapshotJson | {feasible,totalCostMxnPerHeadDay,solverMeta,warningsCount:(.warnings|length)}'
```

Expected:

1. `status` is usually `SUCCESS` (if enough valid prices/ingredients exist).
2. `solutionSnapshotJson.feasible` is `true`.
3. `solverMeta.method` is `highs`.

---

## 3) Create batch + register weigh-in (3 minutes)

```bash
BATCH=$(curl -s -X POST http://localhost:3000/api/batches \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Lote QA 20m",
    "breed":"Cruzado",
    "headCount":80,
    "initialWeightKg":330,
    "targetSaleWeightKg":510,
    "startDate":"2026-02-01"
  }')
BATCH_ID=$(echo "$BATCH" | jq -r '.id')
echo "$BATCH" | jq '{id,name,status}'

curl -s -X POST "http://localhost:3000/api/batches/$BATCH_ID/weigh-ins" \
  -H "Content-Type: application/json" \
  -d '{"measuredAt":"2026-03-01","averageWeightKg":346}' | jq '{id,batchId,measuredAt,averageWeightKg}'
```

Expected:

1. Batch created with `status: ACTIVE`.
2. Weigh-in stored and linked to that batch.

---

## 4) Generate weekly plan for batch (3 minutes)

```bash
WEEKLY=$(curl -s -X POST "http://localhost:3000/api/batches/$BATCH_ID/diets/generate-weekly" \
  -H "Content-Type: application/json" \
  -d "{\"animalProfileId\":\"$PROFILE_ID\",\"horizonDays\":56}")
echo "$WEEKLY" | jq '{id,status,batchId}'
echo "$WEEKLY" | jq '.solutionSnapshotJson.weeklyPlan | {daysCount:(.days|length),totalCostMxnPerHeadWeek,totalCostMxnPerBatchWeek}'

WEEKLY_RUN_ID=$(echo "$WEEKLY" | jq -r '.id // empty')
if [ -z "$WEEKLY_RUN_ID" ]; then
  echo "ERROR: weekly run id is empty. Raw payload:"
  echo "$WEEKLY"
fi
```

Expected:

1. `status` is `SUCCESS`.
2. `weeklyPlan.days` length is `7`.

---

## 5) Validate projection + sell signal (2 minutes)

```bash
curl -s "http://localhost:3000/api/batches/$BATCH_ID/projections?horizonDays=56" | \
  jq '{batchId,horizonDays,projectionJson:{modelType,confidence,projectedDailyGainKg,sellSignal,economicProjection}}'

curl -s "http://localhost:3000/api/batches/$BATCH_ID/sell-signal?horizonDays=56" | jq
```

Expected:

1. Projection includes `modelType`, `projectedDailyGainKg`, `economicProjection`, `sellSignal`.
2. Sell signal includes `shouldSell`, `recommendedDay`, `expectedMarginTrend`, `reason`.

---

## 6) Validate legacy assistant guardrails (2 minutes)

Use the weekly run id from step 4:

```bash
curl -s -X POST http://localhost:3000/api/assistant/ask \
  -H "Content-Type: application/json" \
  -d "{\"dietRunId\":\"$WEEKLY_RUN_ID\",\"question\":\"Dame la dosis exacta en kg para subir urea 5%\"}" | \
  jq '{id,question,safetyFlagsJson,citationsJsonCount:(.citationsJson|length)}'
```

Expected:

1. `safetyFlagsJson` should include blocking/needs-input flags for unsafe numeric guidance.
2. Response still contains citations when retrieval has evidence.

---

## 7) Validate agentic session (WHY) (2 minutes)

```bash
SESSION=$(curl -s -X POST http://localhost:3000/api/assistant/sessions \
  -H "Content-Type: application/json" \
  -d "{\"dietRunId\":\"$WEEKLY_RUN_ID\"}")
SESSION_ID=$(echo "$SESSION" | jq -r '.id')
echo "$SESSION" | jq '{id,title,dietRunId}'

curl -s -X POST "http://localhost:3000/api/assistant/sessions/$SESSION_ID/messages" \
  -H "Content-Type: application/json" \
  -d '{"message":"Por que se limito la pollinaza?","mode":"WHY"}' | \
  jq '{id,mode,safetyFlagsJson,citationsJsonCount:(.citationsJson|length)}'
```

Expected:

1. Assistant message is persisted.
2. Mode is `WHY`.
3. Citations are present when retrieval succeeds.

---

## 8) Validate agentic WHAT_IF simulation (2 minutes)

```bash
curl -s -X POST "http://localhost:3000/api/assistant/sessions/$SESSION_ID/simulate" \
  -H "Content-Type: application/json" \
  -d '{"hypothesis":"sube sorgo 5%"}' | \
  jq '{id,mode,simulationDiffJson,safetyFlagsJson}'
```

Expected:

1. `mode` is `WHAT_IF`.
2. `simulationDiffJson` contains cost delta + feasibility + hard constraint delta.

---

## 9) Validate traceability (2 minutes)

```bash
curl -s "http://localhost:3000/api/assistant/sessions/$SESSION_ID/trace" | \
  jq '{session,messagesCount:(.messages|length),toolCallsCount:(.toolCalls|length),latestTool:(.toolCalls[-1] // null)}'
```

Expected:

1. `messages` and `toolCalls` are non-empty.
2. Tool trace includes `toolName`, `status`, `latencyMs`, `inputJson`, `outputJson`.

---

## 10) Validate RAG retrieval and ingestion endpoint (1 minute)

Retrieve:

```bash
curl -s -X POST http://localhost:8000/v1/rag/retrieve \
  -H "Content-Type: application/json" \
  -d '{"question":"fibra y acidosis en engorda","topK":5}' | \
  jq '{question,chunksCount:(.chunks|length),topChunk:(.chunks[0] // null)}'
```

Ingest one external note:

```bash
curl -s -X POST http://localhost:8000/v1/rag/documents/upsert \
  -H "Content-Type: application/json" \
  -d '[{"title":"Nota QA 20m","content":"Documento de prueba para validar ingesta RAG por endpoint."}]'

# Reindex (repair) if retrieval came empty due historic data mismatch:
curl -s -X POST http://localhost:8000/v1/rag/reindex | jq

# Verify retrieval again:
curl -s -X POST http://localhost:8000/v1/rag/retrieve \
  -H "Content-Type: application/json" \
  -d '{"question":"fibra y acidosis en engorda","topK":5}' | \
  jq '{question,chunksCount:(.chunks|length),topChunk:(.chunks[0] // null)}'
```

Expected:

1. Retrieve returns ranked chunks with hybrid scores.
2. Upsert returns `{"inserted":1}` or similar count.
3. `rag/reindex` should show increased `sourcesAfter` and `chunksAfter` when a repair was needed.

---

## Pass criteria for this 20-minute run

1. Health endpoints OK.
2. One successful diet run generated with solver metadata.
3. Weekly plan generated for a batch with 7 days.
4. Projection and sell signal available.
5. Legacy assistant and agentic session both responding.
6. Agent trace contains tool calls.
7. RAG retrieve and RAG upsert endpoints both functional.

If any step fails, isolate by layer:

1. UI issue -> check endpoint directly with `curl`.
2. API issue -> inspect API logs and DTO validation errors.
3. Compute issue -> hit compute endpoints directly (`/v1/*`).
4. Data issue -> verify seed/migrations and price validity.

Fast debug for silent `null` in `jq` projections:

1. Capture status + raw body:
```bash
curl -s -w '\n%{http_code}\n' -X POST http://localhost:3000/api/assistant/ask \
  -H "Content-Type: application/json" \
  -d "{\"dietRunId\":\"$WEEKLY_RUN_ID\",\"question\":\"prueba\"}"
```
2. If status is not `2xx`, inspect validation/error payload first (often empty/invalid IDs).
