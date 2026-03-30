#!/usr/bin/env bash
set -euo pipefail

COMPUTE_URL="${COMPUTE_URL:-http://localhost:8000}"
API_URL="${API_URL:-http://localhost:3000/api}"
MAX_TIME="${MAX_TIME:-600}"
RUN_ID="${RUN_ID:-chapter6-$(date +%Y%m%d-%H%M%S)}"
OUTPUT_DIR="${OUTPUT_DIR:-data/experiments/reports/$RUN_ID}"
LLM_MODE="${LLM_MODE:-OFF}"
RAG_DATASET_PATH="${RAG_DATASET_PATH:-data/rag/corpus_batch_001.jsonl}"
RAG_BATCH_SIZE="${RAG_BATCH_SIZE:-25}"

mkdir -p "$OUTPUT_DIR"

echo "== Chapter 6 validation package =="
echo "Run id: $RUN_ID"
echo "Output dir: $OUTPUT_DIR"

echo "1) Health checks"
curl -fsS --max-time 20 "$API_URL/health" > "$OUTPUT_DIR/api-health.json"
curl -fsS --max-time 20 "$COMPUTE_URL/health" > "$OUTPUT_DIR/compute-health.json"

echo "2) Load frozen RAG corpus and repair index"
timeout "$MAX_TIME" scripts/rag/ingest_jsonl.sh "$RAG_DATASET_PATH" "$RAG_BATCH_SIZE" \
  | tee "$OUTPUT_DIR/rag-ingestion.log"

echo "3) Economic backtest"
timeout "$MAX_TIME" python3 scripts/experiments/run_economic_backtest.py \
  --compute-url "$COMPUTE_URL" \
  --output-dir "$OUTPUT_DIR"

echo "4) Agentic benchmark"
timeout "$MAX_TIME" python3 scripts/experiments/run_agentic_benchmark.py \
  --compute-url "$COMPUTE_URL" \
  --output-dir "$OUTPUT_DIR" \
  --llm-mode "$LLM_MODE"

echo "5) Existing RAG quality harness"
timeout "$MAX_TIME" scripts/rag/run_quality_harness.sh | tee "$OUTPUT_DIR/rag-quality-harness.log"

echo "6) Render evidence assets"
rm -f \
  "$OUTPUT_DIR"/captions.md \
  "$OUTPUT_DIR"/economic_report.pdf \
  "$OUTPUT_DIR"/economic_summary_table.csv \
  "$OUTPUT_DIR"/economic_summary_table.md \
  "$OUTPUT_DIR"/agentic_report.pdf \
  "$OUTPUT_DIR"/agentic_summary_table.csv \
  "$OUTPUT_DIR"/agentic_summary_table.md \
  "$OUTPUT_DIR"/chapter6_executive_summary.pdf \
  "$OUTPUT_DIR"/chapter6_results_table.csv \
  "$OUTPUT_DIR"/chapter6_results_table.md \
  "$OUTPUT_DIR"/figure_economic_*.png \
  "$OUTPUT_DIR"/figure_agentic_*.png \
  "$OUTPUT_DIR"/figure_chapter6_*.png
timeout "$MAX_TIME" scripts/experiments/python_runner.sh scripts/experiments/render_experiment_evidence.py \
  --input-dir "$OUTPUT_DIR" \
  --output-dir "$OUTPUT_DIR" \
  --mode chapter6

echo "Validation package ready in $OUTPUT_DIR"
