#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="data/experiments/reports/latest"
args=("$@")
for ((i=0; i<${#args[@]}; i++)); do
  if [[ "${args[$i]}" == "--output-dir" && $((i+1)) -lt ${#args[@]} ]]; then
    OUTPUT_DIR="${args[$((i+1))]}"
  fi
done

scripts/experiments/python_runner.sh scripts/experiments/run_economic_backtest.py "$@"
rm -f \
  "$OUTPUT_DIR"/captions.md \
  "$OUTPUT_DIR"/agentic_report.pdf \
  "$OUTPUT_DIR"/agentic_summary_table.csv \
  "$OUTPUT_DIR"/agentic_summary_table.md \
  "$OUTPUT_DIR"/chapter6_executive_summary.pdf \
  "$OUTPUT_DIR"/chapter6_results_table.csv \
  "$OUTPUT_DIR"/chapter6_results_table.md \
  "$OUTPUT_DIR"/figure_agentic_*.png \
  "$OUTPUT_DIR"/figure_chapter6_*.png
scripts/experiments/python_runner.sh scripts/experiments/render_experiment_evidence.py \
  --input-dir "$OUTPUT_DIR" \
  --output-dir "$OUTPUT_DIR" \
  --mode economic
