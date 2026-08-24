from fastapi import APIRouter
from backend.app.schemas import RiskPredictionRequest, RiskPredictionResponse
from backend.app.ai.risk_model import predict_risk_ml

router = APIRouter(prefix="/risk", tags=["AI Risk"])

@router.post("/predict", response_model=RiskPredictionResponse)
def predict_terrain_risk(req: RiskPredictionRequest):
    return predict_risk_ml(req)
