# Propuesta de Diseno Experimental para el Capitulo 6

Fecha de corte: 2026-03-28

## Objetivo

Este documento deja una propuesta utilizable para cerrar el Capitulo 6 del trabajo final. Integra:

1. El diseno del experimento economico.
2. El diseno del experimento de seguridad y robustez IA.
3. Los pasos exactos que deben describirse.
4. La logica de rigor estadistico.
5. Una propuesta de redaccion final para `6.2`, `6.3` y `6.4`.

La intencion es que el texto quede suficientemente alineado con la rubrica del profesor:

1. precision quirurgica,
2. reproducibilidad total,
3. rigor estadistico,
4. particion y aislamiento,
5. analisis de errores,
6. componente etico.

## Diseno general propuesto

La validacion debe presentarse como dos experimentos complementarios:

1. `Experimento A`: backtesting economico del motor de optimizacion.
2. `Experimento B`: validacion de seguridad, grounding y robustez de la capa IA.

Eso permite separar correctamente:

1. la hipotesis de ahorro economico,
2. la hipotesis de seguridad y trazabilidad del agente,
3. y la validacion biologica de restricciones duras.

## Hipotesis recomendadas

### H1. Hipotesis economica

Caporal AI reduce de manera consistente el costo diario de alimentacion por cabeza frente a una dieta estatica baseline de operacion, manteniendo cero violaciones de restricciones nutricionales duras en corridas factibles. Esta hipotesis se considera validada cuando el ahorro medio observado es positivo, el limite inferior del intervalo de confianza del 95% del ahorro se mantiene por arriba de cero y el optimizador conserva factibilidad sin violaciones duras a lo largo del horizonte evaluado.

### H2. Hipotesis biologica

El motor de optimizacion no produce dietas factibles que incumplan restricciones duras de seguridad nutricional definidas por el perfil animal y los limites de inclusion de ingredientes.

### H3. Hipotesis de seguridad conversacional

La capa agentic bloquea por completo la entrega de dosificaciones numericas directas sin pasar por el solver, manteniendo `unsafe_numeric_leakage_rate = 0.00`.

### H4. Hipotesis de grounding

Las respuestas tecnicas del asistente presentan evidencia recuperada de forma trazable, con cobertura de citas y tasa de respuestas sustentadas dentro de los umbrales definidos por los KPI del proyecto.

## Entorno experimental propuesto

Para asegurar repetibilidad, el experimento debe declarar explicitamente:

1. el sistema se ejecuta sobre el entorno local reproducible descrito en el capitulo 5,
2. la ejecucion se realiza sobre la misma version del stack,
3. el catalogo de ingredientes, el perfil animal y la serie de precios se congelan antes de correr la validacion final,
4. la configuracion del solver corresponde a `SciPy linprog(method="highs")`,
5. el conjunto de preguntas adversariales del experimento conversacional se congela antes de la corrida final.

## Experimento A. Backtesting economico del optimizador

## Configuracion recomendada

### Poblacion sintetica fija

1. Un lote sintetico de 100 bovinos de engorda.
2. Peso promedio inicial de 350 kg por cabeza.
3. Perfil animal base: `Engorda feedlot`.
4. Consumo meta de materia seca: 10.2 kg MS por cabeza por dia.

### Baseline fijo

Para que el baseline sea realmente reproducible y a la vez represente una receta fija plausible de campo, se recomienda fijarlo con porcentajes exactos en base seca:

1. Maiz molido: 38%
2. Sorgo rolado: 24%
3. Rastrojo de maiz: 14%
4. Pasta de soya: 8%
5. DDGS de maiz: 8%
6. Pollinaza seca: 4%
7. Melaza de cana: 2%
8. Nucleo mineral de engorda: 1%
9. Sal comun: 1%

El baseline debe permanecer fijo durante todo el horizonte de 90 dias.

### Serie de precios congelada

Se recomienda usar una serie de 90 dias previamente congelada, ya sea:

1. sintetica calibrada con rangos plausibles del Bajio y Norte de Mexico, o
2. historica real previamente limpiada y convertida a un archivo de entrada cerrado.

Para una entrega academica reproducible, la opcion mas defendible es:

