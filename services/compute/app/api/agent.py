from fastapi import APIRouter

from app.core.agent import respond_agent
from app.models.contracts import AgentRespondRequest, AgentRespondResponse

router = APIRouter()


@router.post("/agent/respond", response_model=AgentRespondResponse)
def agent_respond(payload: AgentRespondRequest) -> AgentRespondResponse:
    return respond_agent(payload)
