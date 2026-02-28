from app.core.solver import solve_optimize
from app.models.contracts import (
    AnimalProfileInput,
    Constraint,
    IngredientBounds,
    IngredientInput,
    OptimizeOptions,
    OptimizeRequest,
)


def _base_ingredients() -> list[IngredientInput]:
    return [
        IngredientInput(
            id="corn",
            name="Corn",
            priceMxnPerKgAsFed=6.0,
            dryMatterPct=88,
            nutrients={"CP": 0.09, "NDF": 0.14, "ME_MCAL_KGDM": 3.0},
            boundsPct=IngredientBounds(min=0, max=90),
        ),
        IngredientInput(
            id="soy",
            name="Soy",
            priceMxnPerKgAsFed=10.5,
            dryMatterPct=89,
            nutrients={"CP": 0.48, "NDF": 0.12, "ME_MCAL_KGDM": 2.9},
            boundsPct=IngredientBounds(min=5, max=35),
        ),
        IngredientInput(
            id="forage",
            name="Forage",
            priceMxnPerKgAsFed=2.1,
            dryMatterPct=90,
            nutrients={"CP": 0.06, "NDF": 0.55, "ME_MCAL_KGDM": 1.9},
            boundsPct=IngredientBounds(min=10, max=35),
        ),
    ]


def test_solver_feasible_case() -> None:
    payload = OptimizeRequest(
        animalProfile=AnimalProfileInput(
            intakeDmKgPerDay=10.0,
            constraints=[
                Constraint(code="CP", min=0.13, max=0.19, unit="fraction_dm"),
                Constraint(code="NDF", min=0.18, max=0.35, unit="fraction_dm"),
                Constraint(code="ME_MCAL_KGDM", min=2.2, max=3.1, unit="per_kg_dm"),
            ],
        ),
        ingredients=_base_ingredients(),
        options=OptimizeOptions(maxSolveMs=2500, objective="MIN_COST"),
    )

    response = solve_optimize(payload)

    assert response.feasible is True
    assert response.totalCostMxnPerHeadDay > 0
    assert all(item.met for item in response.constraintsReport)


def test_solver_infeasible_case() -> None:
    payload = OptimizeRequest(
        animalProfile=AnimalProfileInput(
            intakeDmKgPerDay=10.0,
            constraints=[Constraint(code="CP", min=0.7, unit="fraction_dm")],
        ),
        ingredients=_base_ingredients(),
        options=OptimizeOptions(maxSolveMs=2000, objective="MIN_COST"),
    )

    response = solve_optimize(payload)

    assert response.feasible is False
    assert any("Constraint conflict" in warning for warning in response.warnings)


def test_solver_respects_bounds() -> None:
    ingredients = _base_ingredients()
    ingredients[0].boundsPct = IngredientBounds(min=0, max=40)
    ingredients[1].boundsPct = IngredientBounds(min=50, max=70)

    payload = OptimizeRequest(
        animalProfile=AnimalProfileInput(
            intakeDmKgPerDay=10.0,
            constraints=[Constraint(code="CP", min=0.2, max=0.28, unit="fraction_dm")],
        ),
        ingredients=ingredients,
        options=OptimizeOptions(maxSolveMs=2500, objective="MIN_COST"),
    )

    response = solve_optimize(payload)

    assert response.feasible is True
    mix_by_id = {item.ingredientId: item for item in response.mix}

    soy_pct = mix_by_id["soy"].pctDm
    corn_pct = mix_by_id["corn"].pctDm if "corn" in mix_by_id else 0.0

    assert soy_pct >= 50 - 1e-4
    assert corn_pct <= 40 + 1e-4


def test_solver_numeric_stability_no_negative_values() -> None:
    payload = OptimizeRequest(
        animalProfile=AnimalProfileInput(
            intakeDmKgPerDay=11.0,
            constraints=[
                Constraint(code="CP", min=0.12, max=0.22, unit="fraction_dm"),
                Constraint(code="NDF", min=0.18, max=0.42, unit="fraction_dm"),
            ],
        ),
        ingredients=_base_ingredients(),
        options=OptimizeOptions(maxSolveMs=2500, objective="MIN_COST"),
    )

    response = solve_optimize(payload)

    assert response.feasible is True
    assert all(item.kgDmPerHeadDay >= -1e-8 for item in response.mix)
