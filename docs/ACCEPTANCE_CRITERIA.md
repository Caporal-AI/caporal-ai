# Caporal AI - Criterios de Aceptacion

## Criterios funcionales

1. Un usuario puede crear lote, registrar pesaje y generar plan semanal.
2. El solver no entrega mezcla que viole restricciones duras en corridas factibles.
3. El asistente responde con citas y bloquea cambios numericos directos de dosificacion.
4. El sistema devuelve proyeccion de crecimiento, margen y senal de venta por lote.
5. Corridas y proyecciones se persisten para auditoria.

## Criterios tecnicos

1. API compila con `npm run build`.
2. Web compila con `npm run build`.
3. Compute pasa pruebas con `pytest`.
4. API pasa pruebas con `jest`.
5. Stack levanta con `docker compose up --build -d`.

## Criterios de UX

1. Existe flujo guiado para no expertos en la UI de lotes.
2. Se muestran indicadores legibles: costo semanal, ganancia diaria, margen, recomendacion de venta.
3. El usuario puede llegar a una recomendacion operativa en menos de 5 minutos usando datos base.
