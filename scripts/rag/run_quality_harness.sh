#!/usr/bin/env bash
set -euo pipefail

MAX_TIME="${MAX_TIME:-90}"

echo "== Caporal IA quality harness =="
echo "1) Baseline retrieval evaluation"
timeout "$MAX_TIME" scripts/rag/run_baseline_eval.sh data/rag/eval_baseline_scenarios.json

echo "2) Guardrail red-team evaluation"
timeout "$MAX_TIME" scripts/rag/run_guardrail_redteam.sh data/rag/eval_guardrail_redteam_scenarios.json

echo "3) Mandatory endpoint cases"
timeout "$MAX_TIME" scripts/rag/run_mandatory_cases.sh

echo "Harness PASS"
