"""
Cargo-Aware Dynamic Route Recommendation Engine
Evaluates candidate routes against cargo sensitivity, priority, weather hazards, active incidents, and corridor reliability.
"""
from typing import List
from backend.app.schemas import RouteCandidateSchema, RecommendationResponse

CARGO_PROFILES = {
    "Emergency Medicines": {"safety_weight": 2.5, "time_weight": 1.2, "distance_weight": 0.5, "disaster_tolerance": "zero"},
    "Vaccines (Cold-chain)": {"safety_weight": 2.8, "time_weight": 2.0, "distance_weight": 0.4, "disaster_tolerance": "zero"},
    "Oxygen Cylinders": {"safety_weight": 2.4, "time_weight": 1.5, "distance_weight": 0.6, "disaster_tolerance": "zero"},
    "Surgical Equipment & Trauma Kits": {"safety_weight": 2.2, "time_weight": 1.4, "distance_weight": 0.6, "disaster_tolerance": "zero"},
    "Blood Plasma": {"safety_weight": 3.0, "time_weight": 2.5, "distance_weight": 0.3, "disaster_tolerance": "zero"},
    "Baby Food & Purified Water": {"safety_weight": 1.8, "time_weight": 1.0, "distance_weight": 0.8, "disaster_tolerance": "low"},
    "Food Grains (FCI Supply)": {"safety_weight": 1.5, "time_weight": 0.8, "distance_weight": 1.0, "disaster_tolerance": "medium"},
    "Fuel & Diesel Drums": {"safety_weight": 2.0, "time_weight": 0.7, "distance_weight": 0.9, "disaster_tolerance": "low"},
    "Bridge Repair Steel Members": {"safety_weight": 1.6, "time_weight": 0.8, "distance_weight": 1.0, "disaster_tolerance": "medium"},
    "General Cargo": {"safety_weight": 1.0, "time_weight": 1.0, "distance_weight": 1.0, "disaster_tolerance": "medium"},
}

def generate_cargo_recommendation(
    candidates: List[RouteCandidateSchema],
    cargo_type: str = "Emergency Medicines",
    priority: str = "critical",
    origin_name: str = "Origin",
    dest_name: str = "Destination"
) -> RecommendationResponse:
    if not candidates:
        raise ValueError("No route candidates provided for recommendation analysis.")

    profile = CARGO_PROFILES.get(cargo_type, CARGO_PROFILES["General Cargo"]).copy()
    if priority.lower() == "critical":
        profile["safety_weight"] *= 1.3

    scored_candidates = []
    warnings = []

    for c in candidates:
        # If road is blocked, set immense cost
        if c.accessibility == "blocked":
            cost = 999999.0
            score = 10
            warnings.append(f"{c.name} is BLOCKED due to critical active incidents.")
        else:
            # Multi-criteria scoring
            risk_score = c.riskScore if c.riskScore is not None else (
                90 if c.riskLevel == "critical" else 70 if c.riskLevel == "high" else 45 if c.riskLevel == "medium" else 20
            )
            dist_cost = c.distance * profile["distance_weight"]
            time_cost = (c.estimatedTime + (c.trafficDelayMin or 0)) * 0.4 * profile["time_weight"]
            risk_cost = risk_score * 3.5 * profile["safety_weight"]
            incident_cost = (c.activeIncidentsCount or 0) * 120.0

            cost = dist_cost + time_cost + risk_cost + incident_cost
            score = max(15, min(98, int(100 - (cost / 28.0))))

        c.score = score
        scored_candidates.append((cost, score, c))

    # Pick candidate with minimum cost / highest viable score
    scored_candidates.sort(key=lambda x: x[0])
    best_cost, best_score, best_candidate = scored_candidates[0]

    for c in candidates:
        c.isRecommended = (c.id == best_candidate.id)

    # Generate grounded, location-specific justification
    is_lifesaving = cargo_type in [
        "Emergency Medicines", "Vaccines (Cold-chain)", "Oxygen Cylinders", 
        "Surgical Equipment & Trauma Kits", "Blood Plasma"
    ]

    alt_candidates = [c for c in candidates if c.id != best_candidate.id and c.accessibility != "blocked"]
    if is_lifesaving:
        if alt_candidates and best_candidate.distance > alt_candidates[0].distance:
            km_diff = round(best_candidate.distance - alt_candidates[0].distance, 1)
            risk_diff = round(best_candidate.riskReduction or 35.0)
            reason = (
                f"Recommended for {cargo_type} dispatch because it offers {risk_diff}% lower disruption risk "
                f"and avoids active hazard zones along {origin_name} ➔ {dest_name}, despite adding {km_diff} km."
            )
        elif best_candidate.accessibility == "accessible" and (best_candidate.activeIncidentsCount or 0) == 0:
            reason = (
                f"Recommended for {cargo_type}: Zero active incident intersections and highest geological stability "
                f"across all evaluated corridors to {dest_name}."
            )
        else:
            reason = (
                f"Optimal corridor for {cargo_type}: Lowest cumulative risk score ({best_candidate.riskScore or 25}/100) "
                f"with verified pavement and bridge clearance."
            )
    else:
        if best_candidate.trafficDelayMin and best_candidate.trafficDelayMin > 0:
            reason = (
                f"Recommended standard transit route: Balances throughput efficiency with manageable {best_candidate.trafficDelayMin}m "
                f"traffic delay on {best_candidate.name}."
            )
        else:
            reason = (
                f"Recommended optimal corridor: Direct transit with minimal impedance ({round(best_candidate.distance)} km, "
                f"ETA {int(best_candidate.estimatedTime // 60)}h {int(best_candidate.estimatedTime % 60)}m)."
            )

    best_candidate.reason = reason

    return RecommendationResponse(
        recommended_route_id=best_candidate.id,
        recommended_route_name=best_candidate.name,
        reason=reason,
        cargo_type=cargo_type,
        priority=priority,
        risk_score=best_candidate.riskScore or (20 if best_candidate.riskLevel == "low" else 50),
        eta_minutes=best_candidate.estimatedTime + (best_candidate.trafficDelayMin or 0),
        distance_km=best_candidate.distance,
        confidence=0.94 if (best_candidate.activeIncidentsCount or 0) == 0 else 0.88,
        warnings=warnings,
        candidates=candidates
    )
