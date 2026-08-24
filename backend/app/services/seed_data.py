from sqlalchemy.orm import Session
from backend.app.models import (
    DistrictModel,
    RoadModel,
    VehicleModel,
    DeliveryModel,
    IncidentModel,
    AlertModel,
    SupplyModel,
    WarehouseModel,
    WeatherModel,
)

def seed_database_if_empty(db: Session):
    if db.query(DistrictModel).first():
        return  # Already seeded

    # 1. Seed Districts
    districts_data = [
        {"id": "d1", "name": "Guwahati", "state": "Assam", "lat": 26.1445, "lng": 91.7362, "accessibility_score": 85, "connectivity_score": 85, "connectivity_status": "GOOD", "road_status": "slow", "weather_risk": "medium", "active_incidents": 4, "delayed_deliveries": 3, "supply_status": "watch", "population": "1.2M", "isolation_risk": 10, "estimated_isolation_hours": 96.0},
        {"id": "d2", "name": "Tawang", "state": "Arunachal Pradesh", "lat": 27.586, "lng": 91.859, "accessibility_score": 41, "connectivity_score": 41, "connectivity_status": "HIGH RISK", "road_status": "restricted", "weather_risk": "high", "active_incidents": 2, "delayed_deliveries": 2, "supply_status": "shortage", "population": "50k", "isolation_risk": 75, "estimated_isolation_hours": 6.5},
        {"id": "d3", "name": "Imphal", "state": "Manipur", "lat": 24.817, "lng": 93.9368, "accessibility_score": 62, "connectivity_score": 62, "connectivity_status": "MODERATE", "road_status": "restricted", "weather_risk": "high", "active_incidents": 6, "delayed_deliveries": 4, "supply_status": "watch", "population": "450k", "isolation_risk": 65, "estimated_isolation_hours": 12.0},
        {"id": "d4", "name": "Shillong", "state": "Meghalaya", "lat": 25.5788, "lng": 91.8933, "accessibility_score": 78, "connectivity_score": 78, "connectivity_status": "GOOD", "road_status": "slow", "weather_risk": "medium", "active_incidents": 3, "delayed_deliveries": 2, "supply_status": "adequate", "population": "380k", "isolation_risk": 20, "estimated_isolation_hours": 72.0},
        {"id": "d5", "name": "Aizawl", "state": "Mizoram", "lat": 23.7271, "lng": 92.7176, "accessibility_score": 84, "connectivity_score": 84, "connectivity_status": "GOOD", "road_status": "slow", "weather_risk": "medium", "active_incidents": 2, "delayed_deliveries": 1, "supply_status": "adequate", "population": "320k", "isolation_risk": 35, "estimated_isolation_hours": 24.0},
        {"id": "d6", "name": "Kohima", "state": "Nagaland", "lat": 25.6751, "lng": 94.1086, "accessibility_score": 32, "connectivity_score": 32, "connectivity_status": "CRITICAL", "road_status": "restricted", "weather_risk": "high", "active_incidents": 3, "delayed_deliveries": 2, "supply_status": "watch", "population": "115k", "isolation_risk": 82, "estimated_isolation_hours": 4.5},
        {"id": "d7", "name": "Agartala", "state": "Tripura", "lat": 23.8315, "lng": 91.2868, "accessibility_score": 81, "connectivity_score": 81, "connectivity_status": "GOOD", "road_status": "open", "weather_risk": "low", "active_incidents": 1, "delayed_deliveries": 1, "supply_status": "adequate", "population": "520k", "isolation_risk": 15, "estimated_isolation_hours": 80.0},
        {"id": "d8", "name": "Gangtok", "state": "Sikkim", "lat": 27.3389, "lng": 88.6065, "accessibility_score": 56, "connectivity_score": 56, "connectivity_status": "MODERATE", "road_status": "restricted", "weather_risk": "high", "active_incidents": 2, "delayed_deliveries": 2, "supply_status": "watch", "population": "100k", "isolation_risk": 68, "estimated_isolation_hours": 8.0},
        {"id": "d9", "name": "Dima Hasao", "state": "Assam", "lat": 25.18, "lng": 93.02, "accessibility_score": 28, "connectivity_score": 28, "connectivity_status": "CRITICAL", "road_status": "blocked", "weather_risk": "high", "active_incidents": 5, "delayed_deliveries": 3, "supply_status": "shortage", "population": "210k", "isolation_risk": 87, "estimated_isolation_hours": 3.7},
    ]
    for d in districts_data:
        db.add(DistrictModel(**d))

    # 2. Seed Roads
    roads_data = [
        {"id": "r1", "name": "NH-14", "start_district": "Guwahati", "end_district": "Imphal", "status": "orange", "risk_level": "high", "rainfall_mm": 82.0, "traffic_level": "heavy", "road_condition": "Poor", "landslide_prob": 76, "flood_risk": 32, "overall_risk": 81, "delay_min": 42, "length_km": 420.0, "elevation_m": 840.0, "affected_vehicles": ["v3", "v5"], "affected_deliveries": ["del3"]},
        {"id": "r2", "name": "NH-27", "start_district": "Guwahati", "end_district": "Shillong", "status": "yellow", "risk_level": "medium", "rainfall_mm": 48.0, "traffic_level": "medium", "road_condition": "Fair", "landslide_prob": 34, "flood_risk": 55, "overall_risk": 48, "delay_min": 18, "length_km": 98.0, "elevation_m": 1490.0, "affected_vehicles": ["v2"], "affected_deliveries": ["del2"]},
        {"id": "r3", "name": "NH-2", "start_district": "Shillong", "end_district": "Kohima", "status": "accessible", "risk_level": "low", "rainfall_mm": 22.0, "traffic_level": "low", "road_condition": "Good", "landslide_prob": 15, "flood_risk": 10, "overall_risk": 18, "delay_min": 0, "length_km": 198.0, "elevation_m": 1440.0, "affected_vehicles": [], "affected_deliveries": []},
        {"id": "r4", "name": "NH-6", "start_district": "Guwahati", "end_district": "Aizawl", "status": "accessible", "risk_level": "medium", "rainfall_mm": 52.0, "traffic_level": "low", "road_condition": "Fair", "landslide_prob": 44, "flood_risk": 25, "overall_risk": 42, "delay_min": 15, "length_km": 445.0, "elevation_m": 1130.0, "affected_vehicles": ["v1"], "affected_deliveries": ["del1"]},
        {"id": "r5", "name": "NH-102", "start_district": "Imphal", "end_district": "Moreh", "status": "accessible", "risk_level": "low", "rainfall_mm": 19.0, "traffic_level": "low", "road_condition": "Good", "landslide_prob": 12, "flood_risk": 14, "overall_risk": 15, "delay_min": 0, "length_km": 110.0, "elevation_m": 780.0, "affected_vehicles": ["v8"], "affected_deliveries": ["del4"]},
        {"id": "r6", "name": "SH-5", "start_district": "Shillong", "end_district": "Dawki", "status": "yellow", "risk_level": "medium", "rainfall_mm": 68.0, "traffic_level": "medium", "road_condition": "Fair", "landslide_prob": 58, "flood_risk": 30, "overall_risk": 54, "delay_min": 25, "length_km": 84.0, "elevation_m": 1320.0, "affected_vehicles": ["v6"], "affected_deliveries": ["del7"]},
        {"id": "r7", "name": "NH-10", "start_district": "Siliguri", "end_district": "Gangtok", "status": "orange", "risk_level": "high", "rainfall_mm": 92.0, "traffic_level": "heavy", "road_condition": "Poor", "landslide_prob": 84, "flood_risk": 40, "overall_risk": 86, "delay_min": 65, "length_km": 115.0, "elevation_m": 1650.0, "affected_vehicles": ["v6"], "affected_deliveries": ["del6"]},
    ]
    for r in roads_data:
        db.add(RoadModel(**r))

    # 3. Seed Vehicles
    vehicles_data = [
        {"id": "v1", "vehicle_number": "NER-MED-204", "type": "van", "driver_id": "dr1", "driver_name": "Raj Kumar Barman", "current_lat": 25.45, "current_lng": 92.45, "speed": 43.0, "status": "on_route", "cargo": "Emergency Medicines & Blood Plasma", "cargo_priority": "critical", "capacity": 1200.0, "current_load": 680.0, "fuel": 72.0, "battery": 92.0, "current_delivery_id": "del1", "origin": "Guwahati", "destination": "Aizawl", "eta": "5h 12m", "delivery_percentage": 68.0, "risk_level": "high", "is_demo_gps": True},
        {"id": "v2", "vehicle_number": "NER-REL-108", "type": "truck", "driver_id": "dr2", "driver_name": "Anita Das", "current_lat": 26.15, "current_lng": 91.74, "speed": 38.0, "status": "on_route", "cargo": "Baby Food & Purified Water", "cargo_priority": "high", "capacity": 3500.0, "current_load": 2800.0, "fuel": 85.0, "battery": 80.0, "current_delivery_id": "del2", "origin": "Guwahati", "destination": "Shillong", "eta": "1h 45m", "delivery_percentage": 42.0, "risk_level": "medium", "is_demo_gps": True},
        {"id": "v3", "vehicle_number": "NER-TRK-112", "type": "truck", "driver_id": "dr3", "driver_name": "Bikash Singh", "current_lat": 24.82, "current_lng": 93.94, "speed": 0.0, "status": "delayed", "cargo": "Surgical Equipment & Trauma Kits", "cargo_priority": "critical", "capacity": 2500.0, "current_load": 1900.0, "fuel": 48.0, "battery": 75.0, "current_delivery_id": "del3", "origin": "Guwahati", "destination": "Imphal", "eta": "7h 20m", "delivery_percentage": 35.0, "risk_level": "critical", "is_demo_gps": True},
        {"id": "v4", "vehicle_number": "NER-VAN-115", "type": "van", "driver_id": "dr4", "driver_name": "Maya Devi Mech", "current_lat": 25.68, "current_lng": 94.11, "speed": 34.0, "status": "on_route", "cargo": "Vaccines (Cold-chain)", "cargo_priority": "critical", "capacity": 800.0, "current_load": 410.0, "fuel": 64.0, "battery": 88.0, "current_delivery_id": "del4", "origin": "Shillong", "destination": "Kohima", "eta": "2h 10m", "delivery_percentage": 74.0, "risk_level": "low", "is_demo_gps": True},
        {"id": "v5", "vehicle_number": "NER-TRK-120", "type": "truck", "driver_id": "dr5", "driver_name": "Tenzing Norbu", "current_lat": 24.98, "current_lng": 93.62, "speed": 12.0, "status": "delayed", "cargo": "Food Grains (FCI Supply)", "cargo_priority": "high", "capacity": 4500.0, "current_load": 4100.0, "fuel": 58.0, "battery": 70.0, "current_delivery_id": "del5", "origin": "Guwahati", "destination": "Imphal", "eta": "8h 40m", "delivery_percentage": 55.0, "risk_level": "high", "is_demo_gps": True},
        {"id": "v6", "vehicle_number": "NER-VAN-124", "type": "van", "driver_id": "dr6", "driver_name": "Pema Wangdi", "current_lat": 27.34, "current_lng": 88.61, "speed": 28.0, "status": "on_route", "cargo": "Oxygen Cylinders", "cargo_priority": "critical", "capacity": 1500.0, "current_load": 1100.0, "fuel": 80.0, "battery": 90.0, "current_delivery_id": "del6", "origin": "Siliguri", "destination": "Gangtok", "eta": "3h 15m", "delivery_percentage": 60.0, "risk_level": "high", "is_demo_gps": True},
    ]
    for v in vehicles_data:
        db.add(VehicleModel(**v))

    # 4. Seed Deliveries
    deliveries_data = [
        {"id": "del1", "pickup_location": "Central Hub · Guwahati", "destination": "Aizawl District Hospital", "cargo_type": "Emergency Medicines", "cargo_weight": 680.0, "priority": "critical", "status": "in_transit", "vehicle_id": "v1", "scheduled_time": "Today · 14:30", "eta": "5h 12m", "risk_level": "high", "delay_minutes": 42},
        {"id": "del2", "pickup_location": "Central Hub · Guwahati", "destination": "NEIGRIHMS Shillong", "cargo_type": "Baby Food & Water", "cargo_weight": 2800.0, "priority": "high", "status": "in_transit", "vehicle_id": "v2", "scheduled_time": "Today · 15:00", "eta": "1h 45m", "risk_level": "medium", "delay_minutes": 18},
        {"id": "del3", "pickup_location": "Central Hub · Guwahati", "destination": "RIMS Imphal", "cargo_type": "Surgical Equipment", "cargo_weight": 1900.0, "priority": "critical", "status": "delayed", "vehicle_id": "v3", "scheduled_time": "Today · 11:00", "eta": "7h 20m", "risk_level": "critical", "delay_minutes": 140},
    ]
    for deliv in deliveries_data:
        db.add(DeliveryModel(**deliv))

    # 5. Seed Incidents
    incidents_data = [
        {"id": "INC-2048", "type": "landslide", "severity": "critical", "status": "active", "location": "NH-14 · Tamenglong Pass", "lat": 24.98, "lng": 93.62, "timestamp": "12 min ago", "description": "Massive slope failure and rockfall blocking both lanes after overnight 82mm torrential downpour.", "reported_by": "Field Unit 07", "affected_roads": ["NH-14"], "affected_vehicles": ["v3", "v5"], "confidence": 96.0},
        {"id": "INC-2047", "type": "flood", "severity": "high", "status": "verified", "location": "Brahmaputra Bridge Approach · Guwahati", "lat": 26.18, "lng": 91.75, "timestamp": "28 min ago", "description": "Water level surging within 0.8m of carriageway. Heavy vehicle slow-down active.", "reported_by": "Assam Disaster Control", "affected_roads": ["NH-27"], "affected_vehicles": ["v2"], "confidence": 91.0},
    ]
    for inc in incidents_data:
        db.add(IncidentModel(**inc))

    # 6. Seed Alerts
    alerts_data = [
        {"id": "a1", "type": "road_blocked", "severity": "critical", "message": "NH-14 completely blocked at Tamenglong Pass due to major landslide.", "title": "Corridor Blockade", "location": "NH-14 · Tamenglong", "description": "2 critical supply convoys stopped. Alternate route calculation required immediately.", "recommended_action": "Reroute via NH-2 / SH-12 bypass (+42 min, 72% risk reduction).", "affected_vehicles": ["v3", "v5"], "affected_deliveries": ["del3"], "timestamp": "12 min ago", "resolved": False},
        {"id": "a2", "type": "critical_supply", "severity": "critical", "message": "Aizawl District Hospital medicine stock at 18% with incoming shipment delayed.", "title": "Critical Medicine Shortage", "location": "Aizawl District Hospital", "description": "Depletion estimated within 2.4 days. Incoming vehicle NER-MED-204 encountering weather delays.", "recommended_action": "Prioritize emergency convoy NER-MED-204 dispatch.", "affected_vehicles": ["v1"], "affected_deliveries": ["del1"], "timestamp": "25 min ago", "resolved": False},
    ]
    for alt in alerts_data:
        db.add(AlertModel(**alt))

    # 7. Seed Supplies & Warehouses
    supplies_data = [
        {"id": "s1", "category": "medicines", "name": "Emergency Medicines & Antibiotics", "stock": 18.0, "incoming": 120.0, "outgoing": 84.0, "minimum_threshold": 30.0, "risk_level": "critical", "days_remaining": 2.1, "priority_score": 96, "warehouses_json": [{"id": "w1", "quantity": 24}, {"id": "w3", "quantity": 8}]},
        {"id": "s2", "category": "food", "name": "Food Grains & Pulses (FCI)", "stock": 74.0, "incoming": 420.0, "outgoing": 190.0, "minimum_threshold": 35.0, "risk_level": "low", "days_remaining": 11.5, "priority_score": 81, "warehouses_json": [{"id": "w1", "quantity": 180}]},
        {"id": "s3", "category": "rescue", "name": "Search & Rescue Inflatable Boats", "stock": 42.0, "incoming": 80.0, "outgoing": 24.0, "minimum_threshold": 30.0, "risk_level": "medium", "days_remaining": 7.8, "priority_score": 74, "warehouses_json": [{"id": "w2", "quantity": 42}]},
        {"id": "s4", "category": "fuel", "name": "Aviation & High-Altitude Diesel Fuel", "stock": 52.0, "incoming": 180.0, "outgoing": 95.0, "minimum_threshold": 40.0, "risk_level": "medium", "days_remaining": 6.2, "priority_score": 88, "warehouses_json": [{"id": "w1", "quantity": 45000}]},
    ]
    for sup in supplies_data:
        db.add(SupplyModel(**sup))

    warehouses_data = [
        {"id": "w1", "name": "Central Logistics Hub · Guwahati", "district": "Guwahati", "lat": 26.15, "lng": 91.74, "capacity": 88.0, "current_inventory": 76.0, "daily_consumption": 8.2, "days_remaining": 9.2, "supplies_json": []},
        {"id": "w2", "name": "Regional Relief Hub · Shillong", "district": "Shillong", "lat": 25.58, "lng": 91.9, "capacity": 72.0, "current_inventory": 63.0, "daily_consumption": 4.8, "days_remaining": 13.1, "supplies_json": []},
        {"id": "w3", "name": "Eastern Command Depot · Imphal", "district": "Imphal", "lat": 24.82, "lng": 93.94, "capacity": 64.0, "current_inventory": 38.0, "daily_consumption": 6.5, "days_remaining": 5.8, "supplies_json": []},
    ]
    for wh in warehouses_data:
        db.add(WarehouseModel(**wh))

    # 8. Seed Weather
    weather_data = [
        {"district": "Guwahati", "temperature_c": 29.0, "rainfall_mm": 42.0, "humidity": 88.0, "wind_kph": 18.0, "visibility_km": 6.0, "condition": "Humid with scattered rain", "warning": "River watch on Brahmaputra", "is_demo": True},
        {"district": "Shillong", "temperature_c": 18.0, "rainfall_mm": 88.0, "humidity": 94.0, "wind_kph": 22.0, "visibility_km": 3.0, "condition": "Heavy monsoon rainfall", "warning": "Hill-road slip caution", "is_demo": True},
        {"district": "Imphal", "temperature_c": 24.0, "rainfall_mm": 61.0, "humidity": 85.0, "wind_kph": 14.0, "visibility_km": 5.0, "condition": "Monsoon showers", "warning": "Landslide watch in Tamenglong", "is_demo": True},
        {"district": "Aizawl", "temperature_c": 22.0, "rainfall_mm": 52.0, "humidity": 82.0, "wind_kph": 12.0, "visibility_km": 7.0, "condition": "Intermittent rain", "warning": "Slippery curves on NH-6", "is_demo": True},
        {"district": "Kohima", "temperature_c": 19.0, "rainfall_mm": 72.0, "humidity": 91.0, "wind_kph": 16.0, "visibility_km": 4.0, "condition": "Dense fog and rain", "warning": "Pavement deformation on NH-2", "is_demo": True},
        {"district": "Gangtok", "temperature_c": 15.0, "rainfall_mm": 92.0, "humidity": 96.0, "wind_kph": 20.0, "visibility_km": 2.0, "condition": "Continuous rain and fog", "warning": "Critical landslide advisory on NH-10", "is_demo": True},
    ]
    for w in weather_data:
        db.add(WeatherModel(**w))

    db.commit()
