# Caporal AI - Guia Rapida de Uso

## Documentos de apoyo

1. `CODEBASE_GUIDE_45M.md`: guia tecnica para entender el codebase completo.
2. `HANDS_ON_VALIDATION_20M.md`: pruebas manuales reproducibles en 20 minutos.
3. `RAG_INGESTION_PACKAGE.md`: flujo de carga de conocimiento y benchmark de calidad IA.
4. `architecture-caporal-ai.svg`: diagrama de arquitectura y flujos.

## 1) Preparar entorno

1. Ejecuta `docker compose -f infra/docker-compose.yml up --build -d`.
2. Abre `http://localhost:5174`.

## 2) Configurar ingredientes y precios

1. En la pestaña `Ingredientes`, ajusta materia seca, limites y nutrientes.
2. Registra precio vigente por ingrediente.

## 3) Trabajar por lote

1. Ve a `Lotes y plan semanal`.
2. Crea un lote con cabezas y peso inicial.
3. Registra al menos un pesaje.
4. Selecciona perfil animal y horizonte.
5. Pulsa `Generar plan semanal`.

## 4) Interpretar resultados

1. Revisa costo semanal por lote.
2. Revisa curva de crecimiento semanal.
3. Revisa margen proyectado por cabeza.
4. Revisa la `senal de venta`.

## 5) Consultar asistente

1. Ve a `Asistente`.
2. Haz preguntas sobre el por que de la formulacion.
3. Si preguntas cantidades exactas, el asistente te redirige al solver por seguridad.
