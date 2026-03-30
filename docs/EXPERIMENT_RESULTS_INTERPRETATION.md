# Guia de interpretacion de resultados del experimento

Objetivo: explicar con claridad que genera cada corrida experimental, cuales archivos son realmente importantes, como deben leerse y cuales artefactos conviene usar en el documento final de entrega.

Esta guia existe porque el paquete experimental produce muchos archivos y no todos tienen el mismo valor. Algunos sirven para redactar resultados, otros para evidencia auditable y otros solo para diagnostico tecnico.

---

## 1. Idea general

Cada corrida experimental genera un conjunto de archivos dentro de una carpeta de salida. Esa carpeta puede ser:

1. `data/experiments/reports/latest`
2. `data/experiments/reports/<run_id>`

La diferencia es importante:

1. `latest` sirve para trabajo rapido y pruebas iterativas.
2. `chapter6-<timestamp>` o cualquier `run_id` dedicado sirve como evidencia formal de una corrida concreta.

Para el documento final, siempre conviene usar una carpeta con `run_id` propio y no depender de `latest`.

---

## 2. Que tipos de experimento existen

Hoy el sistema genera tres grupos de evidencia:

1. **Experimento A - Economico**
   Compara una dieta baseline fija contra la dieta optimizada por el solver durante 90 dias.

2. **Experimento B - Agentic**
   Evalua el comportamiento del agente, guardrails, citas y uso de herramientas sobre 100 escenarios.

3. **Paquete consolidado Chapter 6**
   Junta el experimento economico, el benchmark agentic, los checks de salud y el harness RAG en una sola corrida.

---

## 3. Regla practica para no perderse

Si solo necesitas leer lo importante:

1. abre primero `chapter6_executive_summary.pdf`
2. luego revisa `chapter6_results_table.md`
3. despues mira las figuras `figure_chapter6_*`
4. si quieres detalle economico, abre `economic_report.pdf`
5. si quieres detalle agentic, abre `agentic_report.pdf`

Si haces eso, ya cubres casi todo lo que importa para tesis y presentacion.

---

## 4. Clasificacion de archivos por relevancia

### Nivel 1 - Imprescindibles para tesis

Estos son los archivos que realmente debes usar para redactar el capitulo de resultados y validacion:

1. `chapter6_executive_summary.pdf`
2. `chapter6_results_table.csv`
3. `chapter6_results_table.md`
4. `figure_chapter6_acceptance_matrix.png`
5. `figure_chapter6_main_kpis.png`
6. `economic_report.pdf`
7. `agentic_report.pdf`
8. `captions.md`

### Nivel 2 - Muy utiles para analisis y redaccion

Estos ayudan a profundizar o justificar resultados puntuales:

1. `economic_summary_table.csv`
2. `economic_summary_table.md`
3. `figure_economic_cost_comparison.png`
4. `figure_economic_daily_savings.png`
5. `figure_economic_savings_distribution.png`
6. `agentic_summary_table.csv`
7. `agentic_summary_table.md`
8. `figure_agentic_kpis.png`
9. `figure_agentic_category_pass_rate.png`
10. `figure_agentic_guardrails.png`

### Nivel 3 - Evidencia tecnica y auditoria

Estos archivos normalmente no van al cuerpo principal del documento, pero sirven para soporte, trazabilidad o anexo:

1. `economic_backtest.json`
2. `economic_backtest.csv`
3. `economic_backtest.md`
4. `agentic_benchmark.json`
5. `agentic_benchmark.md`
6. `api-health.json`
7. `compute-health.json`
8. `rag-ingestion.log`
9. `rag-quality-harness.log`

---

## 5. Como leer cada grupo de archivos

## 5.1. Archivos del experimento economico

### `economic_report.pdf`

Es la lectura humana rapida del experimento economico. Resume:

1. costo baseline promedio
2. costo optimizado promedio
3. ahorro medio
4. ahorro total
5. criterio de aceptacion
6. graficas economicas principales

Usalo cuando quieras entender rapido si el experimento economico salio bien o mal.

### `economic_summary_table.csv` y `economic_summary_table.md`

Son la version estructurada del resumen economico. Son utiles para:

1. insertar tablas en Word
2. citar metricas exactas en la redaccion
3. verificar el estado `PASS/FAIL` por criterio

### `figure_economic_cost_comparison.png`

Muestra la comparacion entre:

1. costo promedio baseline
2. costo promedio optimizado

Interpretacion:

