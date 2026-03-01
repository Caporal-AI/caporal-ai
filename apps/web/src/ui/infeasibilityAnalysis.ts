import type {
  DietRun,
  InfeasibilityAnalysis,
  InfeasibilityPriorityAction,
  InfeasibilityReasonCode,
} from '../types';

const LOWER_BOUNDS_RE = /suma de minimos.*?([\d.]+)\s*kg.*?meta.*?([\d.]+)\s*kg/i;
const UPPER_BOUNDS_RE = /suma de maximos.*?([\d.]+)\s*kg.*?(?:meta|objetivo).*?([\d.]+)\s*kg/i;
const EN_LOWER_RE = /lower bounds sum\s*\(([\d.]+)\)\s*exceeds intake target\s*\(([\d.]+)\)/i;
const EN_UPPER_RE = /upper bounds sum\s*\(([\d.]+)\)\s*is below intake target\s*\(([\d.]+)\)/i;
const EN_CONFLICT_RE =
  /constraint conflict:\s*([A-Z_]+)\s*(minimum|maximum)\s*([\d.]+)\s*(?:exceeds achievable maximum|is below achievable minimum)\s*([\d.]+)/i;

export function getInfeasibilityAnalysis(dietRun: DietRun): InfeasibilityAnalysis | null {
  if (dietRun.status !== 'INFEASIBLE') {
    return null;
  }

  const nativeAnalysis = dietRun.solutionSnapshotJson.infeasibilityAnalysis;
  if (nativeAnalysis) {
    return normalizeAnalysisTexts(nativeAnalysis);
  }

  return deriveFallbackAnalysis(dietRun);
}

function deriveFallbackAnalysis(dietRun: DietRun): InfeasibilityAnalysis | null {
  const ingredients = dietRun.inputsSnapshotJson.ingredients ?? [];
  const warnings = dietRun.solutionSnapshotJson.warnings ?? [];
  const intake = dietRun.inputsSnapshotJson.animalProfile?.intakeDmKgPerDay ?? 0;
  const warningText = warnings.join(' | ');
  const lower = warningText.toLowerCase();

  const lowerMatch = warningText.match(EN_LOWER_RE) ?? warningText.match(LOWER_BOUNDS_RE);
  if (lowerMatch) {
    const lowerSum = Number(lowerMatch[1]);
    const intakeTarget = Number(lowerMatch[2]) || intake;
    return buildBoundsAnalysis({
      reasonCode: 'LOWER_BOUNDS_SUM',
      summary: buildLowerSummary(lowerSum, intakeTarget),
      ingredients,
      targetExcessPct: intakeTarget > 0 ? Math.max(0, ((lowerSum - intakeTarget) / intakeTarget) * 100) : 0,
      mode: 'MIN',
    });
  }

  const upperMatch = warningText.match(EN_UPPER_RE) ?? warningText.match(UPPER_BOUNDS_RE);
  if (upperMatch) {
    const upperSum = Number(upperMatch[1]);
    const intakeTarget = Number(upperMatch[2]) || intake;
    return buildBoundsAnalysis({
      reasonCode: 'UPPER_BOUNDS_SUM',
      summary: buildUpperSummary(upperSum, intakeTarget),
      ingredients,
      targetExcessPct: intakeTarget > 0 ? Math.max(0, ((intakeTarget - upperSum) / intakeTarget) * 100) : 0,
      mode: 'MAX',
    });
  }

  const conflictMatch = warningText.match(EN_CONFLICT_RE);
  if (conflictMatch) {
    const code = conflictMatch[1];
    const kind = conflictMatch[2]?.toLowerCase();
    const ingredientActions = buildConstraintIngredientActions(
      ingredients,
      code,
      kind === 'minimum' ? 'RAISE_NUTRIENT' : 'LOWER_NUTRIENT',
      2,
    );
    const fallbackActions =
      ingredientActions.length > 0 ? [] : buildFallbackBoundActions(ingredients, 2);
    return {
      reasonCode: 'CONSTRAINT_CONFLICT',
      summary: `Existe conflicto en la restriccion ${code}; los limites de ingredientes no alcanzan la meta.`,
      priorityActions: [
        {
          priority: 1,
          title: `Revisar restriccion ${code}`,
          reason: 'Al menos una meta nutricional no es alcanzable con los limites actuales.',
          constraintCode: code,
        },
        ...ingredientActions,
        ...fallbackActions,
      ],
      alternatives: [
        {
          title: 'Ajuste temporal de restriccion',
          summary: 'Relaja el limite conflictivo y vuelve a correr el solver para recuperar factibilidad.',
          tradeoff: 'Puede reducir precision nutricional en corto plazo.',
        },
      ],
    };
  }

  if (warnings.length === 0 && ingredients.length === 0) {
    return null;
  }

  return {
    reasonCode: 'UNKNOWN',
    summary: 'No fue posible construir mezcla valida con la configuracion actual.',
    priorityActions: buildGenericActions(ingredients),
    alternatives: [
      {
        title: 'Escenario conservador',
        summary: 'Reduce minimos estrictos y amplia maximos en ingredientes base antes de recalcular.',
      },
    ],
  };
}

