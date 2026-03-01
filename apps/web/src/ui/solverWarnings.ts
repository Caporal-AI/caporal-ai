export function normalizeSolverWarning(rawWarning: string): string {
  const compact = rawWarning.trim();
  const lower = compact.toLowerCase();
  const lowerBoundsMatch = compact.match(
    /Lower bounds sum\s*\(([\d.]+)\)\s*exceeds intake target\s*\(([\d.]+)\)\.?/i,
  );
  if (lowerBoundsMatch) {
    const lowerTotal = Number(lowerBoundsMatch[1]);
    const intakeTarget = Number(lowerBoundsMatch[2]);
    const excess = lowerTotal - intakeTarget;
    const excessPct = intakeTarget > 0 ? (excess / intakeTarget) * 100 : 0;
    return `La suma de minimos es ${lowerTotal.toFixed(2)} kg MS/dia y rebasa la meta de ${intakeTarget.toFixed(2)} kg MS/dia (+${excess.toFixed(2)} kg, ${excessPct.toFixed(2)}%).`;
  }

  const upperBoundsMatch = compact.match(
    /Upper bounds sum\s*\(([\d.]+)\)\s*is below intake target\s*\(([\d.]+)\)\.?/i,
  );
  if (upperBoundsMatch) {
    const upperTotal = Number(upperBoundsMatch[1]);
    const intakeTarget = Number(upperBoundsMatch[2]);
    const gap = intakeTarget - upperTotal;
    const gapPct = intakeTarget > 0 ? (gap / intakeTarget) * 100 : 0;
    return `La suma de maximos es ${upperTotal.toFixed(2)} kg MS/dia y queda debajo de la meta de ${intakeTarget.toFixed(2)} kg MS/dia (-${gap.toFixed(2)} kg, ${gapPct.toFixed(2)}%).`;
  }

  const conflictMinMatch = compact.match(
    /Constraint conflict:\s*([A-Z_]+)\s*minimum\s*([\d.+-]+|nan)\s*exceeds achievable maximum\s*([\d.+-]+|nan)\.?/i,
  );
  if (conflictMinMatch) {
    const code = conflictMinMatch[1];
    const minRequested = safeParse(conflictMinMatch[2]);
    const maxAchievable = safeParse(conflictMinMatch[3]);
    return `Conflicto de restriccion en ${code}: el minimo pedido (${formatNumber(minRequested)}) es mayor al maximo alcanzable (${formatNumber(maxAchievable)}).`;
  }

  const conflictMaxMatch = compact.match(
    /Constraint conflict:\s*([A-Z_]+)\s*maximum\s*([\d.+-]+|nan)\s*is below achievable minimum\s*([\d.+-]+|nan)\.?/i,
  );
  if (conflictMaxMatch) {
    const code = conflictMaxMatch[1];
    const maxRequested = safeParse(conflictMaxMatch[2]);
    const minAchievable = safeParse(conflictMaxMatch[3]);
    return `Conflicto de restriccion en ${code}: el maximo pedido (${formatNumber(maxRequested)}) queda por debajo del minimo alcanzable (${formatNumber(minAchievable)}).`;
  }

  if (lower.includes('lower bounds sum') && lower.includes('exceeds intake target')) {
    return 'La suma de minimos exigidos supera el consumo objetivo de materia seca.';
  }
  if (lower.includes('upper bounds sum') && lower.includes('below intake target')) {
    return 'La suma de maximos permitidos no alcanza el consumo objetivo de materia seca.';
  }
  if (lower.includes('relax') && lower.includes('minimum inclusion constraints')) {
    return 'Se requiere bajar uno o mas minimos de inclusion para recuperar factibilidad.';
  }
  if (lower.includes('increase') && lower.includes('maximum inclusion constraints')) {
    return 'Se requiere subir uno o mas maximos de inclusion para recuperar factibilidad.';
  }
  if (lower.includes('relax minimum bound for')) {
    const code = compact.split('for').at(-1)?.trim().replace(/\.$/, '');
    return code
      ? `Se recomienda relajar el minimo de la restriccion ${code}.`
      : 'Se recomienda relajar al menos un minimo de restriccion nutricional.';
  }
  if (lower.includes('relax maximum bound for')) {
    const code = compact.split('for').at(-1)?.trim().replace(/\.$/, '');
    return code
      ? `Se recomienda relajar el maximo de la restriccion ${code}.`
      : 'Se recomienda relajar al menos un maximo de restriccion nutricional.';
  }
  if (lower.includes('infeasible') || lower.includes('no feasible solution')) {
    return 'No existe una mezcla que cumpla todas las restricciones al mismo tiempo.';
  }
  if (lower.includes('failed') && lower.includes('solver')) {
    return 'El motor de calculo no pudo completar la corrida con la configuracion actual.';
  }

  if (looksLikeEnglish(lower)) {
    return 'El motor detecto un conflicto en restricciones o limites; revisa minimos, maximos y precios.';
  }

  return compact;
}

function safeParse(raw: string): number | null {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number | null): string {
  if (value === null) {
    return 'no calculable';
  }
  return value.toFixed(4);
}

function looksLikeEnglish(value: string): boolean {
  return (
    value.includes('lower') ||
    value.includes('bounds') ||
    value.includes('exceeds') ||
    value.includes('target') ||
    value.includes('suggestion') ||
    value.includes('constraints') ||
    value.includes('solver') ||
    value.includes('failed') ||
    value.includes('infeasible')
  );
}
