Este documento refina la propuesta técnica y estratégica del sistema **Ganadero IA**, centrándose en la integración de Inteligencia Artificial (IA) para transformar un "calculador de dietas" en un **Sistema de Soporte a la Decisión (DSS)** de alto impacto para el mercado mexicano.

---

# REFINAMIENTO ESTRATÉGICO: SISTEMA DE INTELIGENCIA HÍBRIDA PARA ENGORDA (FEEDLOT)

## 1. El Valor Diferencial: Más allá del Solver Matemático

El motor de cálculo (programación lineal para costo mínimo) es un commodity técnico. El valor real para el productor 
del Bajío no es solo el "qué", sino el **"por qué"** y el **"qué sigue"**. La IA aporta valor en tres niveles:

### A. Orquestador Agentic (RAG + LLM)

En lugar de una interfaz de formularios estática, el sistema utiliza un **Agente de Razonamiento**.

* **Contextualización Local:** El RAG no solo consulta tablas del NRC (National Research Council), sino que indexa 
* documentos técnicos sobre el uso de pollinaza, rastrojo y subproductos de panadería específicos de México.
* **Interpretación de Resultados:** El LLM traduce la salida del *Solver* (ej. "85% Maíz, 15% Soya") 
* a lenguaje humano: *"He aumentado el maíz debido a la caída de precio de ayer, lo que reduce tu costo por kilo 
* ganado en un 4.2% sin comprometer la ganancia diaria de peso"*.

### B. Visión de Computadora y OCR (Data Entry Simplificado)

El mayor punto de falla en el campo es la captura de datos.

* **Digitización de Insumos:** El usuario fotografía la etiqueta del núcleo mineral o la nota de remisión del sorgo. 
* La IA extrae los valores nutricionales y costos automáticamente (OCR + NER), actualizando el *Solver* en tiempo real.
* **Análisis de Condición:** (Fase post-MVP) Análisis de bosta (estiércol) mediante imágenes para detectar acidosis o 
* ineficiencia de digestión de grano.

### C. Analítica Predictiva de Mercado

* **Arbitraje de Insumos:** La IA analiza tendencias de precios locales. Si detecta una tendencia al alza en la soya, 
* sugiere proactivamente: *"Compra ahora para los próximos 3 meses o sustituye por DDGS de maíz según la proyección de 
* costos"*.

---

## 2. Arquitectura de Software Refinada (Hexagonal)

Para garantizar escalabilidad y desacoplamiento de los modelos de IA, se implementará una **Arquitectura Hexagonal** 
en el Backend.

### Backend (NestJS + TypeScript)

* **Domain:** Entidades (`Animal`, `Lot`, `Diet`, `Ingredient`) y lógica de negocio pura.
* **Adapters:**
* `Primary`: REST Controllers y Gateways de WebSockets para telemetría.
* `Secondary`: TypeORM para PostgreSQL, Redis para caché de precios, e interfaces para los microservicios de Python.



### AI Engine (Python + FastAPI)

Microservicio especializado encargado de:

* **Optimization Service:** Implementación de `SciPy.optimize` para el cálculo de dietas.
* **Embedding Service:** Procesamiento de documentos técnicos para la Vector DB (Pinecone o Milvus).
* **Inference Service:** Conexión con modelos fundacionales (GPT-4o o Claude 3.5) vía RAG para la interfaz de chat.

### Frontend (React + TS + RTK Query)

* **Dashboard Declarativo:** Visualización de la curva de crecimiento real vs. proyectada (Chart.js/Recharts).
* **State Management:** RTK Query para el manejo de caché de datos del inventario de ganado.

---

## 3. Implementación de Datos Sintéticos y Refinamiento (Plan de Arranque)

Dado el "muro" de la falta de datos históricos en México, el sistema operará bajo un modelo de **Cold Start**.

1. **Semilla de Datos:** Generación de un dataset sintético basado en las ecuaciones de crecimiento del NRC para cruzas 
2. de *Bos Indicus* x *Bos Taurus* bajo estrés calórico.
2. **Bucle de Aprendizaje (Active Learning):** Conforme el productor ingresa pesajes reales cada 15-30 días, el sistema 
3. ajusta los coeficientes de eficiencia del modelo predictivo para ese rancho específico.

---

## 4. Definición Técnica del MVP (Scope Estricto)

| Módulo | Alcance Técnico |
| --- | --- |
| **Diet Optimizer** | Solver de costo mínimo con restricción de proteína, energía y fibra efectiva. |
| **Inventory Management** | Registro individual y por lotes (Raza, Peso, Salud). |
| **Expert Chat (RAG)** | Interfaz de lenguaje natural alimentada por guías de manejo de ganado en México. |
| **Financial Tracker** | Costo del kilo producido vs. precio de venta proyectado. |

---

## 5. Ejemplo de Lógica de Dominio (Code Snippet)

```typescript
// domain/models/diet-optimization.entity.ts

/**
 * Representa el resultado de una optimización de ración.
 * Basado en requerimientos nutricionales específicos del lote.
 */
export interface OptimizedDiet {
  readonly id: string;
  readonly lotId: string;
  readonly ingredients: Array<{
    ingredientId: string;
    inclusionPercentage: number; // Percent of total Dry Matter
    asFedWeightKg: number;      // Actual weight to be mixed
  }>;
  readonly totalCostPerKg: number;
  readonly expectedDailyGain: number; // In Kilograms (ADG)
  readonly createdAt: Date;
}

/**
 * Service interface for the AI Solver Adapter.
 */
export interface IDietSolver {
  /**
   * Calculates the least-cost ration using linear programming.
   * @param requirements - Target protein, energy, and fiber.
   * @param availableIngredients - Current stock and market prices.
   * @returns Optimized diet structure.
   */
  calculate(
    requirements: NutritionalRequirements,
    availableIngredients: IngredientStock[]
  ): Promise<OptimizedDiet>;
}

```

---

## 6. Siguientes Pasos de Ingeniería

1. **Modelado de Base de Datos:** Diseñar el esquema en PostgreSQL para soportar la trazabilidad individual del ganado 
2. y las versiones de dietas.
2. **Integración de LLM:** Configurar el pipeline de RAG utilizando `LangChain` o `LlamaIndex` para indexar la 
3. literatura técnica seleccionada.
3. **Dockerization:** Configurar el `docker-compose.yml` para correr el API de NestJS, el servicio de optimización en 
4. Python y la base de datos de vectores en un entorno RedHat/WSL.