function normalizeAnalysisTexts(analysis: InfeasibilityAnalysis): InfeasibilityAnalysis {
  return {
    ...analysis,
    priorityActions: analysis.priorityActions.map((action) => ({
      ...action,
      reason: normalizeActionReason(action),
    })),
  };
}

function normalizeActionReason(action: InfeasibilityPriorityAction): string {
  const raw = action.reason ?? '';
  const oldPattern = /Aporta alto\s+([A-Z_]+)\s*\(([\d.]+)\)\s+y su\s+(minimo|maximo)/i;
  const match = raw.match(oldPattern);
  if (!match) {
    return raw;
  }

  const code = match[1];
  const value = Number(match[2]);
  const boundKind = match[3].toLowerCase();
  const ingredient = action.ingredientName ?? 'Este ingrediente';
  const nutrientLabel = getNutrientLabel(code);
  const nutrientValue = formatNutrientValue(code, value);

  if (boundKind === 'maximo') {
    if (action.currentMaxPct !== undefined && action.suggestedMaxPct !== undefined) {
      return (
        `${ingredient} aporta ${nutrientValue} de ${nutrientLabel}; ` +
        `subir su maximo de ${action.currentMaxPct.toFixed(2)}% a ${action.suggestedMaxPct.toFixed(2)}% ` +
        `ayuda a cumplir el minimo de ${nutrientLabel}.`
      );
    }
    return `${ingredient} aporta ${nutrientValue} de ${nutrientLabel}; ampliar su maximo puede mejorar factibilidad.`;
  }

  if (action.currentMinPct !== undefined && action.suggestedMinPct !== undefined) {
    return (
      `${ingredient} aporta ${nutrientValue} de ${nutrientLabel}; ` +
      `bajar su minimo de ${action.currentMinPct.toFixed(2)}% a ${action.suggestedMinPct.toFixed(2)}% ` +
      `reduce el riesgo de exceso de ${nutrientLabel}.`
    );
  }
  return `${ingredient} aporta ${nutrientValue} de ${nutrientLabel}; bajar su minimo puede reducir exceso nutricional.`;
}

