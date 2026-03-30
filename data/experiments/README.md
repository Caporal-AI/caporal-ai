# Paquete experimental del capitulo 6

Contenido congelado para reproducir la validacion del documento final.

## Archivos base

1. `economic_backtest_config.json`: lote sintetico, perfil animal, catalogo de ingredientes, baseline fijo operacional, criterio de aceptacion y parametros economicos.
2. `economic_price_series_90d.json`: serie fija de 90 dias de precios por ingrediente.
3. `agentic_scenarios_100.json`: banco congelado de 100 consultas para benchmark agentic.

## Generacion

Si necesitas reconstruir estos insumos desde cero, usa:

```bash
timeout 30 python3 scripts/experiments/generate_frozen_inputs.py
```

## Salidas

Las corridas se escriben en `data/experiments/reports/<run_id>/`.

Archivos esperados:

1. `economic_backtest.json|csv|md`
2. `agentic_benchmark.json|md`
3. `api-health.json`
4. `compute-health.json`
5. `rag-reindex.json`
6. `rag-quality-harness.log`

## Evidencia renderizada

Si el entorno Python de experimentos esta instalado, cada corrida genera ademas:

1. `economic_summary_table.csv|md`
2. `agentic_summary_table.csv|md`
3. `chapter6_results_table.csv|md`
4. `figure_*.png`
5. `economic_report.pdf`
6. `agentic_report.pdf`
7. `chapter6_executive_summary.pdf`
8. `captions.md`

Instalacion del entorno de evidencias:

```bash
yarn experiment:deps
```
