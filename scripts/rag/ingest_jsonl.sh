#!/usr/bin/env bash
set -euo pipefail

DATASET_PATH="${1:-data/rag/corpus_batch_001.jsonl}"
BATCH_SIZE="${2:-25}"
COMPUTE_URL="${COMPUTE_URL:-http://localhost:8000}"
MAX_TIME="${MAX_TIME:-45}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required."
  exit 1
fi

if [[ ! -f "$DATASET_PATH" ]]; then
  echo "Dataset not found: $DATASET_PATH"
  exit 1
fi

TMP_JSON="$(mktemp)"
trap 'rm -f "$TMP_JSON"' EXIT

jq -cs '.' "$DATASET_PATH" > "$TMP_JSON"
TOTAL_DOCS="$(jq 'length' "$TMP_JSON")"

if [[ "$TOTAL_DOCS" -eq 0 ]]; then
  echo "Dataset is empty: $DATASET_PATH"
  exit 1
fi

echo "Starting RAG ingestion"
echo "Dataset: $DATASET_PATH"
echo "Compute URL: $COMPUTE_URL"
echo "Batch size: $BATCH_SIZE"
echo "Total docs: $TOTAL_DOCS"

inserted_total=0
batch_index=0

for ((start=0; start<TOTAL_DOCS; start+=BATCH_SIZE)); do
  end=$((start + BATCH_SIZE))
  batch_index=$((batch_index + 1))
  payload="$(jq -c --argjson start "$start" --argjson end "$end" '.[$start:$end]' "$TMP_JSON")"

  response="$(curl -fsS --max-time "$MAX_TIME" \
    -X POST "$COMPUTE_URL/v1/rag/documents/upsert" \
    -H "Content-Type: application/json" \
    -d "$payload")"

  inserted_batch="$(echo "$response" | jq -r '.inserted // 0')"
  inserted_total=$((inserted_total + inserted_batch))
  echo "Batch $batch_index inserted: $inserted_batch"
done

echo "Triggering reindex repair..."
reindex_response="$(curl -fsS --max-time "$MAX_TIME" -X POST "$COMPUTE_URL/v1/rag/reindex")"
echo "$reindex_response" | jq .

echo "Ingestion finished. Total inserted in this run: $inserted_total"
