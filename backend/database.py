"""
Database and Mock Storage for FastAPI Backend
"""

DISTRICTS_DB = [
    {"id": "d1", "name": "Guwahati", "state": "Assam", "lat": 26.1445, "lng": 91.7362, "connectivityScore": 85, "connectivityStatus": "GOOD", "weatherRisk": "medium"},
    {"id": "d2", "name": "Tawang", "state": "Arunachal Pradesh", "lat": 27.586, "lng": 91.859, "connectivityScore": 41, "connectivityStatus": "HIGH RISK", "weatherRisk": "high"},
    {"id": "d3", "name": "Imphal", "state": "Manipur", "lat": 24.817, "lng": 93.9368, "connectivityScore": 62, "connectivityStatus": "MODERATE", "weatherRisk": "high"},
    {"id": "d4", "name": "Shillong", "state": "Meghalaya", "lat": 25.5788, "lng": 91.8933, "connectivityScore": 78, "connectivityStatus": "GOOD", "weatherRisk": "medium"},
    {"id": "d5", "name": "Aizawl", "state": "Mizoram", "lat": 23.7271, "lng": 92.7176, "connectivityScore": 84, "connectivityStatus": "GOOD", "weatherRisk": "medium"},
    {"id": "d6", "name": "Kohima", "state": "Nagaland", "lat": 25.6751, "lng": 94.1086, "connectivityScore": 32, "connectivityStatus": "CRITICAL", "weatherRisk": "medium"},
    {"id": "d7", "name": "Agartala", "state": "Tripura", "lat": 23.8315, "lng": 91.2868, "connectivityScore": 81, "connectivityStatus": "GOOD", "weatherRisk": "low"},
    {"id": "d8", "name": "Gangtok", "state": "Sikkim", "lat": 27.3389, "lng": 88.6065, "connectivityScore": 56, "connectivityStatus": "MODERATE", "weatherRisk": "high"},
]

DELIVERIES_DB = [
    {"id": "del1", "pickupLocation": "Central Hub · Guwahati", "destination": "Aizawl District Hospital", "cargoType": "Emergency Medicines", "cargoWeight": 680, "priority": "critical", "status": "in_transit", "vehicleId": "v1", "scheduledTime": "Today · 14:30", "eta": "5h 12m", "riskLevel": "high"},
    {"id": "del2", "pickupLocation": "Central Hub · Guwahati", "destination": "NEIGRIHMS Shillong", "cargoType": "Baby Food & Water", "cargoWeight": 2800, "priority": "high", "status": "in_transit", "vehicleId": "v2", "scheduledTime": "Today · 15:00", "eta": "1h 45m", "riskLevel": "medium"},
]

ALERTS_DB = [
    {"id": "a1", "type": "road_blocked", "severity": "critical", "message": "NH-14 completely blocked at Tamenglong Pass due to major landslide.", "location": "NH-14 · Tamenglong", "timestamp": "12 min ago", "resolved": False},
    {"id": "a2", "type": "critical_supply", "severity": "critical", "message": "Aizawl District Hospital medicine stock at 18% with incoming shipment delayed.", "location": "Aizawl District Hospital", "timestamp": "25 min ago", "resolved": False},
]

SUPPLIES_DB = [
    {"id": "s1", "category": "medicines", "name": "Emergency Medicines & Antibiotics", "stock": 18, "minimumThreshold": 30, "riskLevel": "critical", "daysRemaining": 2.1, "priorityScore": 96},
    {"id": "s2", "category": "food", "name": "Food Grains & Pulses (FCI)", "stock": 74, "minimumThreshold": 35, "riskLevel": "low", "daysRemaining": 11.5, "priorityScore": 81},
]

WAREHOUSES_DB = [
    {"id": "w1", "name": "Central Logistics Hub · Guwahati", "district": "Guwahati", "lat": 26.15, "lng": 91.74, "capacity": 88, "currentInventory": 76, "dailyConsumption": 8.2, "daysRemaining": 9.2},
    {"id": "w2", "name": "Regional Relief Hub · Shillong", "district": "Shillong", "lat": 25.58, "lng": 91.9, "capacity": 72, "currentInventory": 63, "dailyConsumption": 4.8, "daysRemaining": 13.1},
]

def get_all_districts(): return DISTRICTS_DB
def get_all_deliveries(): return DELIVERIES_DB
def get_all_alerts(): return ALERTS_DB
def get_all_supplies(): return SUPPLIES_DB
def get_all_warehouses(): return WAREHOUSES_DB