function buildBoundsAnalysis({
  reasonCode,
  summary,
  ingredients,
  targetExcessPct,
  mode,
}: {
  reasonCode: InfeasibilityReasonCode;
  summary: string;
  ingredients: Array<{
    id: string;
    name: string;
    boundsPct: {
      min: number;
      max: number;
    };
  }>;
  targetExcessPct: number;
  mode: 'MIN' | 'MAX';
}): InfeasibilityAnalysis {
  let remaining = targetExcessPct;
  const sorted =
    mode === 'MIN'
      ? [...ingredients].sort((a, b) => b.boundsPct.min - a.boundsPct.min)
      : [...ingredients].sort((a, b) => a.boundsPct.max - b.boundsPct.max);

  const actions: InfeasibilityPriorityAction[] = [];
  for (const item of sorted) {
    if (actions.length >= 5 || remaining <= 0) {
      break;
    }

    if (mode === 'MIN') {
      const currentMin = item.boundsPct.min;
      if (currentMin <= 0) {
        continue;
      }
      const reduce = Math.min(currentMin, remaining);
      const suggested = Math.max(0, currentMin - reduce);
      actions.push({
        priority: actions.length + 1,
        title: `Reducir minimo de ${item.name}`,
        reason: `Su minimo actual (${currentMin.toFixed(2)}%) aporta al exceso de minimos.`,
        ingredientId: item.id,
        ingredientName: item.name,
        currentMinPct: round2(currentMin),
        currentMaxPct: round2(item.boundsPct.max),
        suggestedMinPct: round2(suggested),
        deltaPct: round2(-reduce),
      });
      remaining -= reduce;
      continue;
    }

    const currentMax = item.boundsPct.max;
    const room = Math.max(0, 100 - currentMax);
    if (room <= 0) {
      continue;
    }
    const increase = Math.min(room, remaining);
    const suggested = Math.min(100, currentMax + increase);
    actions.push({
      priority: actions.length + 1,
      title: `Subir maximo de ${item.name}`,
      reason: `Su maximo actual (${currentMax.toFixed(2)}%) limita la capacidad total de la mezcla.`,
      ingredientId: item.id,
      ingredientName: item.name,
      currentMinPct: round2(item.boundsPct.min),
      currentMaxPct: round2(currentMax),
      suggestedMaxPct: round2(suggested),
      deltaPct: round2(increase),
    });
    remaining -= increase;
  }

  const topNames = actions.slice(0, 3).map((item) => item.ingredientName).filter(Boolean).join(', ');
  return {
    reasonCode,
    summary: topNames ? `${summary} Ingredientes prioritarios: ${topNames}.` : summary,
    priorityActions: actions.length > 0 ? actions : buildGenericActions(ingredients),
    alternatives: [
      {
        title: mode === 'MIN' ? 'Ajuste por minimos' : 'Ajuste por maximos',
        summary:
          mode === 'MIN'
            ? 'Reduce minimos en ingredientes con mayor exigencia porcentual.'
            : 'Abre maximos en ingredientes que hoy estan mas restringidos.',
        tradeoff: 'Todo ajuste debe validarse con una nueva corrida del solver.',
      },
    ],
  };
}

function buildGenericActions(
  ingredients: Array<{
    id: string;
    name: string;
    boundsPct: {
      min: number;
      max: number;
    };
  }>,
): InfeasibilityPriorityAction[] {
  const first = ingredients[0];
  if (!first) {
    return [
      {
        priority: 1,
        title: 'Revisar configuracion del catalogo',
        reason: 'No hay datos suficientes para identificar ingrediente prioritario.',
      },
    ];
  }
  return [
    {
      priority: 1,
      title: `Revisar limites de ${first.name}`,
      reason: 'Ajustar minimos y maximos de ingredientes suele recuperar factibilidad.',
      ingredientId: first.id,
      ingredientName: first.name,
      currentMinPct: round2(first.boundsPct.min),
      currentMaxPct: round2(first.boundsPct.max),
    },
  ];
}

function buildFallbackBoundActions(
  ingredients: Array<{
    id: string;
    name: string;
    boundsPct: {
      min: number;
      max: number;
    };
  }>,
  startPriority: number,
): InfeasibilityPriorityAction[] {
  return [...ingredients]
    .sort((a, b) => b.boundsPct.min - a.boundsPct.min)
    .filter((item) => item.boundsPct.min > 0)
    .slice(0, 3)
    .map((item, index) => {
      const suggestedMin = Math.max(0, item.boundsPct.min - 2);
      return {
        priority: startPriority + index,
        title: `Bajar minimo de ${item.name}`,
        reason:
          `Como accion de recuperacion, reduce su minimo de ${item.boundsPct.min.toFixed(2)}% ` +
          `a ${suggestedMin.toFixed(2)}% para abrir espacio de formulacion.`,
        ingredientId: item.id,
        ingredientName: item.name,
        currentMinPct: round2(item.boundsPct.min),
        currentMaxPct: round2(item.boundsPct.max),
        suggestedMinPct: round2(suggestedMin),
        deltaPct: round2(suggestedMin - item.boundsPct.min),
      };
    });
}

