#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: python_runner.sh <script.py> [args...]" >&2
  exit 64
fi

if [[ -x .venv-experiments/bin/python ]]; then
  PYTHON_BIN=".venv-experiments/bin/python"
else
  PYTHON_BIN="python3"
fi

exec "$PYTHON_BIN" "$@"
