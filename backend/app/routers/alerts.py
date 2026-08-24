from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models import AlertModel
from backend.app.schemas import AlertSchema

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertSchema])
def list_alerts(db: Session = Depends(get_db)):
    alerts = db.query(AlertModel).all()
    return [
        AlertSchema(
            id=a.id,
            type=a.type,
            severity=a.severity,
            message=a.message,
            title=a.title,
            location=a.location,
            description=a.description,
            recommendedAction=a.recommended_action,
            affectedVehicles=a.affected_vehicles or [],
            affectedDeliveries=a.affected_deliveries or [],
            timestamp=a.timestamp,
            resolved=a.resolved
        )
        for a in alerts
    ]
