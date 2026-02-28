from fastapi import APIRouter

from app.core.solver import solve_optimize
from app.models.contracts import OptimizeRequest, OptimizeResponse

router = APIRouter()


@router.post("/optimize", response_model=OptimizeResponse)
def optimize(payload: OptimizeRequest) -> OptimizeResponse:
    return solve_optimize(payload)