function buildConstraintIngredientActions(
  ingredients: Array<{
    id: string;
    name: string;
    nutrients?: Record<string, number>;
    boundsPct: {
      min: number;
      max: number;
    };
  }>,
  code: string,
  direction: 'RAISE_NUTRIENT' | 'LOWER_NUTRIENT',
  startPriority: number,
): InfeasibilityPriorityAction[] {
  const ranked = [...ingredients].sort(
    (a, b) => toFiniteNumber(b.nutrients?.[code]) - toFiniteNumber(a.nutrients?.[code]),
  );
  const actions: InfeasibilityPriorityAction[] = [];
  for (const item of ranked) {
    const nutrient = toFiniteNumber(item.nutrients?.[code]);
    if (nutrient <= 0) {
      continue;
    }
    if (direction === 'RAISE_NUTRIENT') {
      if (item.boundsPct.max >= 99.9) {
        continue;
      }
      const suggestedMax = Math.min(100, item.boundsPct.max + 3);
      const nutrientLabel = getNutrientLabel(code);
      const nutrientValueText = formatNutrientValue(code, nutrient);
      actions.push({
        priority: startPriority + actions.length,
        title: `Subir maximo de ${item.name}`,
        reason:
          `${item.name} aporta ${nutrientValueText} de ${nutrientLabel}; ` +
          `subir su maximo de ${item.boundsPct.max.toFixed(2)}% a ${suggestedMax.toFixed(2)}% ` +
          `ayuda a cumplir el minimo de ${nutrientLabel}.`,
        ingredientId: item.id,
        ingredientName: item.name,
        constraintCode: code,
        currentMinPct: round2(item.boundsPct.min),
        currentMaxPct: round2(item.boundsPct.max),
        suggestedMaxPct: round2(suggestedMax),
        deltaPct: round2(suggestedMax - item.boundsPct.max),
      });
    } else {
      if (item.boundsPct.min <= 0) {
        continue;
      }
      const suggestedMin = Math.max(0, item.boundsPct.min - 3);
      const nutrientLabel = getNutrientLabel(code);
      const nutrientValueText = formatNutrientValue(code, nutrient);
      actions.push({
        priority: startPriority + actions.length,
        title: `Bajar minimo de ${item.name}`,
        reason:
          `${item.name} aporta ${nutrientValueText} de ${nutrientLabel}; ` +
          `bajar su minimo de ${item.boundsPct.min.toFixed(2)}% a ${suggestedMin.toFixed(2)}% ` +
          `reduce el riesgo de exceso de ${nutrientLabel}.`,
        ingredientId: item.id,
        ingredientName: item.name,
        constraintCode: code,
        currentMinPct: round2(item.boundsPct.min),
        currentMaxPct: round2(item.boundsPct.max),
        suggestedMinPct: round2(suggestedMin),
        deltaPct: round2(suggestedMin - item.boundsPct.min),
      });
    }
    if (actions.length >= 3) {
      break;
    }
  }
  return actions;
}

function buildLowerSummary(lowerSum: number, intake: number): string {
  const excess = Math.max(0, lowerSum - intake);
  const pct = intake > 0 ? (excess / intake) * 100 : 0;
  return `La suma de minimos rebasa la meta diaria en ${round2(excess).toFixed(2)} kg MS (${round2(pct).toFixed(2)}%).`;
}

function buildUpperSummary(upperSum: number, intake: number): string {
  const gap = Math.max(0, intake - upperSum);
  const pct = intake > 0 ? (gap / intake) * 100 : 0;
  return `La suma de maximos no alcanza la meta diaria por ${round2(gap).toFixed(2)} kg MS (${round2(pct).toFixed(2)}%).`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getNutrientLabel(code: string): string {
  const labels: Record<string, string> = {
    NDF: 'fibra',
    CP: 'proteina',
    ME_MCAL_KGDM: 'energia util',
    Ca: 'calcio',
    P: 'fosforo',
  };
  return labels[code] ?? code;
}

function formatNutrientValue(code: string, value: number): string {
  const safe = toFiniteNumber(value);
  if (code === 'ME_MCAL_KGDM') {
    return `${safe.toFixed(2)} Mcal/kg MS`;
  }
  if (code === 'NDF' || code === 'CP' || code === 'Ca' || code === 'P') {
    return `${(safe * 100).toFixed(2)}%`;
  }
  return safe.toFixed(4);
}

function toFiniteNumber(raw: unknown): number {
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
