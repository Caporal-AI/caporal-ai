# Guia de ubicacion de figuras y tablas del experimento

Objetivo: dejar claro en que secciones del documento final conviene insertar las evidencias generadas por el paquete experimental de `chapter6`, evitando saturar una sola subseccion y manteniendo coherencia metodologica.

## Regla general

1. `6.2 Diseño del experimento`: explica como se construyo y ejecuto el experimento.
2. `6.3 Rigor estadistico y protocolos de validacion`: muestra como se midio y comparo el desempeño.
3. `6.4 Robustez, analisis de errores y etica`: muestra seguridad, guardrails, errores y cumplimiento.
4. `6.5 Resultados` o subseccion equivalente: concentra los hallazgos principales y la sintesis final.

La regla practica es:

1. `6.2` = como se diseño
2. `6.3` = como se midio
3. `6.4` = que tan robusto y seguro fue
4. `6.5` = que resultados dio

## Distribucion recomendada

### 6.2 Diseño del experimento

En esta seccion no conviene poner todas las graficas finales. Aqui deben ir solo apoyos que aclaren el protocolo experimental.

Usar:

1. una tabla resumida basada en `chapter6_results_table.md`, adaptada como matriz de metricas previstas y criterios de aceptacion.
2. opcionalmente, una tabla redactada a mano con:
   - lote sintetico
   - horizonte de 90 dias
   - baseline fijo
   - benchmark de 100 escenarios agentic

No usar aqui:

1. `figure_economic_cost_comparison.png`
2. `figure_agentic_kpis.png`
3. `figure_chapter6_main_kpis.png`

Esas figuras ya son resultados, no diseño.

### 6.3 Rigor estadistico y protocolos de validacion

Aqui deben ir las figuras que soportan la medicion del comportamiento economico y la variabilidad observada.

Usar:

1. `figure_economic_daily_savings.png`
2. `figure_economic_savings_distribution.png`
3. `economic_summary_table.md`

Justificacion:

1. la serie temporal muestra la evolucion del ahorro durante el horizonte de 90 dias
2. la distribucion del ahorro ayuda a justificar estabilidad y variabilidad del resultado
3. la tabla economica resume costo baseline, costo optimizado, ahorro medio, IC 95% y violaciones duras

### 6.4 Robustez, analisis de errores y etica

Aqui van las evidencias de seguridad, guardrails y analisis de desempeno del agente en escenarios problematicos o adversariales.

Usar:

1. `figure_agentic_guardrails.png`
2. `figure_agentic_category_pass_rate.png`
3. `figure_chapter6_acceptance_matrix.png`

Justificacion:

1. `figure_agentic_guardrails.png` sustenta bloqueo inseguro y fuga numerica
2. `figure_agentic_category_pass_rate.png` muestra donde estan las categorias mas debiles
3. `figure_chapter6_acceptance_matrix.png` resume que criterios pasaron y cuales requieren mejora

### 6.5 Resultados o subseccion equivalente

Aqui deben quedar las figuras mas fuertes y faciles de interpretar para el evaluador.

Usar:

1. `figure_economic_cost_comparison.png`
2. `figure_chapter6_main_kpis.png`
3. `chapter6_results_table.md`

Justificacion:

1. la comparacion de costo baseline vs optimizado resume el hallazgo economico principal
2. los KPIs principales de `chapter6` sintetizan economia + IA en una sola vista
3. la tabla consolidada deja un resumen auditable de metricas, umbrales y pass/fail

## Seleccion minima recomendada

Si el documento necesita una version compacta y bien defendida, usar solo estas figuras:

1. `figure_economic_cost_comparison.png`
2. `figure_economic_daily_savings.png`
3. `figure_economic_savings_distribution.png`
4. `figure_agentic_guardrails.png`
5. `figure_agentic_category_pass_rate.png`
6. `figure_chapter6_main_kpis.png`

Y estas tablas:

1. `economic_summary_table.md`
2. `chapter6_results_table.md`

## Mapeo directo figura -> seccion

| Artefacto | Seccion sugerida | Funcion |
|---|---|---|
| `economic_summary_table.md` | `6.3` | Resumen del experimento economico |
| `chapter6_results_table.md` | `6.5` | Sintesis final de metricas y umbrales |
| `figure_economic_cost_comparison.png` | `6.5` | Hallazgo economico principal |
| `figure_economic_daily_savings.png` | `6.3` | Evolucion temporal del ahorro |
| `figure_economic_savings_distribution.png` | `6.3` | Variabilidad y estabilidad del ahorro |
| `figure_agentic_guardrails.png` | `6.4` | Seguridad del agente |
| `figure_agentic_category_pass_rate.png` | `6.4` | Analisis de errores por categoria |
| `figure_agentic_kpis.png` | `6.5` o anexo | Resumen del benchmark agentic |
| `figure_chapter6_acceptance_matrix.png` | `6.4` | Cumplimiento metodologico global |
| `figure_chapter6_main_kpis.png` | `6.5` | Resumen ejecutivo economia + IA |

## Que no conviene hacer

1. no meter todas las figuras en una sola subseccion
2. no repetir la misma metrica en varias figuras si no aporta una lectura diferente
3. no usar screenshots del sistema cuando ya existen figuras limpias del experimento
4. no poner figuras de resultados dentro del capitulo de arquitectura o implementacion

## Sugerencia editorial

Usar `captions.md` como base para los pies de figura, pero adaptando el texto a la narrativa exacta del documento final. Si el documento queda muy cargado, mover `figure_agentic_kpis.png` al anexo y dejar en el cuerpo principal solo:

1. una figura economica fuerte
2. una figura de seguridad/guardrails
3. una figura consolidada de KPIs
