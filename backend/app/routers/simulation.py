from fastapi import APIRouter
from backend.app.schemas import DisasterSimulationRequest
from backend.app.simulations.disaster_engine import run_disaster_scenario_analysis

router = APIRouter(prefix="/simulation", tags=["Simulation"])

@router.post("/run")
def run_simulation(req: DisasterSimulationRequest):
    return run_disaster_scenario_analysis(
        rainfall_intensity=req.rainfall,
        flood_level_m=req.riverLevelM,
        traffic_density=req.traffic,
        blocked_road_id=req.blockedRoadId,
        landslide_probability=req.landslideProbability
    )