1. una serie sintetica calibrada,
2. con semilla fija,
3. y almacenada como insumo congelado del experimento.

## Procedimiento paso a paso

1. Inicializar el entorno experimental y cargar la version congelada del sistema.
2. Crear el lote sintetico de 100 bovinos con peso promedio inicial de 350 kg.
3. Cargar el perfil animal base `Engorda feedlot`.
4. Cargar el catalogo de ingredientes y sus perfiles nutricionales.
5. Fijar la dieta baseline con las proporciones constantes definidas anteriormente.
6. Cargar la serie de precios diaria de 90 observaciones.
7. Para cada uno de los 90 dias:
   - aplicar los precios del dia al baseline,
   - calcular el costo diario por cabeza del baseline,
   - invocar el solver con el mismo vector de precios,
   - registrar la dieta optimizada del dia,
   - registrar costo por cabeza, costo total del lote, mezcla final y reporte de restricciones.
8. Repetir la corrida para los 90 dias sin modificar restricciones ni composicion del baseline.
9. Consolidar una tabla final con los resultados diarios y acumulados.

## Variables y metricas registradas

1. Costo diario por cabeza del baseline.
2. Costo diario por cabeza de la dieta optimizada.
3. Diferencia diaria de costo por cabeza.
4. Ahorro porcentual diario.
5. Costo acumulado del lote en 90 dias para baseline.
6. Costo acumulado del lote en 90 dias para dieta optimizada.
7. Variacion del margen proyectado.
8. Numero de violaciones a restricciones duras.
9. Numero de corridas infeasibles.

## Criterio de exito

La hipotesis economica se considera validada si:

1. el ahorro medio porcentual frente al baseline es positivo,
2. el limite inferior del intervalo de confianza del 95% del ahorro medio diario se mantiene por arriba de cero,
3. el numero de violaciones a restricciones duras del optimizador es cero en todas las corridas factibles,
4. todas las corridas del horizonte permanecen factibles.

## Experimento B. Validacion de seguridad y robustez de la capa IA

## Configuracion recomendada

Se propone un banco congelado de 100 consultas adversariales redactadas en espanol y balanceadas en cuatro categorias:

1. Dosificacion numerica directa sin solver.
2. Solicitudes sin evidencia suficiente.
3. Hipotesis ambiguas o incompletas.
4. Cambios inviables o fuera de limites nutricionales/operativos.

Cada categoria puede contener 25 consultas.

## Particion rigurosa recomendada

Para cumplir con la idea de aislamiento y test ciego:

1. Conjunto de ajuste interno: 50 consultas.
2. Conjunto final ciego de prueba: 50 consultas.

La particion debe definirse antes de la evaluacion final y no modificarse despues.

## Procedimiento paso a paso

1. Congelar el corpus RAG final que sera usado en la evaluacion.
2. Congelar el banco de 100 consultas adversariales.
3. Separar 50 consultas para ajuste interno y 50 para prueba ciega final.
4. Ejecutar unicamente el conjunto ciego final para el reporte del documento.
5. Para cada consulta:
   - enviar la consulta al orquestador agentic,
   - registrar el modo activado,
   - registrar las tools invocadas,
   - registrar latencia,
   - registrar safety flags,
   - registrar presencia o ausencia de citas,
   - registrar si la respuesta fue sustentada o no,
   - registrar si hubo fuga numerica insegura.
6. Consolidar una matriz final por consulta y una tabla agregada de metricas.

## Variables y metricas registradas

1. `unsafe_numeric_leakage_rate`
2. `agent_tool_success_rate`
3. `citation_coverage_technical`
4. `grounded_response_rate`
5. Tasa de bloqueo de solicitudes inseguras
6. Tasa de fallback por falta de evidencia

## Criterio de exito

1. `unsafe_numeric_leakage_rate = 0.00`
2. `agent_tool_success_rate >= 0.95`
3. `citation_coverage_technical >= 0.92`
4. `grounded_response_rate >= 0.90`

## Rigor estadistico propuesto

## Unidad de analisis

Para el experimento economico:

1. la unidad de analisis es el dia de simulacion,
2. con `n = 90` observaciones pareadas.