1. si la barra optimizada esta claramente por debajo, el solver redujo costo
2. si la diferencia es pequena, el beneficio economico es marginal
3. si la barra optimizada fuera mas alta, el experimento habria sido economicamente negativo

### `figure_economic_daily_savings.png`

Muestra el ahorro por dia del horizonte experimental.

Interpretacion:

1. si la serie se mantiene consistentemente positiva, el ahorro es estable
2. si hay alta oscilacion, el sistema es sensible a cambios de precio
3. si aparecen valores cercanos a cero o negativos, el ahorro no es robusto en todos los dias

### `figure_economic_savings_distribution.png`

Muestra la distribucion del ahorro diario observado.

Interpretacion:

1. si la distribucion se concentra lejos de cero, hay evidencia de ahorro robusto
2. si la distribucion esta pegada a cero, el beneficio economico es debil
3. si hay cola negativa, hubo dias donde no convino optimizar frente al baseline

### Como interpretar un pico muy marcado en la distribucion

Si en esta figura aparece un pico muy alto en un rango estrecho, por ejemplo alrededor de `20-21 MXN/cabeza/dia`, eso normalmente significa que muchos dias del horizonte experimental produjeron casi el mismo ahorro diario.

Eso no implica por si mismo un error del grafico. En este experimento puede ocurrir por dos razones combinadas:

1. la serie sintética de precios tiene un tramo con baja variacion diaria en varios insumos clave,
2. el solver encuentra una mezcla optima muy parecida durante ese tramo, por lo que el ahorro frente al baseline se repite o cambia muy poco.

En otras palabras, un pico asi suele significar **estabilidad del ahorro dentro del escenario congelado**, no necesariamente una anomalia.

La lectura correcta es:

1. si el pico esta claramente por arriba de cero, el experimento muestra ahorro consistente en muchos dias,
2. si el pico es extremadamente estrecho, tambien sugiere que la serie de precios sintetica puede tener una meseta o un segmento con poca volatilidad,
3. por ello conviene leer esta figura junto con `figure_economic_daily_savings.png`, que muestra la evolucion temporal del ahorro y permite distinguir entre estabilidad real y falta de variacion del escenario.

En la redaccion academica, esto debe expresarse como una propiedad del **escenario experimental congelado** y no como una promesa universal del sistema.

### `economic_backtest.json`

Es la evidencia auditable completa del experimento economico.

Contiene:

1. `metadata`
2. `summary`
3. `rows`

La seccion `summary` es la mas importante para lectura normal. La seccion `rows` sirve cuando quieres revisar cada dia individualmente.

### `economic_backtest.csv`

Es el detalle tabular diario del experimento economico.

Columnas clave:

1. `baselineCostMxnPerHeadDay`
2. `optimizedCostMxnPerHeadDay`
3. `dailySavingsMxnPerHead`
4. `dailySavingsPct`
5. `optimizedFeasible`
6. `optimizedHardViolations`

Usalo si quieres:

1. hacer graficas externas
2. recalcular estadisticas
3. llevar el experimento a Excel

### `economic_backtest.md`

Es un resumen markdown de lectura media. Menos util que el PDF, pero mas facil de versionar y citar en texto.

---

## 5.2. Archivos del benchmark agentic

### `agentic_report.pdf`

Es la lectura humana rapida del benchmark agentic.

Resume:

1. total de escenarios
2. cobertura de citas
3. groundedness
4. bloqueo inseguro
5. fuga numerica
6. exito de tools
7. precision de modo
8. completion rates

Es el archivo correcto para responder: “que tan bien se comporto la capa IA”.

### `agentic_summary_table.csv` y `agentic_summary_table.md`

Son las tablas base del benchmark agentic.

Usalas para:

1. insertar resultados en el documento
2. soportar afirmaciones sobre seguridad y trazabilidad
3. identificar rapidamente donde falla el agente

### `figure_agentic_kpis.png`

Resume los KPIs principales del benchmark agentic.

Interpretacion:

1. valores altos en `citationCoverageTechnical` y `groundedResponseRate` son positivos
2. `unsafeNumericLeakageRate` debe ser 0
3. `agentToolSuccessRate` y `modeAccuracy` muestran madurez del orquestador
4. `nextActionCompletionRate` suele ser uno de los indicadores mas exigentes

### `figure_agentic_category_pass_rate.png`

Muestra el desempeno por categoria de escenario.

Interpretacion:

1. revela en que tipo de tareas el agente es mas fuerte
2. ayuda a explicar errores sin generalizar incorrectamente
3. permite decir si el sistema responde mejor en `WHY`, `WHAT_IF`, guardrails o `NEXT_ACTION`

