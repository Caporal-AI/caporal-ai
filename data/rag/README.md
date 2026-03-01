# Data RAG

Contenido:

1. `corpus_batch_001.jsonl`: lote inicial (120 docs) para ingesta.
2. `eval_baseline_scenarios.json`: escenarios de evaluacion baseline.
3. `reports/`: resultados guardados de `run_baseline_eval.sh`.

Comandos rapidos:

```bash
timeout 30 python3 scripts/rag/generate_initial_corpus.py
timeout 180 scripts/rag/ingest_jsonl.sh data/rag/corpus_batch_001.jsonl 25
timeout 120 scripts/rag/run_baseline_eval.sh data/rag/eval_baseline_scenarios.json
```