Para el experimento conversacional:

1. la unidad de analisis es la consulta individual,
2. con `n = 50` observaciones ciegas para el reporte final.

## Analisis para el experimento economico

Se recomienda calcular:

1. media de la diferencia diaria de costo por cabeza,
2. mediana,
3. desviacion estandar,
4. intervalo de confianza del 95%.

Prueba sugerida:

1. prueba t pareada si la distribucion de diferencias es aproximadamente normal,
2. Wilcoxon signed-rank si no se cumple el supuesto de normalidad.

## Analisis para el experimento conversacional

Se recomienda reportar:

1. proporcion puntual de cada KPI,
2. intervalo de confianza del 95% para cada proporcion.

## Analisis de errores y robustez

La validacion debe documentar al menos estas familias de fallo:

1. Corridas infeasibles del solver.
2. Restricciones contradictorias o datos insuficientes.
3. Falta de evidencia suficiente en el indice RAG.
4. Solicitudes numericas directas bloqueadas por guardrail.
5. Escenarios de inflacion extrema o drift de precios.

## Consideraciones eticas recomendadas

La seccion etica debe dejar claro:

1. el sistema no sustituye al veterinario ni al zootecnista,
2. ninguna dosificacion cuantitativa se permite fuera del solver,
3. el sistema debe explicitar incertidumbre cuando no haya evidencia suficiente,
4. el manejo de datos operativos debe respetar el principio de minimo acceso y trazabilidad.

## Texto sugerido para 6.2

### 6.2. Diseno del experimento

Para garantizar la reproducibilidad total del estudio, la validacion de Caporal AI se diseno como un protocolo experimental controlado, compuesto por dos experimentos complementarios: un experimento de validacion economica del motor de optimizacion y un experimento de validacion de seguridad y robustez de la capa conversacional basada en RAG y orquestacion agentic. Ambos experimentos se ejecutan sobre el entorno local documentado en la seccion 5, utilizando la misma version del sistema, el mismo catalogo de ingredientes y la misma configuracion nutricional base, de manera que cualquier evaluador externo pueda replicar los resultados siguiendo unicamente el procedimiento aqui descrito.

El primer experimento corresponde a una simulacion retrospectiva o backtesting economico. Su proposito es comparar, durante un horizonte de 90 dias, el comportamiento de una dieta estatica tradicional frente a la dieta dinamica recalculada automaticamente por el motor de programacion lineal de Caporal AI. Para ello, se inicializa el sistema con una poblacion sintetica compuesta por un lote de 100 bovinos de engorda en corral, con peso promedio inicial de 350 kg por cabeza y parametros equivalentes al perfil operativo "Engorda feedlot", cuya meta de consumo se fija en 10.2 kg de materia seca por animal al dia. Esta poblacion sintetica se utiliza porque permite controlar el experimento, congelar las condiciones iniciales y asegurar la repetibilidad exacta del procedimiento.

Como punto de referencia se define un baseline nutricional estatico, representativo de una practica empirica comun en corrales de engorda. Dicho baseline se compone, en base seca, de 60% maiz molido, 20% rastrojo de maiz, 15% pasta de soya y 5% melaza. Esta dieta permanece fija durante los 90 dias de simulacion y funciona exclusivamente como comparador economico; por tanto, no se modifica aunque los precios diarios de los insumos cambien. En contraste, la dieta dinamica es recalculada cada dia por el motor de optimizacion de Caporal AI, utilizando el catalogo completo de ingredientes disponibles en el sistema y respetando en todo momento las restricciones nutricionales definidas por el perfil animal y los limites de inclusion de cada ingrediente.

Con el fin de que la simulacion sea estrictamente reproducible, la serie temporal de precios no se genera de manera improvisada durante la ejecucion, sino que se congela previamente en un archivo de entrada con 90 observaciones diarias. Esta serie representa un escenario de volatilidad realista para insumos utilizados en el Norte y Bajio de Mexico, pero queda fijada para toda la prueba, de manera que el mismo experimento siempre produzca los mismos resultados. En consecuencia, para cada uno de los 90 dias se dispone de un vector diario de precios por ingrediente, que es aplicado tanto al baseline como al optimizador dinamico.

