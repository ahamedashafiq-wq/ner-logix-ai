"""
Disaster Simulation Engine for NER Multi-Hazard Scenarios
Calculates systemic before/after infrastructure metrics and automatic operational recommendations.
"""
from typing import Dict, Any, List

def run_disaster_scenario_analysis(
    rainfall_intensity: str,
    flood_level_m: float,
    traffic_density: str,
    blocked_road_id: str,
    landslide_probability: int,
    total_roads: int = 7,
    total_vehicles: int = 8
) -> Dict[str, Any]:
    """Runs physical disaster cascade simulation."""
    rain_weight = {"Normal": 0, "Moderate": 1, "Heavy": 2, "Extreme": 4}.get(rainfall_intensity, 2)
    flood_weight = int(flood_level_m * 1.2)
    
    safe_before = 5
    high_risk_before = 2
    blocked_before = 0
    
    new_blocked = min(total_roads - 1, (1 if blocked_road_id else 0) + (1 if landslide_probability >= 70 else 0) + (1 if flood_weight >= 3 else 0))
    new_high_risk = min(total_roads - new_blocked, high_risk_before + rain_weight + 1)
    new_safe = max(0, total_roads - new_blocked - new_high_risk)
    
    affected_vehicles = min(total_vehicles, 2 + rain_weight * 2 + flood_weight)
    affected_deliveries = min(6, 1 + rain_weight + flood_weight)
    isolated_districts = min(8, 1 + (1 if new_blocked >= 2 else 0) + (1 if landslide_probability > 75 else 0) + (1 if flood_level_m > 3.0 else 0))
    
    avg_delay_min = 20 + rain_weight * 20 + flood_weight * 15
    
    # Actionable AI recommendations
    ai_recommendations = [
        f"Activate Route B bypass corridor for {affected_vehicles} affected relief convoys.",
        "Pre-position emergency medicine and blood plasma buffers at Dima Hasao and Aizawl depots.",
        "Impose mandatory night-time transit halt along landslide-prone NH-10 and NH-14 stretches.",
        "Mobilize State Disaster Response Force (SDRF) heavy excavators to Tamenglong pass."
    ]
    
    return {
        "scenario": f"{rainfall_intensity} Rain + {flood_level_m}m Flood + {landslide_probability}% Landslide",
        "before": {
            "accessible_roads": safe_before,
            "high_risk_roads": high_risk_before,
            "blocked_roads": blocked_before,
            "average_eta_min": 240,
            "supply_risk": "LOW"
        },
        "after": {
            "accessible_roads": new_safe,
            "high_risk_roads": new_high_risk,
            "blocked_roads": new_blocked,
            "average_eta_min": 240 + avg_delay_min,
            "affected_vehicles": affected_vehicles,
            "delayed_deliveries": affected_deliveries,
            "isolated_districts": isolated_districts,
            "supply_risk": "CRITICAL" if isolated_districts >= 2 else "HIGH"
        },
        "ai_recommendations": ai_recommendations,
        "alternate_routes_found": affected_vehicles
    }
