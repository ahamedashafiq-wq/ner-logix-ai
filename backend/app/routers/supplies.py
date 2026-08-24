from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models import SupplyModel, WarehouseModel
from backend.app.schemas import SupplySchema, WarehouseSchema

router = APIRouter(prefix="/supplies", tags=["Supplies"])

@router.get("", response_model=List[SupplySchema])
def list_supplies(db: Session = Depends(get_db)):
    supplies = db.query(SupplyModel).all()
    return [
        SupplySchema(
            id=s.id,
            category=s.category,
            name=s.name,
            stock=s.stock,
            incoming=s.incoming,
            outgoing=s.outgoing,
            minimumThreshold=s.minimum_threshold,
            riskLevel=s.risk_level,
            daysRemaining=s.days_remaining,
            priorityScore=s.priority_score,
            warehouses=s.warehouses_json or []
        )
        for s in supplies
    ]

@router.get("/warehouses", response_model=List[WarehouseSchema])
def list_warehouses(db: Session = Depends(get_db)):
    warehouses = db.query(WarehouseModel).all()
    return [
        WarehouseSchema(
            id=w.id,
            name=w.name,
            district=w.district,
            lat=w.lat,
            lng=w.lng,
            capacity=w.capacity,
            currentInventory=w.current_inventory,
            dailyConsumption=w.daily_consumption,
            daysRemaining=w.days_remaining,
            supplies=w.supplies_json or []
        )
        for w in warehouses
    ]
