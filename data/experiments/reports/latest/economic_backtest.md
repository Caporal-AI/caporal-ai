# Experimento A - Backtesting economico

- Corrida: `chapter6-v1`
- Dias evaluados: 90
- Dias factibles: 90
- Dias infeasible: 0
- Costo baseline promedio: 80.49 MXN/cabeza/dia
- Costo optimizado promedio: 60.16 MXN/cabeza/dia
- Ahorro promedio: 20.33 MXN/cabeza/dia (25.24%)
- IC 95% del ahorro medio: [20.01, 20.62] MXN/cabeza/dia
- Costo total baseline por lote: 724409.27 MXN
- Costo total optimizado por lote: 541461.86 MXN
- Ahorro total del lote: 182947.42 MXN
- Violaciones duras baseline: 0
- Violaciones duras optimizado: 0

## Baseline usado

- Racion fija operacional de referencia para corral de engorda. Representa una mezcla estatica tecnicamente plausible usada como comparador economico, sin recalculo diario ante volatilidad de precios.

## Criterios de aceptacion

- Ahorro medio porcentual positivo: SI
- Limite inferior del IC95% del ahorro por arriba de cero: SI
- Todas las corridas factibles en el horizonte: SI
- Corridas optimizadas sin violaciones duras: SI
- Veredicto global: PASS