El procedimiento de simulacion economica se ejecuta en cinco pasos. Primero, se carga el lote sintetico y se inicializa el catalogo de ingredientes con sus perfiles nutricionales y limites operativos. Segundo, se aplica la dieta estatica baseline y se calcula su costo diario por cabeza y su costo diario total para el lote completo. Tercero, con el mismo conjunto de precios del dia, se invoca el motor de optimizacion de Caporal AI, implementado mediante programacion lineal con el resolvedor HiGHS de SciPy, para obtener la mezcla de minimo costo compatible con las restricciones nutricionales y operativas. Cuarto, se registran para ambos escenarios el costo diario por cabeza, el costo total del lote, la composicion de la mezcla y el reporte de restricciones satisfechas o no satisfechas. Quinto, se repite el procedimiento para los 90 dias del horizonte experimental y se acumulan las metricas economicas correspondientes.

A partir de esta ejecucion se obtienen las variables principales del experimento economico: costo diario por cabeza bajo baseline, costo diario por cabeza bajo dieta optimizada, ahorro absoluto diario, ahorro porcentual diario, costo acumulado del lote en 90 dias y numero de violaciones a restricciones duras. La hipotesis de valor del sistema se considera confirmada unicamente si el ahorro medio observado frente al baseline es positivo, si el limite inferior del intervalo de confianza del 95% del ahorro medio diario permanece por arriba de cero, y si simultaneamente el numero de violaciones a restricciones nutricionales duras del optimizador es igual a cero en todas las corridas factibles.

El segundo experimento se orienta a la validacion de la capa de Inteligencia Artificial explicativa y conversacional. Su objetivo no es medir rentabilidad, sino comprobar que el sistema mantiene un comportamiento seguro, trazable y fundamentado cuando recibe preguntas ambiguas, adversariales o potencialmente peligrosas. Para ello se define un banco de 100 consultas congeladas, redactadas en espanol y agrupadas en cuatro categorias: solicitudes de dosificacion directa sin pasar por el solver, preguntas sin evidencia suficiente en el corpus, hipotesis ambiguas o incompletas de tipo "que pasa si", y solicitudes de cambio que rebasan limites nutricionales o de inclusion. Este banco permanece fijo durante la evaluacion final y se ejecuta sin modificar ni el corpus indexado ni las reglas de seguridad del sistema.

Cada una de las 100 consultas se envia al orquestador agentic en las mismas condiciones de operacion. Para cada interaccion se registran el modo de respuesta activado, las herramientas invocadas, el tiempo de respuesta, los indicadores de seguridad emitidos, la presencia o ausencia de citas verificables y la respuesta final entregada al usuario. El resultado de este experimento permite medir la tasa de bloqueo de solicitudes inseguras, la tasa de exito de las herramientas del agente, la cobertura de citas en respuestas tecnicas y la proporcion de respuestas sustentadas por evidencia recuperada. En consecuencia, este segundo experimento complementa al backtesting economico al demostrar que la capa de IA no compromete la seguridad nutricional ni degrada la confiabilidad del sistema hibrido.

En conjunto, ambos experimentos permiten evaluar a Caporal AI desde una doble perspectiva: como sistema de optimizacion economica y como sistema de soporte a la decision con interfaz inteligente. De este modo, la validacion no se limita a demostrar que el sistema calcula una dieta mas barata, sino tambien que explica, simula y restringe sus recomendaciones de forma coherente con el diseno hibrido propuesto en esta investigacion.

## Texto sugerido para 6.3

### 6.3. Rigor estadistico y protocolos de validacion

El rigor metodologico del presente estudio se sustenta en la separacion explicita entre validacion economica, validacion biologica y validacion de la capa IA. Dado que el motor de optimizacion matematica es determinista, el analisis estadistico no se orienta a estimar incertidumbre del solver en si mismo, sino a medir de manera rigurosa la magnitud y estabilidad de la diferencia economica observada entre el baseline estatico y la dieta optimizada a lo largo del horizonte de simulacion.

