# Paquete de Ingesta RAG (Marzo 2026)

Objetivo: dejar una ruta reproducible para cargar conocimiento tecnico al RAG, medir calidad y mantener evidencia para tesis.

## 1) Que incluye este paquete

1. `scripts/rag/generate_initial_corpus.py`  
   Genera corpus inicial (120 documentos) + escenarios baseline (30 casos).
2. `data/rag/corpus_batch_001.jsonl`  
   Lote inicial listo para ingesta por API.
3. `data/rag/eval_baseline_scenarios.json`  
   Set de evaluacion para groundedness, cobertura de citas y leakage.
4. `scripts/rag/ingest_jsonl.sh`  
   Ingesta por lotes + reindex al final.
5. `scripts/rag/run_baseline_eval.sh`  
   Ejecuta benchmark baseline y guarda reporte versionado.
6. `scripts/rag/run_guardrail_redteam.sh`
   Ejecuta evaluacion red-team de guardrails y grounding.
7. `scripts/rag/run_mandatory_cases.sh`
   Ejecuta casos obligatorios: guardrail legacy, infeasible solver y regresion de endpoints clave.
8. `scripts/rag/run_quality_harness.sh`
   Orquesta baseline + red-team + casos obligatorios en un solo run.

## 2) Contrato de documento para ingesta

Cada linea del JSONL debe ser un objeto con:

1. `title` (obligatorio)
2. `content` (obligatorio)
3. `snippet` (opcional)
4. `sourceType` (opcional): `technical_note`, `field_protocol`, `safety_rule`, `market_note`
5. `region` (opcional): ejemplo `MX-NL`
6. `topic` (opcional): ejemplo `fibra`, `economia`, `salud_ruminal`
7. `metadata` (opcional): mapa plano con valores escalares (`string`, `number`, `boolean`, `null`)

Nota: la ingesta persiste `sourceType`, `region`, `topic` y `metadata` en `rag_sources` / `rag_chunks`.

## 3) Flujo operativo recomendado

### Paso A: generar o refrescar corpus

```bash
timeout 30 python3 scripts/rag/generate_initial_corpus.py
```

### Paso B: ingestar por lotes

```bash
timeout 180 scripts/rag/ingest_jsonl.sh data/rag/corpus_batch_001.jsonl 25
```

### Paso C: correr baseline

```bash
timeout 120 scripts/rag/run_baseline_eval.sh data/rag/eval_baseline_scenarios.json
```

### Paso D: correr red-team de seguridad

```bash
timeout 120 scripts/rag/run_guardrail_redteam.sh data/rag/eval_guardrail_redteam_scenarios.json
```

### Paso E: correr casos obligatorios y harness completo

```bash
timeout 120 scripts/rag/run_mandatory_cases.sh
timeout 180 scripts/rag/run_quality_harness.sh
```

El script guarda resultados en `data/rag/reports/<run-name>.json`.

## 4) Umbrales de calidad sugeridos (tesis)

1. `citationCoverageTechnical >= 0.92`
2. `groundedResponseRate >= 0.90`
3. `unsafeNumericLeakageRate == 0.00`

Si no cumple:

1. Revisar escenarios fallidos del reporte.
2. Agregar documentos en los topicos faltantes.
3. Reingestar y repetir baseline.

## 5) Checklist de calidad de corpus (antes de ingestar)

1. Cada documento tiene un objetivo tecnico claro (no texto ambiguo).
2. El contenido incluye contexto operativo de Mexico (insumos, manejo, clima).
3. Se evita dosificacion directa sin condicion de solver.
4. `topic` y `sourceType` estan completos.
5. No hay duplicados de titulo.
6. El `snippet` representa la idea central del documento.
7. El lenguaje esta orientado a usuario no experto.
8. Hay cobertura minima de estos ejes:
   - seguridad ruminal
   - transicion 21 dias
   - economia por kilo ganado
   - limites de inclusion y reglas de seguridad
   - manejo de comedero, agua y sanidad

## 6) Recomendacion de versionado

1. Mantener lotes por archivo: `corpus_batch_00N.jsonl`.
2. Registrar cambios de forma acumulativa, no sobrescribir evidencia historica.
3. Guardar cada corrida de benchmark con nombre de run y fecha.
