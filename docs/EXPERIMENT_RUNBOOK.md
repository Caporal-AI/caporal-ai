# Caporal AI - Runbook del experimento de validacion

Objetivo: ejecutar el paquete experimental del capitulo 6 con entradas congeladas, sin depender de la interfaz web ni de ediciones manuales en la base.

## Prerrequisitos

1. Stack arriba con Docker Compose.
2. API saludable en `http://localhost:3000/api/health`.
3. Compute saludable en `http://localhost:8000/health`.
4. `python3`, `curl` y `jq` disponibles en el host.

Para generar PDF y figuras tambien:

5. entorno Python de evidencias instalado con `yarn experiment:deps`.

## 1. Generar o refrescar insumos congelados

```bash
timeout 30 python3 scripts/experiments/generate_frozen_inputs.py
```

Esto deja listos:

1. `data/experiments/economic_backtest_config.json`
2. `data/experiments/economic_price_series_90d.json`
3. `data/experiments/agentic_scenarios_100.json`

## 2. Correr solo el experimento economico

```bash
yarn experiment:economic
```

Salidas:

1. `economic_backtest.json`
2. `economic_backtest.csv`
3. `economic_backtest.md`
4. `economic_summary_table.csv`
5. `economic_summary_table.md`
6. `figure_economic_cost_comparison.png`
7. `figure_economic_savings_distribution.png`
8. `figure_economic_daily_savings.png`
9. `economic_report.pdf`

Metricas principales:

1. costo baseline promedio
2. costo optimizado promedio
3. ahorro promedio por cabeza
4. ahorro total por lote
5. IC 95% del ahorro medio
6. violaciones duras baseline vs optimizado
7. criterio de aceptacion estadistico-operativo

## 3. Correr solo el benchmark agentic

Por defecto se fuerza `LLM_MODE=OFF` para mantener reproducibilidad determinista.

```bash
yarn experiment:agentic
```

Salidas:

1. `agentic_benchmark.json`
2. `agentic_benchmark.md`
3. `agentic_summary_table.csv`
4. `agentic_summary_table.md`
5. `figure_agentic_kpis.png`
6. `figure_agentic_category_pass_rate.png`
7. `figure_agentic_guardrails.png`
8. `agentic_report.pdf`

Metricas principales:

1. `citationCoverageTechnical`
2. `groundedResponseRate`
3. `unsafeBlockRate`
4. `unsafeNumericLeakageRate`
5. `agentToolSuccessRate`
6. `modeAccuracy`
7. `whatIfCompletionRate`
8. `nextActionCompletionRate`

## 4. Correr el paquete completo del capitulo 6

```bash
timeout 720 scripts/experiments/run_chapter6_validation.sh
```

Variables opcionales:

```bash
RUN_ID=cap6-local LLM_MODE=OFF MAX_TIME=600 timeout 720 scripts/experiments/run_chapter6_validation.sh
```

El paquete maestro ejecuta:

1. health checks de API y Compute
2. carga del corpus RAG congelado y reparacion del indice
3. backtesting economico
4. benchmark agentic
5. harness RAG ya existente (`scripts/rag/run_quality_harness.sh`)
6. renderizado de evidencia `Word-ready + PDF`

## 5. Lectura correcta del criterio economico

El experimento economico no usa ya un rango arbitrario de ahorro esperado. La aceptacion se considera valida si:

1. el ahorro medio porcentual frente al baseline es positivo,
2. el limite inferior del IC 95% del ahorro medio diario permanece por arriba de cero,
3. todas las corridas del horizonte son factibles,
4. el optimizador no incurre en violaciones duras.

## 6. Uso recomendado para el documento

1. Usa `economic_backtest.md` y `agentic_benchmark.md` como base para las tablas/resultados del capitulo 6.
2. Usa `chapter6_results_table.md` y `captions.md` para insertar resultados y pies de figura en el documento.
3. Usa los `.json` como evidencia auditable.
4. Si se quiere comparar contra OpenAI o un modelo local, repite el benchmark agentic cambiando `--llm-mode`, pero conserva `OFF` como baseline reproducible.
