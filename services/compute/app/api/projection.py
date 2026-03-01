from fastapi import APIRouter

from app.core.projection import project_batch_growth
from app.models.contracts import ProjectionRequest, ProjectionResponse

router = APIRouter()


@router.post("/project", response_model=ProjectionResponse)
def project(payload: ProjectionRequest) -> ProjectionResponse:
    return project_batch_growth(payload)