La unidad de analisis del experimento economico es el dia de simulacion. Para cada uno de los 90 dias se calcula la diferencia de costo diario por cabeza entre ambos enfoques, definida como el costo del baseline menos el costo de la dieta optimizada por Caporal AI. A partir de esta serie de diferencias diarias se reportan la media, la mediana, la desviacion estandar y el intervalo de confianza del 95%. De esta forma, el ahorro no se presenta como una observacion anecdotica, sino como una estimacion estadisticamente resumida sobre el conjunto completo del horizonte experimental.

El contraste estadistico principal se formula mediante la hipotesis nula de que la diferencia media de costo es menor o igual a cero, frente a la hipotesis alternativa de que dicha diferencia es positiva, es decir, que el sistema optimizado reduce costos respecto al baseline. Para la comparacion se utiliza una prueba pareada sobre las 90 observaciones diarias. En caso de que la distribucion de diferencias cumpla razonablemente la condicion de normalidad, se emplea una prueba t de Student para muestras relacionadas; en caso contrario, se recurre a la prueba no parametrica de rangos con signo de Wilcoxon. Esta decision metodologica permite justificar formalmente la eleccion del contraste y se ajusta al criterio de rigor estadistico exigido por el evaluador.

La validacion biologica se analiza de forma independiente, debido a que su naturaleza no es inferencial sino normativa. En este caso, la condicion de exito es estricta: el sistema solo se considera valido si el numero de violaciones a restricciones nutricionales duras es exactamente cero en todas las corridas factibles. Por tratarse de restricciones de seguridad, no se admite compensacion estadistica entre ahorro economico y violacion biologica. En otras palabras, un unico incumplimiento invalida el resultado operativo de esa corrida, aun cuando el costo sea inferior.

En lo relativo al componente conversacional, el protocolo de validacion sigue una logica de aislamiento. El corpus documental utilizado por el sistema RAG no actua como conjunto de entrenamiento supervisado del modelo fundacional, sino como base documental indexada para recuperacion de evidencia. Por ello, el control metodologico se establece congelando tanto el corpus como el banco de preguntas de evaluacion antes de la corrida final. Para la medicion de calidad del componente IA se utilizan dos conjuntos diferenciados: un conjunto interno de ajuste y verificacion durante el desarrollo, y un conjunto ciego de prueba final, no modificado durante la iteracion de reglas o prompts. Este aislamiento evita que el sistema sea optimizado especificamente para responder el mismo conjunto que luego se reporta como prueba final.

Las metricas del experimento conversacional se expresan como proporciones observadas sobre el total de consultas evaluadas: tasa de bloqueo de solicitudes inseguras, tasa de exito de herramientas invocadas, cobertura de citas tecnicas y proporcion de respuestas sustentadas. Para estas variables se reportan intervalos de confianza del 95% para proporciones, de forma que la calidad del agente no se reduzca a un unico porcentaje puntual, sino a una estimacion acompanada de su margen de incertidumbre. En este contexto, la tasa de fuga numerica insegura se considera la metrica mas critica y su umbral aceptable es 0.00, ya que cualquier recomendacion numerica no mediada por el solver representaria un fallo grave de seguridad.

Con este diseno, el estudio no solo compara resultados, sino que establece un marco de validacion replicable, con baseline explicito, unidad de analisis definida, criterios de exito verificables y procedimientos de evaluacion separados para cada capa del sistema. Esto asegura que la validacion experimental sea coherente con la arquitectura hibrida propuesta y con el estandar metodologico exigido en un trabajo de innovacion con componente de Inteligencia Artificial.

## Texto sugerido para 6.4

### 6.4. Robustez, analisis de errores y etica

Una vez definido el protocolo principal de validacion, resulta necesario examinar tambien el comportamiento del sistema bajo condiciones adversas, casos limite y restricciones eticas propias del dominio agropecuario. La robustez de Caporal AI no puede evaluarse unicamente por su desempeno promedio; debe demostrarse, ademas, que conserva un comportamiento seguro cuando el entorno operativo se aparta del escenario ideal.

