# Analisis del Documento Final contra Clase S04

Fecha de corte: 2026-03-28

## Objetivo

Este documento consolida el analisis del archivo `Version_02_Equipo_3005_F_Entrega3_Fase_4_Documento_Final_y_Video.docx` frente a las recomendaciones de `Clase S04.pdf` y frente al sistema realmente implementado en el repositorio de Caporal AI.

El objetivo no es reescribir el documento final aqui, sino dejar claro:

1. Que partes ya estan alineadas con la rubrica del profesor.
2. Que partes aun estan debiles o inconsistentes.
3. Que correcciones son prioritarias antes de la entrega final.

## Fuentes revisadas

1. Documento de entrega final en Word.
2. Recomendaciones de `Clase S04.pdf`.
3. Estado actual del repositorio y de la implementacion real.

## Resumen ejecutivo

El documento ya tiene una estructura general adecuada y una narrativa de problema-producto bastante convincente. Sin embargo, todavia presenta varias inconsistencias que pueden afectar la evaluacion:

1. Inconsistencias entre lo que el documento dice y lo que el sistema realmente implementa.
2. Inconsistencias internas entre capitulos metodologicos, fases y cifras de ejecucion.
3. Un capitulo 6 que ya va mejor encaminado, pero aun debe cerrar con resultados y discusion, no solo con protocolo.
4. Un capitulo 7 que sobreafirma exito y madurez comercial sin que el capitulo 6 lo sustente todavia con suficiente evidencia.

La conclusion general es esta:

1. El documento esta por encima de una entrega debil.
2. El mayor riesgo no es la falta de contenido, sino la falta de coherencia tecnica y metodologica.
3. Si se corrigen las inconsistencias mas visibles, el documento puede quedar defendible.

## Contraste directo con Clase S04

La clase S04 enfatiza especialmente los siguientes puntos:

1. Estructura apegada a la plantilla oficial.
2. Capitulo 3 con antecedentes y estado del arte suficientes.
3. Capitulo 4 aterrizado a la ejecucion real del proyecto.
4. Capitulo 5 enfocado en lo que realmente se construyo.
5. Capitulo 6 con hipotesis, metricas, resultados y discusion.
6. Referencias APA limpias y trazables.
7. Figuras, tablas y anexos bien controlados editorialmente.

## Semaforo por capitulo

| Capitulo | Estado | Observacion |
|---|---|---|
| 1. Introduccion | Verde | La motivacion, el contexto y el problema estan bien planteados. |
| 2. Objetivos | Amarillo | Los objetivos estan bien orientados, pero siguen arrastrando referencias a Simplex en vez de HiGHS. |
| 3. Desarrollo conceptual | Amarillo | Buena narrativa de problema y oportunidad, pero el estado del arte academico sigue siendo insuficiente. |
| 4. Metodologia | Amarillo/Rojo | Tiene backlog, historias, KPIs y evidencias, pero presenta contradicciones entre sprints, horas, tareas y fases. |
| 5. Implementacion | Rojo | Es el capitulo con mas inconsistencias frente al sistema real implementado. |
| 6. Validacion y diseno experimental | Amarillo | Ya tiene una buena direccion, pero aun le faltan resultados concretos, discusion y mejor aislamiento metodologico. |
| 7. Conclusiones y trabajo futuro | Amarillo | El tono actual sobreafirma madurez y exito sin que toda la evidencia de validacion este cerrada. |
| Referencias y anexos | Amarillo/Rojo | Ya hay bibliografia, pero falta limpieza APA, trazabilidad y una seccion formal de anexos. |

## Hallazgos criticos

## 1. Problema de estructura y plantilla

La clase S04 propone una estructura clara para la entrega final. El documento actual se acerca bastante, pero aun tiene problemas editoriales:

1. La numeracion del capitulo 5 esta corrida.
2. El indice muestra:
   - `5. Implementacion de la propuesta`
   - `5 Planificacion y estimacion`
   - `5.1 Implementacion`
   - `5.2 Despliegue`
   - `5.3 Mantenimiento`
3. La forma correcta deberia ser:
   - `5. Implementacion de la propuesta`
   - `5.1 Planificacion y estimacion`
   - `5.2 Implementacion`
   - `5.3 Despliegue`
   - `5.4 Mantenimiento`
4. La clase tambien sugiere `8. Referencias` y `9. Anexos`. En el documento ya aparecen referencias, pero no una seccion formal de anexos con entidad propia.

## 2. Capitulo 5: lo que dice el documento no coincide siempre con el sistema real