### `figure_agentic_guardrails.png`

Muestra los indicadores de seguridad del agente.

Interpretacion:

1. `unsafeBlockRate` alto es bueno
2. `unsafeNumericLeakageRate` debe ser 0
3. si hay fuga numerica, el sistema no es defendible academicamente ni seguro operativamente

### `agentic_benchmark.json`

Es la evidencia auditable completa del benchmark agentic.

Contiene:

1. `metadata`
2. `summary`
3. `rows`

La seccion `rows` permite auditar escenario por escenario.

### `agentic_benchmark.md`

Es un resumen markdown de lectura intermedia. Menos comodo que el PDF, pero util para inspeccion y versionado.

---

## 5.3. Archivos del resumen consolidado chapter6

### `chapter6_executive_summary.pdf`

Es el archivo mas importante de todo el paquete.

Debe leerse primero porque resume:

1. hallazgo economico principal
2. hallazgo de seguridad y desempeno IA principal
3. criterios de aceptacion
4. interpretacion redactada en tono academico

Si tuvieras que mostrar solo un archivo a alguien del equipo o al profesor, seria este.

### `chapter6_results_table.csv` y `chapter6_results_table.md`

Son la matriz consolidada del experimento completo.

Normalmente incluyen:

1. ahorro porcentual medio
2. IC del ahorro
3. factibilidad del horizonte
4. violaciones duras
5. cobertura de citas
6. groundedness
7. fuga numerica
8. exito de tools
9. what-if completion rate
10. checks de salud y harness

Esta es la tabla correcta para la subseccion de resultados finales.

### `figure_chapter6_acceptance_matrix.png`

Muestra visualmente que criterios de aceptacion pasaron y cuales no.

Interpretacion:

1. es una figura metodologica
2. sirve para demostrar cumplimiento experimental
3. es ideal para la subseccion de robustez o validacion consolidada

### `figure_chapter6_main_kpis.png`

Muestra los KPIs principales combinados de economia + IA.

Interpretacion:

1. es la figura de resumen ejecutivo
2. sirve para la subseccion final de resultados
3. ayuda a mostrar de un vistazo que el sistema no solo optimiza costo, sino que tambien mantiene seguridad y trazabilidad

### `captions.md`

Contiene textos base para pies de figura.

No es evidencia experimental por si mismo, pero te ahorra tiempo editorial y te ayuda a mantener consistencia en el documento.

---

## 6. Como interpretar las metricas clave

## 6.1. Metricas economicas

### `averageBaselineCostMxnPerHeadDay`

Costo promedio por cabeza y por dia de la dieta fija de referencia.

Lectura:

1. sirve como comparador
2. por si solo no prueba valor
3. debe leerse siempre contra el costo optimizado

### `averageOptimizedCostMxnPerHeadDay`

Costo promedio por cabeza y por dia de la dieta optimizada.

Lectura:

1. si es menor que el baseline, el solver genero ahorro
2. si fuera igual, el beneficio economico seria marginal
3. si fuera mayor, el experimento no apoyaria la hipotesis economica

### `averageSavingsMxnPerHeadDay`

Ahorro promedio diario por cabeza.

Lectura:

1. expresa el ahorro en dinero real
2. es facil de explicar a negocio
3. debe reportarse junto con el porcentaje

### `averageSavingsPct`

Ahorro medio porcentual frente al baseline.

Lectura:

1. permite comparar escenarios con distinta escala de costo
2. no debe presentarse como promesa universal
3. siempre debe explicarse como resultado del escenario experimental congelado

### `savingsMean95Ci`

Intervalo de confianza del 95% del ahorro medio.

Lectura:

1. si el limite inferior es mayor que cero, el ahorro medio es estadisticamente consistente en el experimento
2. si incluyera cero, la evidencia seria debil

### `optimizedHardConstraintViolations`

Numero total de violaciones duras en las soluciones optimizadas.

Lectura:

1. debe ser 0
2. si es mayor que 0, el ahorro no es operativamente aceptable

## 6.2. Metricas agentic

### `citationCoverageTechnical`

Porcentaje de respuestas tecnicas con citas.

Lectura:

1. alto es bueno
2. mide trazabilidad documental
3. no garantiza por si solo groundedness

### `groundedResponseRate`

Proporcion de respuestas tecnicas sustentadas por evidencia.

Lectura:

1. alto es bueno
2. apoya que el sistema no inventa explicaciones

### `unsafeBlockRate`

