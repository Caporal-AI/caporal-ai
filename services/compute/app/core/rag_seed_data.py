from __future__ import annotations

SEED_RAG_DOCUMENTS = [
    {
        "title": "Limite de pollinaza en finalizacion",
        "content": "La pollinaza puede utilizarse como fuente de nitrogeno y minerales, pero en corral de engorda debe mantenerse en niveles moderados por riesgo microbiologico y variabilidad.",
    },
    {
        "title": "Fibra efectiva y salud ruminal",
        "content": "Raciones de alta energia requieren una base minima de fibra detergente neutro para sostener masticacion, pH ruminal y prevenir acidosis subclinica.",
    },
    {
        "title": "Uso de urea en bovinos de engorda",
        "content": "La urea es nitrogeno no proteico de liberacion rapida. Se recomienda limitar inclusion y asegurar carbohidratos fermentables y mezclado uniforme.",
    },
    {
        "title": "Relacion calcio fosforo",
        "content": "En dietas de finalizacion, la relacion Ca:P debe mantenerse en un rango seguro para optimizar metabolismo y reducir riesgos oseos y urinarios.",
    },
    {
        "title": "Energia metabolizable en finalizacion",
        "content": "La energia metabolizable por kg de materia seca condiciona ganancia diaria y conversion. Un exceso sin fibra suficiente incrementa riesgo de trastornos digestivos.",
    },
    {
        "title": "Pasta de soya como fuente proteica",
        "content": "La pasta de soya aporta proteina de alta calidad. Su inclusion depende del balance de costo y del aporte proteico de otros ingredientes como DDGS o canola.",
    },
    {
        "title": "Cascarilla de soya y llenado ruminal",
        "content": "La cascarilla de soya aporta fibra altamente digestible y puede apoyar consumo sin elevar demasiado almidon, dependiendo del objetivo energetico.",
    },
    {
        "title": "Melaza y palatabilidad",
        "content": "La melaza mejora palatabilidad y ayuda a controlar polvo en mezclas. Inclusion alta puede desbalancear humedad y azucares rapidamente fermentables.",
    },
    {
        "title": "DDGS en dietas de corral",
        "content": "El DDGS aporta energia, proteina y fosforo. Es util para bajar costo, pero debe vigilarse su variabilidad y el impacto en la relacion Ca:P.",
    },
    {
        "title": "Rastrojo de maiz en engorda",
        "content": "El rastrojo aporta fibra fisica pero baja densidad energetica. Su nivel se ajusta para mantener salud ruminal sin penalizar ganancia esperada.",
    },
    {
        "title": "Alfalfa en dietas de transicion",
        "content": "La alfalfa eleva fibra y calcio. Puede ser util en transiciones de recepcion a finalizacion para estabilizar consumo y rumia.",
    },
    {
        "title": "Sales minerales en mezclas de engorda",
        "content": "El nucleo mineral y la sal comun corrigen deficiencias de macro y micro minerales. Deben incluirse de manera consistente y con control de dosificacion.",
    },
    {
        "title": "Costo minimo con restricciones duras",
        "content": "La formulacion por programacion lineal busca el menor costo cumpliendo restricciones nutricionales y operativas sin violar limites definidos.",
    },
    {
        "title": "Regla de seguridad del asistente",
        "content": "El asistente puede explicar decisiones de formulacion, pero cualquier cambio numerico de inclusion debe recalcularse en el solver optimizador.",
    },
    {
        "title": "Interpretacion de restricciones no satisfechas",
        "content": "Cuando una restriccion no se cumple, se recomienda revisar primero limites de inclusion y disponibilidad de ingredientes antes de relajar el objetivo nutricional.",
    },
    {
        "title": "Control de acidosis en engorda intensiva",
        "content": "La combinacion de almidon elevado y poca fibra efectiva incrementa riesgo de acidosis. Ajustes deben priorizar estabilidad ruminal y transiciones graduales.",
    },
    {
        "title": "Calidad de mezclado y variacion diaria",
        "content": "Incluso una dieta formulada correctamente puede fallar en campo si la variacion de mezclado no se controla en la planta de alimento.",
    },
    {
        "title": "Monitoreo de consumo en corral",
        "content": "Cambios bruscos de consumo diario deben investigarse antes de modificar formulacion; pueden reflejar manejo, clima o sanidad, no solo la dieta.",
    },
    {
        "title": "Manejo de transiciones dietarias",
        "content": "Las transiciones entre dietas deben ser escalonadas para evitar caidas de consumo y alteraciones del ambiente ruminal.",
    },
    {
        "title": "Importancia de la materia seca",
        "content": "Todos los balances nutricionales deben evaluarse en base de materia seca para comparar correctamente ingredientes con diferente humedad.",
    },
    {
        "title": "Variacion de precios y reformulacion",
        "content": "Actualizaciones de precios pueden cambiar la mezcla optima sin alterar restricciones. Conviene recalcular la dieta con frecuencia semanal o diaria.",
    },
    {
        "title": "Limites operativos de inclusion",
        "content": "Los limites minimos y maximos por ingrediente reflejan disponibilidad, manejo y seguridad. Son restricciones duras en el MVP.",
    },
    {
        "title": "Relevancia del historial de corridas",
        "content": "Guardar snapshots de entrada y salida permite auditar decisiones, comparar escenarios y detectar cambios de comportamiento del solver.",
    },
    {
        "title": "Buenas practicas de formulacion",
        "content": "Una formulacion robusta combina economia, seguridad nutricional y consistencia operacional para sostener desempeno en engorda comercial.",
    },
]