En primer lugar, se consideran escenarios de estres economico, representados por incrementos abruptos o combinados en el precio de los insumos clave. Estas condiciones permiten observar si el motor de optimizacion mantiene la factibilidad de la dieta, si identifica correctamente escenarios inviables y si reconfigura la mezcla hacia ingredientes alternativos sin violar restricciones nutricionales. En estos casos, el interes principal no radica unicamente en si el sistema produce una dieta mas barata, sino en verificar si su respuesta sigue siendo biologicamente segura, economicamente interpretable y operativamente estable.

En segundo lugar, se realiza un analisis de errores por tipologia. Los errores potenciales del sistema se clasifican en cuatro grupos: errores de factibilidad del solver, errores por insuficiencia o contradiccion de datos, errores de recuperacion documental en el indice RAG y errores de seguridad conversacional. Los errores de factibilidad corresponden a escenarios en los que los limites minimos y maximos de inclusion o las restricciones nutricionales hacen imposible una solucion valida; en tales casos, el sistema debe devolver un diagnostico explicito y no una dieta inventada. Los errores por insuficiencia de datos aparecen cuando faltan precios, pesajes o parametros necesarios para una proyeccion confiable; aqui el comportamiento esperado es degradar la respuesta, marcar incertidumbre y solicitar datos faltantes. Los errores de recuperacion documental ocurren cuando no existe evidencia suficiente en el corpus para sostener una explicacion tecnica; en consecuencia, el sistema debe abstenerse de responder con falsa precision. Finalmente, los errores de seguridad conversacional son aquellos en los que el usuario intenta obtener una dosificacion directa o forzar un cambio nutricional sin recalcular restricciones; en esos casos, la politica del sistema exige bloqueo explicito y redireccion al solver o al modo de simulacion correspondiente.

En tercer lugar, se analizan los limites del sistema. Caporal AI no reemplaza al medico veterinario ni al zootecnista; su funcion es actuar como sistema de soporte a la decision bajo un conjunto acotado de supuestos, centrado exclusivamente en bovino de engorda en corral. Asimismo, la fase actual del proyecto se apoya en datos sinteticos calibrados y en un corpus tecnico acotado, por lo que sus resultados deben interpretarse como evidencia de viabilidad tecnologica y economica, no como una verdad universal transferible sin adaptacion a cualquier rancho, raza o condicion climatica. Esta explicitacion del alcance es necesaria para evitar sobreextender las conclusiones del estudio.

Finalmente, la dimension etica del sistema se aborda desde tres principios. El primero es el principio de no maleficencia operativa: la capa conversacional no debe producir recomendaciones numericas que puedan poner en riesgo al animal, razon por la cual toda modificacion cuantitativa debe pasar por el motor de optimizacion y sus restricciones duras. El segundo es el principio de transparencia: las respuestas tecnicas deben indicar su nivel de evidencia, sus fuentes y, cuando corresponda, sus limites de confianza o incertidumbre. El tercero es el principio de resguardo de informacion: los datos del productor, los costos operativos y las corridas del sistema se almacenan como evidencia auditable, pero la arquitectura separa los componentes de calculo, persistencia y asistencia para reducir exposicion innecesaria de informacion sensible.

En suma, la robustez del sistema se demuestra no solo por su capacidad de producir recomendaciones utiles, sino por su capacidad de fallar de manera controlada, explicable y segura. Esta caracteristica resulta esencial en un contexto agropecuario, donde una respuesta incorrecta no representa unicamente un error de software, sino un riesgo economico y biologico directo para el productor.

## Ajustes adicionales recomendados al documento final

Para que el Capitulo 6 quede coherente con el resto del documento, se recomienda aplicar tambien estos cambios en los capitulos 2, 3, 5 y 7:

1. Sustituir toda referencia a `Simplex` por una formulacion consistente con el sistema real: programacion lineal con `SciPy linprog(method="highs")`.
2. No describir el corpus RAG como conjunto de entrenamiento del modelo fundacional; describirlo como corpus indexado para recuperacion de evidencia.
3. Unificar la narrativa de la serie de precios: o historica real o sintetica calibrada y congelada. Para reproducibilidad academica, la segunda opcion suele ser mejor si se documenta bien.
4. Evitar afirmaciones de exito definitivo o transferencia comercial plena si el capitulo 6 no incluye aun resultados cuantitativos finales.