Este es el problema mas serio del documento actual.

### Inconsistencias tecnicas detectadas

1. El documento sigue hablando de `Simplex` como tecnologia del solver.
   - El sistema real usa `SciPy linprog(method="highs")`.
   - Si se deja `Simplex` en objetivos, implementacion y validacion, el texto pierde credibilidad tecnica.

2. El documento menciona endpoints que no coinciden con la implementacion real.
   - Documento: `/v1/diets/optimize`
   - Implementacion real: `/v1/optimize`
   - Documento: `/v1/projections/growth`
   - Implementacion real: `/v1/project`

3. El documento afirma o sugiere tecnologias no observadas como parte real del MVP.
   - Redis
   - WebSocket
   - LangChain
   - LlamaIndex
   - Pinecone
   - Milvus

   En el codigo revisado no hay evidencia clara de esas piezas como parte efectiva del MVP entregable.

4. El documento describe el RAG como si corriera sobre Pinecone o Milvus.
   - La implementacion real usa PostgreSQL con `pgvector`.

5. El documento afirma que el microservicio Python no accede a PostgreSQL.
   - La implementacion real del compute si accede a PostgreSQL para el almacenamiento y recuperacion del corpus RAG.

6. El documento habla de HTTPS como hecho consumado.
   - En el entorno local reproducible del repositorio no se observa una configuracion real de TLS/443.
   - Lo correcto seria presentarlo como objetivo o configuracion de produccion, no como hecho ya implementado en el compose local.

### Conclusiones sobre el capitulo 5

El capitulo 5 debe reescribirse con criterio de fidelidad tecnica:

1. Describir solo lo que el MVP realmente implementa.
2. Mover a "trabajo futuro" o "arquitectura objetivo" cualquier tecnologia aspiracional no presente.
3. Sustituir toda referencia a Simplex por la formulacion correcta del solver actual.

## 3. Capitulo 3: sigue faltando estado del arte academico

La clase S04 alerta que muchos trabajos llegan flojos en antecedentes y estado del arte. El documento actual aun tiene esa debilidad.

### Lo que ya funciona

1. El problema de negocio esta bien explicado.
2. La comparativa con software comercial es util para justificar oportunidad de mercado.
3. La narrativa de DSS hibrido esta clara.

### Lo que falta

1. Mayor respaldo academico sobre optimizacion de dietas y sistemas de soporte a la decision.
2. Mayor respaldo academico sobre IA conversacional y RAG en agricultura o entornos tecnicos.
3. Menor dependencia del contraste con software comercial como unica evidencia de novedad.

### Recomendacion

En `3.3` conviene agregar una tabla adicional de antecedentes academicos, no solo de competidores de mercado.

## 4. Capitulo 4: metodologia con evidencia, pero inconsistente

El capitulo 4 mejora bastante respecto a una metodologia puramente teorica. Ya incluye:

1. roles
2. backlog
3. historias de usuario
4. roadmap
5. KPI
6. evidencias de Trello y GitHub

Eso esta bien alineado con la clase.

### El problema

Las cifras y la narrativa no son consistentes entre si.

#### Inconsistencias detectadas

1. En una parte se habla de cuatro sprints de dos semanas.
2. En otra parte se habla de siete sprints semanales mas un sprint 0 corto.
3. En una parte se reportan 153 horas y 39 tareas.
4. En otra parte se reportan 125 horas, 30 tareas y 112 horas completadas.
5. El documento mezcla plan original, ejecutado, avance parcial y cierre como si fueran el mismo corte temporal.

### Riesgo

Esto puede hacer que el profesor perciba el capitulo 4 como un relato armado a posteriori y no como una metodologia realmente trazable.

### Recomendacion

Elegir un solo corte de tiempo y una sola linea narrativa:

1. plan inicial
2. desviacion observada
3. estado real al cierre

Todo lo demas debe alinearse a ese mismo corte.

## 5. Capitulo 6: bien orientado, pero aun no cerrado

La clase S04 pide explicitamente:

1. hipotesis
2. metricas
3. resultados
4. discusion

### Lo que ya esta bien

1. Ya hay KPIs claros en el capitulo 4.
2. Ya existe criterio final de validacion dual.
3. La seccion 6.2 ya avanza hacia un protocolo mucho mas serio.
4. La distincion entre validacion economica y seguridad IA esta bien encaminada.

### Lo que sigue faltando

1. Resultados concretos de la corrida experimental.
2. Discusion de resultados.
3. Una justificacion mas explicita del tamano muestral y de las pruebas estadisticas.
4. Mayor aislamiento metodologico entre experimento economico y experimento conversacional.