Tasa de bloqueo de solicitudes inseguras.

Lectura:

1. alto es deseable
2. un valor bajo indica debilidad de guardrails

### `unsafeNumericLeakageRate`

Tasa de fuga de recomendaciones numericas inseguras.

Lectura:

1. debe ser 0
2. cualquier valor positivo es un problema serio

### `agentToolSuccessRate`

Proporcion de escenarios en que las herramientas esperadas se invocaron y terminaron con exito.

Lectura:

1. mide madurez del orquestador
2. si queda por debajo del umbral, el sistema aun es funcional pero no fino

### `modeAccuracy`

Precision del modo elegido por el agente.

Lectura:

1. ayuda a entender si el sistema clasifica bien `WHY`, `WHAT_IF` y `NEXT_ACTION`
2. no es la metrica mas critica, pero si afecta experiencia y consistencia

### `whatIfCompletionRate`

Tasa de completitud de escenarios `WHAT_IF`.

Lectura:

1. alta indica que el sistema ya simula cambios utiles
2. si cae mucho, el valor operativo del asistente se reduce

### `nextActionCompletionRate`

Tasa de completitud del modo `QUE_SIGUE`.

Lectura:

1. es de las metricas mas exigentes
2. suele ser la mas dificil de madurar
3. si es baja, puede explicarse como una brecha abierta del sistema

---

## 7. Como saber si una corrida salio bien o mal

## 7.1. Corrida economica saludable

Se interpreta como saludable si:

1. `daysFeasible = daysConfigured`
2. `optimizedHardConstraintViolations = 0`
3. `averageSavingsPct > 0`
4. el limite inferior del `IC95` esta por arriba de cero
5. `acceptance.overall = true`

## 7.2. Corrida agentic saludable

Se interpreta como saludable si:

1. `citationCoverageTechnical` es alto
2. `groundedResponseRate` es alto
3. `unsafeNumericLeakageRate = 0`
4. `unsafeBlockRate` es alto
5. `agentToolSuccessRate` y `whatIfCompletionRate` no caen por debajo de umbrales razonables

## 7.3. Corrida chapter6 saludable

Se interpreta como saludable si:

1. el experimento economico pasa
2. el benchmark agentic no presenta fuga numerica
3. el harness RAG pasa
4. los health checks de API y Compute son correctos

---

## 8. Que archivos usar en el documento final

Si quieres una seleccion compacta y seria para el documento:

### Tablas

1. `economic_summary_table.md`
2. `chapter6_results_table.md`

### Figuras

1. `figure_economic_cost_comparison.png`
2. `figure_economic_daily_savings.png`
3. `figure_economic_savings_distribution.png`
4. `figure_agentic_guardrails.png`
5. `figure_agentic_category_pass_rate.png`
6. `figure_chapter6_main_kpis.png`

### PDFs de apoyo

1. `economic_report.pdf`
2. `agentic_report.pdf`
3. `chapter6_executive_summary.pdf`

### Texto auxiliar

1. `captions.md`

---

## 9. Que archivos normalmente NO necesitas meter en el cuerpo principal

Estos son utiles, pero generalmente no van en el cuerpo del documento:

1. `api-health.json`
2. `compute-health.json`
3. `rag-ingestion.log`
4. `rag-quality-harness.log`
5. `economic_backtest.json`
6. `agentic_benchmark.json`

Esos son mejores para:

1. anexos
2. auditoria
3. soporte tecnico interno

---

## 10. Orden recomendado de lectura para una corrida completa

Cuando tengas una nueva carpeta de corrida, leela en este orden:

1. `chapter6_executive_summary.pdf`
2. `chapter6_results_table.md`
3. `figure_chapter6_main_kpis.png`
4. `figure_chapter6_acceptance_matrix.png`
5. `economic_report.pdf`
6. `agentic_report.pdf`
7. `rag-quality-harness.log`

Con eso entiendes:

1. que paso globalmente
2. donde estuvo el mayor valor economico
3. que tan segura fue la capa IA
4. si hay brechas abiertas

---

## 11. Mensaje practico final

No todos los archivos importan igual.

La forma correcta de pensar el paquete es:

1. **PDFs** = lectura ejecutiva
2. **tablas CSV/MD** = insumo directo para el documento
3. **figuras PNG** = evidencia visual para tesis
4. **JSON/CSV crudos** = auditoria y trazabilidad
5. **logs y health checks** = soporte tecnico

Si mantienes esa jerarquia, el paquete deja de sentirse caotico y se vuelve facil de usar.
