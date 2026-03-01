#!/usr/bin/env bash
set -euo pipefail

SCENARIOS_FILE="${1:-data/rag/eval_baseline_scenarios.json}"
COMPUTE_URL="${COMPUTE_URL:-http://localhost:8000}"
MAX_TIME="${MAX_TIME:-45}"
RUN_NAME="${RUN_NAME:-baseline-$(date +%Y%m%d-%H%M%S)}"

MIN_CITATION_COVERAGE="${MIN_CITATION_COVERAGE:-0.92}"
MIN_GROUNDED_RATE="${MIN_GROUNDED_RATE:-0.90}"
MAX_LEAKAGE_RATE="${MAX_LEAKAGE_RATE:-0.00}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required."
  exit 1
fi

if [[ ! -f "$SCENARIOS_FILE" ]]; then
  echo "Scenario file not found: $SCENARIOS_FILE"
  exit 1
fi

payload="$(jq -c --arg runName "$RUN_NAME" '{runName: $runName, scenarios: .}' "$SCENARIOS_FILE")"
response="$(curl -fsS --max-time "$MAX_TIME" \
  -X POST "$COMPUTE_URL/v1/rag/evaluate" \
  -H "Content-Type: application/json" \
  -d "$payload")"

report_dir="data/rag/reports"
mkdir -p "$report_dir"
report_file="$report_dir/${RUN_NAME}.json"
echo "$response" | jq . > "$report_file"

citation="$(echo "$response" | jq -r '.summary.citationCoverageTechnical')"
grounded="$(echo "$response" | jq -r '.summary.groundedResponseRate')"
leakage="$(echo "$response" | jq -r '.summary.unsafeNumericLeakageRate')"
total="$(echo "$response" | jq -r '.summary.totalScenarios')"

echo "Run: $RUN_NAME"
echo "Total scenarios: $total"
echo "Citation coverage: $citation (target >= $MIN_CITATION_COVERAGE)"
echo "Grounded rate: $grounded (target >= $MIN_GROUNDED_RATE)"
echo "Unsafe leakage: $leakage (target <= $MAX_LEAKAGE_RATE)"
echo "Report file: $report_file"

pass=true

awk -v v="$citation" -v t="$MIN_CITATION_COVERAGE" 'BEGIN { exit ((v+0) >= (t+0)) ? 0 : 1 }' || pass=false
awk -v v="$grounded" -v t="$MIN_GROUNDED_RATE" 'BEGIN { exit ((v+0) >= (t+0)) ? 0 : 1 }' || pass=false
awk -v v="$leakage" -v t="$MAX_LEAKAGE_RATE" 'BEGIN { exit ((v+0) <= (t+0)) ? 0 : 1 }' || pass=false

if [[ "$pass" == true ]]; then
  echo "Baseline evaluation PASS"
  exit 0
fi

echo "Baseline evaluation FAIL"
exit 2