### Diagnostico

Hoy el capitulo 6 parece todavia una mezcla de:

1. protocolo de validacion
2. intencion de medicion
3. interpretacion preliminar

Para cerrar bien debe convertirse en:

1. protocolo
2. resultados
3. interpretacion
4. limites

## 6. Capitulo 7: conclusiones sobreafirmadas

Las conclusiones actuales presentan el sistema como si la validacion ya hubiera demostrado:

1. reduccion economica consistente
2. alta usabilidad validada
3. lista para transferencia comercial
4. viabilidad plena del MVP

### Riesgo

Si el capitulo 6 no muestra resultados cuantitativos con suficiente claridad, esas conclusiones se leen como afirmaciones demasiado fuertes.

### Recomendacion

Si no se van a incluir resultados numericos solidos, bajar el tono a:

1. viabilidad preliminar
2. validacion controlada
3. evidencia experimental acotada
4. transferencia futura sujeta a calibracion en campo

## 7. Referencias, trazabilidad y limpieza editorial

La clase S04 marca esto como una de las incidencias mas frecuentes.

### Problemas detectados

1. Hay fuentes citadas en el texto que no estan claramente normalizadas o no aparecen de forma limpia en referencias.
2. `La Razon, 2025` aparece en texto, pero no se observa en la bibliografia extraida.
3. `Banxico` aparece citado dentro del texto de forma indirecta, pero no como referencia formal propia.
4. `Telegram` se menciona como herramienta de coordinacion, pero sin tratamiento documental claro.
5. `NDS` aparece como software comparado, pero sin una referencia formal visible.

### Recomendacion

Hacer una limpieza final de correspondencia:

1. todo lo citado debe aparecer en referencias
2. toda referencia listada debe estar citada en el texto o moverse a anexo
3. las referencias deben normalizarse en APA

## 8. Figuras, tablas y control editorial

La clase insiste en:

1. titulo
2. numeracion correcta
3. fuente
4. legibilidad
5. maquetacion consistente

### Riesgos observados

1. Hay repeticiones de "Fuente: Elaboracion propia" que parecen desalineadas.
2. Algunas figuras o tablas parecen duplicadas o insertadas con poco control de continuidad.
3. El capitulo 5 y 6 necesitan una revision de maquetacion final para que no se partan mal tablas o figuras.

## Fortalezas reales del documento

No todo es problema. El documento tiene varias fortalezas claras:

1. La motivacion de negocio esta muy bien planteada.
2. El problema y la oportunidad estan narrados con claridad.
3. El enfoque de IA hibrida tiene una propuesta de valor clara.
4. La estrategia de datos ya esta mejor explicada que en versiones previas.
5. El capitulo 4 si intenta evidenciar Scrum/Lean con artefactos reales.
6. El documento ya tiene mejor forma de proyecto serio que una entrega promedio.

## Plan minimo de correccion antes de entrega

## Prioridad 1 - indispensable

1. Corregir todas las referencias a `Simplex` para alinearlas con `SciPy linprog(method="highs")`.
2. Corregir el capitulo 5 para que describa la implementacion real y no una arquitectura aspiracional.
3. Renumerar correctamente la estructura del capitulo 5.
4. Corregir el capitulo 6 para cerrarlo con resultados y discusion, no solo diseno.
5. Reducir o matizar afirmaciones de exito en conclusiones si la evidencia aun no esta plenamente reportada.

## Prioridad 2 - muy recomendable

1. Unificar el capitulo 4 con una sola version consistente de sprints, horas y tareas.
2. Fortalecer `3.3` con estado del arte academico adicional.
3. Limpiar referencias y trazabilidad entre citas y bibliografia.
4. Crear una seccion formal de anexos.

## Prioridad 3 - cierre editorial

1. Revisar numeracion de tablas y figuras.
2. Revisar calidad y legibilidad visual.
3. Revisar separaciones, saltos de pagina y consistencia de titulos.

## Conclusion final

El documento tiene base suficiente para convertirse en una entrega fuerte, pero todavia no esta en estado de cierre academico fino. Su principal problema no es la falta de contenido, sino la falta de alineacion entre:

1. la implementacion real,
2. la narrativa metodologica,
3. la validacion experimental,
4. y el tono de las conclusiones.

Si se corrigen primero las inconsistencias tecnicas del capitulo 5 y luego se cierra bien el capitulo 6 con resultados y discusion, el documento puede subir de manera importante en coherencia y solidez ante la rubrica de `Clase S04`.
