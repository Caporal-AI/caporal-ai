# Caporal AI - Matriz de Trazabilidad MVP

Fecha de corte: 2026-02-28

## Objetivo documentado -> Implementacion

| Objetivo | Feature | Endpoint(s) | Evidencia |
|---|---|---|---|
| Dieta de costo minimo con restricciones duras | Solver LP HiGHS | `POST /v1/optimize`, `POST /api/diets/generate` | `services/compute/app/core/solver.py`, `apps/api/src/diets/diets.service.ts` |
| Explicacion con citas y guardrails | RAG asistente | `POST /v1/ask`, `POST /api/assistant/ask` | `services/compute/app/api/ask.py`, `services/compute/app/core/assistant.py` |
| Auditoria de corridas | Snapshots en DietRun | `POST /api/diets/generate`, `POST /api/batches/:id/diets/generate-weekly` | `apps/api/src/diets/diet-run.entity.ts` |
| Gestion de lotes | CRUD de lotes y eventos | `/api/batches*` | `apps/api/src/batches/*` |
| Plan semanal | Weekly plan 7 dias | `POST /api/batches/:id/diets/generate-weekly` | `apps/api/src/batches/batches.service.ts` |
| Proyeccion economica | Proyeccion de margen/costo | `POST /v1/project`, `GET /api/batches/:id/projections` | `services/compute/app/core/projection.py` |
| Alerta de venta | Sell signal | `GET /api/batches/:id/sell-signal` | `services/compute/app/core/projection.py`, `apps/api/src/batches/batches.service.ts` |
| UX para no expertos | Flujo guiado por lote | Web tab "Lotes y plan semanal" | `apps/web/src/screens/BatchWorkflowScreen.tsx` |

## Riesgos abiertos

1. La proyeccion usa dataset sintetico (NRC-like) y fallback lineal cuando no hay xgboost.
2. Falta calibracion con datos reales de rancho para mejorar confianza de modelo.
3. Falta suite E2E de UI automatizada; actualmente hay unit/integration en API y compute.
