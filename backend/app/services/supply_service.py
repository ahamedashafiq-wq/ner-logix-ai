"""
NER-LOGIX AI — Supply Chain Intelligence & Stockout Prediction Engine
Calculates daily depletion, incoming lifeline consignment arrival impact, and generates alerts for critical shortages.
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models import SupplyModel, DistrictModel

def calculate_supply_depletion(
    supply_name: str,
    current_units: float,
    daily_consumption: float,
    incoming_units: float = 0.0,
    eta_hours: float = 0.0
) -> Dict[str, Any]:
    """Calculates days of autonomy remaining and stockout risk."""
    if daily_consumption <= 0:
        daily_consumption = 1.0
        
    days_left = current_units / daily_consumption
    depletion_before_arrival = (eta_hours / 24.0) * daily_consumption
    net_units_at_eta = max(0.0, current_units - depletion_before_arrival) + incoming_units
    
    risk_level = "low"
    if days_left < 1.5:
        risk_level = "critical"
    elif days_left < 3.5:
        risk_level = "high"
    elif days_left < 6.0:
        risk_level = "medium"
        
    priority_score = int(min(100, max(10, 100 - (days_left * 12))))
    
    return {
        "supply_name": supply_name,
        "current_stock": current_units,
        "daily_consumption": daily_consumption,
        "days_remaining": round(days_left, 1),
        "risk_level": risk_level,
        "priority_score": priority_score,
        "stockout_imminent": days_left < 2.0,
        "units_at_arrival": round(net_units_at_eta, 1)
    }
