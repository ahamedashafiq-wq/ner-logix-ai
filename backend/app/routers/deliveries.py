from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models import DeliveryModel
from backend.app.schemas import DeliverySchema

router = APIRouter(prefix="/deliveries", tags=["Deliveries"])

@router.get("", response_model=List[DeliverySchema])
def list_deliveries(db: Session = Depends(get_db)):
    deliveries = db.query(DeliveryModel).all()
    return [
        DeliverySchema(
            id=d.id,
            pickupLocation=d.pickup_location,
            destination=d.destination,
            cargoType=d.cargo_type,
            cargoWeight=d.cargo_weight,
            priority=d.priority,
            status=d.status,
            vehicleId=d.vehicle_id,
            scheduledTime=d.scheduled_time,
            eta=d.eta,
            riskLevel=d.risk_level,
            delayMinutes=d.delay_minutes
        )
        for d in deliveries
    ]
