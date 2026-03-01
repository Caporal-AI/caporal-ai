import type {
  InfeasibilityAnalysis,
  InfeasibilityAlternative,
  InfeasibilityPriorityAction,
  OptimizeRequest,
  OptimizeResponse,
} from '../../../../packages/contracts/src';

const LOWER_BOUNDS_RE = /lower bounds sum\s*\(([\d.]+)\)\s*exceeds intake target\s*\(([\d.]+)\)/i;
const UPPER_BOUNDS_RE = /upper bounds sum\s*\(([\d.]+)\)\s*is below intake target\s*\(([\d.]+)\)/i;
const CONFLICT_RE =
  /constraint conflict:\s*([A-Z_]+)\s*(minimum|maximum)\s*([\d.]+)\s*(?:exceeds achievable maximum|is below achievable minimum)\s*([\d.]+)/i;

export function ensureInfeasibilityAnalysis(
  request: OptimizeRequest,
  response: OptimizeResponse,
): OptimizeResponse {
  if (response.feasible || response.infeasibilityAnalysis) {
    return response;
  }

  const inferred = inferFromWarnings(request, response.warnings ?? []);
  return {
    ...response,
    infeasibilityAnalysis: inferred,
  };
}

function inferFromWarnings(request: OptimizeRequest, warnings: string[]): InfeasibilityAnalysis {
  const joined = warnings.join(' | ');
  const lowerMatch = joined.match(LOWER_BOUNDS_RE);
  if (lowerMatch) {
    const lowerSum = Number(lowerMatch[1]);
    const intake = Number(lowerMatch[2]) || request.animalProfile.intakeDmKgPerDay;
    return buildLowerBoundsAnalysis(request, lowerSum, intake);
  }

  const upperMatch = joined.match(UPPER_BOUNDS_RE);
  if (upperMatch) {
    const upperSum = Number(upperMatch[1]);
    const intake = Number(upperMatch[2]) || request.animalProfile.intakeDmKgPerDay;
    return buildUpperBoundsAnalysis(request, upperSum, intake);
  }

  const conflictMatch = joined.match(CONFLICT_RE);
  if (conflictMatch) {
    const code = conflictMatch[1];
    const kind = conflictMatch[2]?.toLowerCase();
    const ingredientActions =
      kind === 'minimum'
        ? buildConstraintIngredientActions(request, code, 'RAISE_NUTRIENT', 2)
        : buildConstraintIngredientActions(request, code, 'LOWER_NUTRIENT', 2);
    const fallbackActions =
      ingredientActions.length > 0 ? [] : buildFallbackBoundActions(request, 2);
    return {
      reasonCode: 'CONSTRAINT_CONFLICT',
      summary: `Hay conflicto en la restriccion ${code}; los limites actuales impiden una solucion factible.`,
      priorityActions: [
        {
          priority: 1,
          title: `Revisar restriccion ${code}`,
          reason: 'La meta nutricional actual entra en conflicto con los limites de ingredientes.',
          constraintCode: code,
        },
        ...ingredientActions,
        ...fallbackActions,
      ],
      alternatives: [
        {
          title: 'Ajuste gradual de restriccion',
          summary: 'Relaja temporalmente el limite conflictivo y vuelve a correr el solver.',
          tradeoff: 'Puede bajar precision nutricional en corto plazo.',
        },
      ],
    };
  }

  return {
    reasonCode: 'SOLVER_FAILURE',
    summary: 'No fue posible encontrar mezcla valida con la configuracion actual.',
    priorityActions: buildGenericActions(request),
    alternatives: [
      {
        title: 'Escenario base de recuperacion',
        summary: 'Baja minimos estrictos y amplia maximos en ingredientes base antes de recalcular.',
        tradeoff: 'La mezcla puede variar respecto al plan ideal.',
      },
    ],
  };
}

