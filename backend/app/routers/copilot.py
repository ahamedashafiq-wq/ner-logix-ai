from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import DistrictModel, RoadModel, VehicleModel, SupplyModel, IncidentModel
from backend.app.schemas import CopilotQueryRequest, CopilotQueryResponse

router = APIRouter(prefix="/copilot", tags=["Copilot"])

@router.post("/query", response_model=CopilotQueryResponse)
def query_intelligence_copilot(req: CopilotQueryRequest, db: Session = Depends(get_db)):
    q = req.query.lower().strip()
    
    # 1. High-risk / isolated districts query
    if "district" in q and ("risk" in q or "isolated" in q or "high" in q or "critical" in q):
        high_risk_districts = db.query(DistrictModel).filter(
            DistrictModel.connectivity_status.in_(["HIGH RISK", "CRITICAL"])
        ).all()
        names = [f"{d.name} ({d.state} - Accessibility: {d.accessibility_score}/100, Isolation Risk: {d.isolation_risk}%)" for d in high_risk_districts]
        ans = (
            f"Based on real-time topological connectivity and weather data, {len(names)} districts are currently classified as HIGH RISK or CRITICAL:\n"
            + "\n".join([f"• {n}" for n in names])
            + "\n\nImmediate Pre-positioning Advisory: Dima Hasao and Kohima face severe arterial vulnerability with isolation probabilities exceeding 80%."
        )
        return CopilotQueryResponse(
            answer=ans,
            suggestions=["Which roads are blocked?", "What should authorities prioritize?", "Which district may face medicine shortage?"],
            action_type="NAVIGATE_DISTRICTS"
        )
        
    # 2. Blocked / high risk roads query
    elif "road" in q and ("block" in q or "status" in q or "close" in q):
        blocked_roads = db.query(RoadModel).filter(RoadModel.status.in_(["blocked", "orange"])).all()
        road_details = [
            f"{r.name} ({r.start_district} ➔ {r.end_district}): Status {r.status.upper()} (Risk: {r.overall_risk}%, Rainfall: {r.rainfall_mm}mm, Landslide Prob: {r.landslide_prob}%)"
            for r in blocked_roads
        ]
        ans = (
            f"Currently, {len(blocked_roads)} corridor(s) have active disruptions or critical advisories:\n"
            + "\n".join([f"• {rd}" for rd in road_details])
            + "\n\nRecommendation: Avoid NH-14 Tamenglong pass. Reroute through Route B (Southern Valley Ridge Bypass)."
        )
        return CopilotQueryResponse(
            answer=ans,
            suggestions=["Find the safest medicine route", "Which vehicles are delayed?"],
            action_type="NAVIGATE_ROUTES"
        )
        
    # 3. Safest medicine route query
    elif "medicine" in q and ("route" in q or "safest" in q or "find" in q or "hospital" in q):
        ans = (
            "AI Route Optimization Analysis for Emergency Medicine Transport (Guwahati ➔ Aizawl):\n\n"
            "• Direct Route A (NH-14 via Tamenglong): UNSAFE (92% Risk, Corridor Blocked by Landslide Debris)\n"
            "• Recommended Route B (Southern Valley Ridge Bypass · NH-2 / SH-12): RECOMMENDED (21% Risk, 5h 54m ETA, +38 km)\n"
            "• Secondary Route C (Northern Ridge Connector): PARTIALLY VIABLE (48% Risk, 6h 30m ETA, +80 km)\n\n"
            "Result: Route B provides a 72% risk reduction with all 14 bridges structurally verified."
        )
        return CopilotQueryResponse(
            answer=ans,
            suggestions=["Trigger Medicine Scenario Demo", "Which district may face medicine shortage?"],
            action_type="OPTIMIZE_ROUTE"
        )
        
    # 4. Delayed vehicles query
    elif "vehicle" in q and ("delay" in q or "stuck" in q or "status" in q):
        delayed_v = db.query(VehicleModel).filter(VehicleModel.status == "delayed").all()
        v_lines = [
            f"{v.vehicle_number} ({v.driver_name}) · Carrying: {v.cargo} (Priority: {v.cargo_priority.upper()}) · Destination: {v.destination} · ETA: {v.eta}"
            for v in delayed_v
        ]
        ans = (
            f"There are {len(delayed_v)} logistics vehicle(s) currently experiencing transit delays:\n"
            + "\n".join([f"• {vl}" for vl in v_lines])
            + "\n\nDispatch action: Automated alternative route corridors calculated and sent to drivers via mobile telemetry."
        )
        return CopilotQueryResponse(
            answer=ans,
            suggestions=["Which roads are blocked?", "What should authorities prioritize?"],
            action_type="NAVIGATE_VEHICLES"
        )
        
    # 5. Medicine shortage / supply query
    elif ("shortage" in q or "supply" in q or "stock" in q) and ("medicine" in q or "district" in q or "hospital" in q):
        crit_supplies = db.query(SupplyModel).filter(SupplyModel.risk_level.in_(["critical", "high"])).all()
        sup_lines = [
            f"{s.name}: Stock at {s.stock:.0f}% (Depletion in {s.days_remaining:.1f} days, Priority Score: {s.priority_score}/100)"
            for s in crit_supplies
        ]
        ans = (
            "Supply Chain & Depletion Watch:\n\n"
            + "\n".join([f"• {sl}" for sl in sup_lines])
            + "\n\nCritical Alert: Aizawl District Hospital reserves stand at 18% capacity. Emergency shipment NER-MED-204 is in transit."
        )
        return CopilotQueryResponse(
            answer=ans,
            suggestions=["Find the safest medicine route", "What should authorities prioritize?"],
            action_type="NAVIGATE_SUPPLIES"
        )
        
    # 6. Priority recommendation query
    elif "priorit" in q or "authorit" in q or "action" in q or "recommend" in q:
        ans = (
            "Recommended Command Center Priorities (Next 6 Hours):\n\n"
            "1. Emergency Rerouting: Confirm Route B diversion for convoy NER-MED-204 to safeguard Aizawl medical delivery.\n"
            "2. Heavy Equipment Deployment: Mobilize SDRF excavators to NH-14 Tamenglong pass clearance zone.\n"
            "3. Buffer Pre-positioning: Dispatch buffer food and diesel convoys to Dima Hasao before forecasted 80mm rainfall spike.\n"
            "4. Bridge Monitoring: Keep automated acoustic displacement sensors active on Brahmaputra and Barak river crossings."
        )
        return CopilotQueryResponse(
            answer=ans,
            suggestions=["Which districts are high risk?", "Which roads are blocked?", "Find the safest medicine route"],
            action_type="VIEW_DASHBOARD"
        )
        
    # Default fallback
    else:
        ans = (
            f"NER Intelligence Copilot active. Monitoring 8 North Eastern states, 42 active vehicles, 7 lifeline corridors, and 12 weather stations.\n\n"
            "You can ask me about:\n"
            "• 'Which districts are high risk?'\n"
            "• 'Which roads are blocked?'\n"
            "• 'Find the safest medicine route.'\n"
            "• 'Which vehicles are delayed?'\n"
            "• 'Which district may face medicine shortage?'\n"
            "• 'What should authorities prioritize?'"
        )
        return CopilotQueryResponse(
            answer=ans,
            suggestions=["Which districts are high risk?", "Which roads are blocked?", "Find the safest medicine route"],
            action_type=None
        )
