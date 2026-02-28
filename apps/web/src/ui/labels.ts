export const nutrientLabels: Record<string, string> = {
  CP: 'Proteina (fuerza de crecimiento)',
  NDF: 'Fibra (salud digestiva)',
  ME_MCAL_KGDM: 'Energia util',
  Ca: 'Calcio',
  P: 'Fosforo',
};

export const constraintLabels: Record<string, string> = {
  TOTAL_DM: 'Cantidad total de alimento seco al dia',
  CP: 'Proteina minima y maxima',
  NDF: 'Fibra minima y maxima',
  ME_MCAL_KGDM: 'Energia util de la dieta',
  Ca: 'Calcio en rango seguro',
  P: 'Fosforo en rango seguro',
};

export const safetyFlagLabels: Record<string, string> = {
  UNSAFE_REQUEST_BLOCKED: 'Se bloqueo una sugerencia numerica para proteger la seguridad.',
  NEEDS_MORE_INPUT: 'Faltan datos para responder con precision.',
  NEEDS_RAG_INDEX: 'Aun no hay suficientes documentos para sustentar la respuesta.',
};

export const statusLabels: Record<string, string> = {
  SUCCESS: 'Lista para usar',
  INFEASIBLE: 'No se pudo encontrar mezcla valida',
  ERROR: 'Ocurrio un error de calculo',
};