function buildConstraintIngredientActions(
  request: OptimizeRequest,
  code: string,
  direction: 'RAISE_NUTRIENT' | 'LOWER_NUTRIENT',
  startPriority: number,
): InfeasibilityPriorityAction[] {
  const ranked = [...request.ingredients].sort(
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

function buildLowerBoundsAnalysis(
  request: OptimizeRequest,
  lowerSum: number,
  intake: number,
): InfeasibilityAnalysis {
  const excessKg = Math.max(0, lowerSum - intake);
  const excessPct = intake > 0 ? (excessKg / intake) * 100 : 0;
  let remaining = excessPct;

  const actions: InfeasibilityPriorityAction[] = request.ingredients
    .filter((item) => item.boundsPct.min > 0)
    .sort((a, b) => b.boundsPct.min - a.boundsPct.min)
    .slice(0, 6)
    .map((item, index) => {
      const reducePct = Math.min(item.boundsPct.min, Math.max(remaining, 0));
      remaining -= reducePct;
      return {
        priority: index + 1,
        title: `Reducir minimo de ${item.name}`,
        reason: `Tiene minimo obligatorio de ${item.boundsPct.min.toFixed(2)}%, y empuja la suma total de minimos.`,
        ingredientId: item.id,
        ingredientName: item.name,
        currentMinPct: round2(item.boundsPct.min),
        currentMaxPct: round2(item.boundsPct.max),
        suggestedMinPct: round2(Math.max(0, item.boundsPct.min - reducePct)),
        deltaPct: round2(-reducePct),
      };
    });

  const topIngredients = actions.slice(0, 3).map((item) => item.ingredientName).filter(Boolean);
  return {
    reasonCode: 'LOWER_BOUNDS_SUM',
    summary:
      `La suma de minimos rebasa la meta diaria por ${round2(excessKg).toFixed(2)} kg MS (${round2(excessPct).toFixed(2)}%).` +
      (topIngredients.length ? ` Ingredientes criticos: ${topIngredients.join(', ')}.` : ''),
    priorityActions: actions.length > 0 ? actions : buildGenericActions(request),
    alternatives: [
      {
        title: 'Plan A: Aflojar minimos por prioridad',
        summary: 'Reduce primero minimos de ingredientes con mayor minimo obligatorio.',
        tradeoff: 'La formula resultante puede cambiar de forma importante.',
      },
      {
        title: 'Plan B: Ajuste por fase',
        summary: 'Usa minimos mas flexibles en transicion y endurece en finalizacion.',
        tradeoff: 'Requiere disciplina operativa por etapa.',
      },
    ],
  };
}

function buildUpperBoundsAnalysis(
  request: OptimizeRequest,
  upperSum: number,
  intake: number,
): InfeasibilityAnalysis {
  const missingKg = Math.max(0, intake - upperSum);
  const missingPct = intake > 0 ? (missingKg / intake) * 100 : 0;
  let remaining = missingPct;

  const actions: InfeasibilityPriorityAction[] = request.ingredients
    .sort((a, b) => a.priceMxnPerKgAsFed - b.priceMxnPerKgAsFed)
    .slice(0, 6)
    .map((item, index) => {
      const room = Math.max(0, 100 - item.boundsPct.max);
      const increasePct = Math.min(room, Math.max(remaining, 0));
      remaining -= increasePct;
      return {
        priority: index + 1,
        title: `Subir maximo de ${item.name}`,
        reason: `Tiene maximo de ${item.boundsPct.max.toFixed(2)}%, y limita la capacidad total de la mezcla.`,
        ingredientId: item.id,
        ingredientName: item.name,
        currentMinPct: round2(item.boundsPct.min),
        currentMaxPct: round2(item.boundsPct.max),
        suggestedMaxPct: round2(item.boundsPct.max + increasePct),
        deltaPct: round2(increasePct),
      };
    })
    .filter((action) => (action.deltaPct ?? 0) > 0);

  return {
    reasonCode: 'UPPER_BOUNDS_SUM',
    summary: `La suma de maximos no alcanza la meta diaria; faltan ${round2(missingKg).toFixed(2)} kg MS (${round2(missingPct).toFixed(2)}%).`,
    priorityActions: actions.length > 0 ? actions : buildGenericActions(request),
    alternatives: [
      {
        title: 'Plan A: Abrir maximos en base energetica',
        summary: 'Aumenta maximos en ingredientes base para cerrar el faltante de inclusion.',
        tradeoff: 'Podria mover el perfil nutricional, validar restricciones al recalcular.',
      },
      {
        title: 'Plan B: Activar ingrediente adicional',
        summary: 'Incorpora un ingrediente activo con precio y ventana de inclusion operativa.',
        tradeoff: 'Depende de disponibilidad y costo local.',
      },
    ],
  };
}

function buildGenericActions(request: OptimizeRequest): InfeasibilityPriorityAction[] {
  const ingredient = request.ingredients.find((item) => item.boundsPct.min > 0) ?? request.ingredients[0];
  if (!ingredient) {
    return [];
  }
  return [
    {
      priority: 1,
      title: `Revisar limites de ${ingredient.name}`,
      reason: 'Ajustar minimos y maximos del ingrediente ayuda a recuperar factibilidad.',
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      currentMinPct: round2(ingredient.boundsPct.min),
      currentMaxPct: round2(ingredient.boundsPct.max),
    },
  ];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildFallbackBoundActions(
  request: OptimizeRequest,
  startPriority: number,
): InfeasibilityPriorityAction[] {
  return [...request.ingredients]
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
