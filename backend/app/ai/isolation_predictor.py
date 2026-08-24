"""
District Isolation Prediction Engine for North Eastern Region
Predicts physical cut-off probabilities based on arterial bridge status, road blockades, and buffer stock autonomy.
"""
from typing import Dict, Any, List

def calculate_district_isolation_risk(
    district_name: str,
    connected_roads: List[Dict[str, Any]],
    current_weather: Dict[str, Any],
    supplies_status: Dict[str, Any]
) -> Dict[str, Any]:
    """Calculates isolation risk %, time-to-isolation, and pre-positioning advisories."""
    total_arterials = max(1, len(connected_roads))
    blocked_arterials = sum(1 for r in connected_roads if r.get("status") == "blocked")
    high_risk_arterials = sum(1 for r in connected_roads if r.get("status") in ["orange", "yellow"])
    
    rain = current_weather.get("rainfall_mm", 25.0)
    
    # Isolation risk calculation (0 - 100)
    base_score = (blocked_arterials / total_arterials) * 60 + (high_risk_arterials / total_arterials) * 25 + (rain / 120.0) * 15
    
    if district_name.lower() in ["dima hasao", "tawang", "kohima"]:
        base_score += 15  # Mountainous single-arterial geography penalty
        
    isolation_prob = int(min(98, max(5, base_score)))
    
    # Estimated time to physical isolation in hours
    if isolation_prob >= 80:
        est_hours = max(1.5, 8.0 - (isolation_prob / 15.0))
    elif isolation_prob >= 50:
        est_hours = max(6.0, 24.0 - (isolation_prob / 5.0))
    else:
        est_hours = 72.0
        
    hours = int(est_hours)
    minutes = int((est_hours - hours) * 60)
    
    # Pre-positioning recommendations
    recommendation = "Standard supply buffer maintained."
    if isolation_prob >= 75:
        recommendation = "CRITICAL ADVISORY: High probability of complete corridor cut-off. Pre-position emergency medicines, blood bags, and fuel reserves within 4 hours."
    elif isolation_prob >= 50:
        recommendation = "MONITORING: Dispatch backup supply convoys before forecast monsoon peak."

    return {
        "district": district_name,
        "isolation_risk_percent": isolation_prob,
        "estimated_isolation_time": f"{hours}h {minutes:02d}m",
        "critical_corridor": connected_roads[0]["name"] if connected_roads else "NH-14",
        "alternate_routes_available": max(0, total_arterials - blocked_arterials),
        "medicine_stock_days": supplies_status.get("medicine_days", 4.5),
        "food_stock_days": supplies_status.get("food_days", 12.0),
        "fuel_stock_days": supplies_status.get("fuel_days", 6.0),
        "recommendation": recommendation,
        "is_simulated": True
    }
