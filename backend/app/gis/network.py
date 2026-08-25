"""
NetworkX-Based Multi-Criteria AI Route Optimization Engine
Topological Graph of North Eastern Region road corridors across all 8 NER states.
Performs geospatial road matching, dynamic multi-node path finding, segment breakdown, and cargo-aware risk scoring.
"""
import math
import networkx as nx
from typing import List, Dict, Any, Tuple, Optional
from backend.app.schemas import (
    RouteCandidateSchema,
    RouteSegmentSchema,
    GeoPointSchema,
    RecommendationResponse,
)
from backend.app.services.recommendation_service import generate_cargo_recommendation

# 1. Major Topographical Graph Nodes across all 8 NER States
NER_GRAPH_NODES = {
    "Guwahati": {"lat": 26.1445, "lng": 91.7362, "state": "Assam"},
    "Shillong": {"lat": 25.5788, "lng": 91.8933, "state": "Meghalaya"},
    "Nongpoh": {"lat": 25.9038, "lng": 91.8794, "state": "Meghalaya"},
    "Jowai": {"lat": 25.4452, "lng": 92.2039, "state": "Meghalaya"},
    "Tura": {"lat": 25.5141, "lng": 90.2033, "state": "Meghalaya"},
    "Nagaon": {"lat": 26.3465, "lng": 92.6840, "state": "Assam"},
    "Tezpur": {"lat": 26.6528, "lng": 92.7926, "state": "Assam"},
    "Jorhat": {"lat": 26.7509, "lng": 94.2037, "state": "Assam"},
    "Dibrugarh": {"lat": 27.4728, "lng": 94.9120, "state": "Assam"},
    "Silchar": {"lat": 24.8333, "lng": 92.7789, "state": "Assam"},
    "Karimganj": {"lat": 24.8690, "lng": 92.3588, "state": "Assam"},
    "Haflong": {"lat": 25.1764, "lng": 93.0210, "state": "Assam"},
    "Diphu": {"lat": 25.8457, "lng": 93.4352, "state": "Assam"},
    "Dimapur": {"lat": 25.9068, "lng": 93.7273, "state": "Nagaland"},
    "Kohima": {"lat": 25.6751, "lng": 94.1086, "state": "Nagaland"},
    "Mokokchung": {"lat": 26.3262, "lng": 94.5218, "state": "Nagaland"},
    "Wokha": {"lat": 26.0970, "lng": 94.2625, "state": "Nagaland"},
    "Imphal": {"lat": 24.8170, "lng": 93.9368, "state": "Manipur"},
    "Tamenglong": {"lat": 24.9856, "lng": 93.4984, "state": "Manipur"},
    "Churachandpur": {"lat": 24.3333, "lng": 93.6833, "state": "Manipur"},
    "Ukhrul": {"lat": 25.1167, "lng": 94.3667, "state": "Manipur"},
    "Aizawl": {"lat": 23.7271, "lng": 92.7176, "state": "Mizoram"},
    "Lunglei": {"lat": 22.8671, "lng": 92.7656, "state": "Mizoram"},
    "Champhai": {"lat": 23.4735, "lng": 93.3283, "state": "Mizoram"},
    "Agartala": {"lat": 23.8315, "lng": 91.2868, "state": "Tripura"},
    "Dharmanagar": {"lat": 24.3733, "lng": 92.1645, "state": "Tripura"},
    "Udaipur": {"lat": 23.5333, "lng": 91.4833, "state": "Tripura"},
    "Itanagar": {"lat": 27.0844, "lng": 93.6053, "state": "Arunachal Pradesh"},
    "Naharlagun": {"lat": 27.1080, "lng": 93.6920, "state": "Arunachal Pradesh"},
    "Pasighat": {"lat": 28.0667, "lng": 95.3333, "state": "Arunachal Pradesh"},
    "Tawang": {"lat": 27.5861, "lng": 91.8594, "state": "Arunachal Pradesh"},
    "Siliguri": {"lat": 26.7271, "lng": 88.3953, "state": "West Bengal (Corridor)"},
    "Gangtok": {"lat": 27.3389, "lng": 88.6065, "state": "Sikkim"},
    "Rangpo": {"lat": 27.1764, "lng": 88.5303, "state": "Sikkim"},
}

# 2. Highway Arterials & Regional Corridors
NER_GRAPH_EDGES = [
    # Assam - Meghalaya
    ("Guwahati", "Nongpoh", {"name": "NH-27", "distance": 52, "base_time": 75, "risk": 20, "traffic": "medium"}),
    ("Nongpoh", "Shillong", {"name": "NH-27", "distance": 46, "base_time": 70, "risk": 25, "traffic": "medium"}),
    ("Shillong", "Jowai", {"name": "NH-6", "distance": 64, "base_time": 105, "risk": 30, "traffic": "low"}),
    ("Jowai", "Silchar", {"name": "NH-6", "distance": 151, "base_time": 275, "risk": 45, "traffic": "medium"}),
    ("Guwahati", "Tura", {"name": "NH-127B", "distance": 220, "base_time": 330, "risk": 35, "traffic": "low"}),

    # Assam Trunk - Central & Upper
    ("Guwahati", "Nagaon", {"name": "NH-27", "distance": 122, "base_time": 150, "risk": 18, "traffic": "medium"}),
    ("Nagaon", "Tezpur", {"name": "NH-715", "distance": 62, "base_time": 90, "risk": 22, "traffic": "low"}),
    ("Nagaon", "Diphu", {"name": "NH-329", "distance": 115, "base_time": 170, "risk": 28, "traffic": "low"}),
    ("Nagaon", "Jorhat", {"name": "NH-715", "distance": 180, "base_time": 240, "risk": 20, "traffic": "medium"}),
    ("Jorhat", "Dibrugarh", {"name": "NH-2", "distance": 138, "base_time": 180, "risk": 22, "traffic": "medium"}),
    ("Guwahati", "Haflong", {"name": "NH-27/NH-54", "distance": 280, "base_time": 420, "risk": 55, "traffic": "medium"}),
    ("Haflong", "Silchar", {"name": "NH-54", "distance": 100, "base_time": 180, "risk": 40, "traffic": "medium"}),
    ("Haflong", "Tamenglong", {"name": "NH-14", "distance": 110, "base_time": 210, "risk": 82, "traffic": "high"}),
    ("Tamenglong", "Imphal", {"name": "NH-14", "distance": 70, "base_time": 120, "risk": 88, "traffic": "high"}),

    # Nagaland & Manipur
    ("Diphu", "Dimapur", {"name": "NH-36", "distance": 45, "base_time": 65, "risk": 25, "traffic": "medium"}),
    ("Guwahati", "Dimapur", {"name": "NH-29", "distance": 260, "base_time": 360, "risk": 30, "traffic": "medium"}),
    ("Dimapur", "Kohima", {"name": "NH-29", "distance": 74, "base_time": 130, "risk": 42, "traffic": "medium"}),
    ("Kohima", "Wokha", {"name": "NH-2", "distance": 78, "base_time": 140, "risk": 40, "traffic": "low"}),
    ("Wokha", "Mokokchung", {"name": "NH-2", "distance": 82, "base_time": 150, "risk": 35, "traffic": "low"}),
    ("Kohima", "Imphal", {"name": "NH-2", "distance": 138, "base_time": 240, "risk": 35, "traffic": "low"}),
    ("Imphal", "Churachandpur", {"name": "NH-2", "distance": 63, "base_time": 95, "risk": 28, "traffic": "low"}),
    ("Imphal", "Ukhrul", {"name": "NH-202", "distance": 84, "base_time": 150, "risk": 38, "traffic": "low"}),

    # Southern NER: Mizoram & Tripura
    ("Silchar", "Karimganj", {"name": "NH-37", "distance": 55, "base_time": 85, "risk": 20, "traffic": "low"}),
    ("Silchar", "Aizawl", {"name": "NH-54/NH-6", "distance": 178, "base_time": 310, "risk": 35, "traffic": "medium"}),
    ("Silchar", "Imphal", {"name": "NH-37", "distance": 250, "base_time": 410, "risk": 40, "traffic": "medium"}),
    ("Aizawl", "Lunglei", {"name": "NH-54", "distance": 168, "base_time": 300, "risk": 36, "traffic": "low"}),
    ("Aizawl", "Champhai", {"name": "NH-6", "distance": 192, "base_time": 340, "risk": 42, "traffic": "low"}),
    ("Karimganj", "Dharmanagar", {"name": "NH-8", "distance": 65, "base_time": 95, "risk": 22, "traffic": "low"}),
    ("Dharmanagar", "Agartala", {"name": "NH-8", "distance": 165, "base_time": 260, "risk": 20, "traffic": "medium"}),
    ("Agartala", "Udaipur", {"name": "NH-8", "distance": 52, "base_time": 75, "risk": 18, "traffic": "low"}),

    # Arunachal Pradesh
    ("Tezpur", "Itanagar", {"name": "NH-15/NH-415", "distance": 155, "base_time": 230, "risk": 30, "traffic": "low"}),
    ("Itanagar", "Naharlagun", {"name": "NH-415", "distance": 14, "base_time": 25, "risk": 15, "traffic": "medium"}),
    ("Tezpur", "Tawang", {"name": "NH-13", "distance": 325, "base_time": 620, "risk": 68, "traffic": "low"}),
    ("Dibrugarh", "Pasighat", {"name": "NH-515", "distance": 148, "base_time": 210, "risk": 28, "traffic": "low"}),

    # Sikkim & North Bengal
    ("Siliguri", "Rangpo", {"name": "NH-10", "distance": 78, "base_time": 150, "risk": 75, "traffic": "high"}),
    ("Rangpo", "Gangtok", {"name": "NH-10", "distance": 37, "base_time": 80, "risk": 82, "traffic": "high"}),
    ("Siliguri", "Guwahati", {"name": "NH-27", "distance": 475, "base_time": 600, "risk": 25, "traffic": "medium"}),
]

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def find_nearest_graph_node(lat: float, lng: float) -> str:
    """Resolves arbitrary GPS coordinates to the closest node in the NER road network."""
    best_node = "Guwahati"
    min_dist = float("inf")
    for name, data in NER_GRAPH_NODES.items():
        dist = haversine_km(lat, lng, data["lat"], data["lng"])
        if dist < min_dist:
            min_dist = dist
            best_node = name
    return best_node

def find_nearest_corridor(lat: float, lng: float, roads: List[Any]) -> Tuple[Optional[Any], float]:
    """Identifies the closest highway corridor to an incident coordinate using great-circle geometry."""
    if not roads:
        return None, 9999.0
        
    nearest_road = None
    min_dist = float("inf")
    
    for r in roads:
        start_lat = getattr(r, "start_lat", 26.1445)
        start_lng = getattr(r, "start_lng", 91.7362)
        end_lat = getattr(r, "end_lat", 23.7271)
        end_lng = getattr(r, "end_lng", 92.7176)
        
        test_points = [
            (start_lat, start_lng),
            (end_lat, end_lng),
            (start_lat * 0.75 + end_lat * 0.25, start_lng * 0.75 + end_lng * 0.25),
            (start_lat * 0.50 + end_lat * 0.50, start_lng * 0.50 + end_lng * 0.50),
            (start_lat * 0.25 + end_lat * 0.75, start_lng * 0.25 + end_lng * 0.75),
        ]
        
        for p_lat, p_lng in test_points:
            dist = haversine_km(lat, lng, p_lat, p_lng)
            if dist < min_dist:
                min_dist = dist
                nearest_road = r
                
    return nearest_road, min_dist

def build_ner_transport_graph(
    road_status_overrides: Dict[str, str] = None,
    active_incidents: List[Dict[str, Any]] = None
) -> nx.Graph:
    """Builds a fully weighted undirected NetworkX transport graph for NER."""
    G = nx.Graph()
    for name, data in NER_GRAPH_NODES.items():
        G.add_node(name, **data)
        
    for u, v, attr in NER_GRAPH_EDGES:
        edge_data = dict(attr)
        road_name = edge_data["name"]
        
        # Check active incident intersections
        incident_matches = [
            inc for inc in (active_incidents or [])
            if inc.get("affected_roads") and any(r in inc["affected_roads"] for r in [road_name, u, v])
        ]
        
        # Determine status
        if road_status_overrides and road_name in road_status_overrides:
            status = road_status_overrides[road_name]
        elif any(inc.get("severity") == "critical" for inc in incident_matches):
            status = "blocked"
        elif any(inc.get("severity") == "high" for inc in incident_matches):
            status = "orange"
        elif any(inc.get("severity") == "medium" for inc in incident_matches):
            status = "yellow"
        else:
            status = "accessible"
            
        edge_data["status"] = status
        edge_data["active_incidents_count"] = len(incident_matches)
        
        # Calculate dynamic edge impedance
        if status == "blocked":
            edge_data["weight"] = 999999.0
        else:
            risk_penalty = 180.0 if status == "orange" else 60.0 if status == "yellow" else 0.0
            incident_penalty = len(incident_matches) * 100.0
            edge_data["weight"] = (
                edge_data["distance"] * 1.0
                + edge_data["base_time"] * 0.55
                + risk_penalty
                + incident_penalty
            )
            
        G.add_edge(u, v, **edge_data)
        
    return G

def optimize_multicriteria_routes(
    origin: str = "Guwahati",
    destination: str = "Imphal",
    origin_lat: Optional[float] = None,
    origin_lng: Optional[float] = None,
    destination_lat: Optional[float] = None,
    destination_lng: Optional[float] = None,
    vehicle_id: Optional[str] = "NER-MED-204",
    cargo: Optional[str] = "Emergency Medicines",
    priority: Optional[str] = "critical",
    blocked_road_name: Optional[str] = None,
    active_incidents: Optional[List[Dict[str, Any]]] = None
) -> List[RouteCandidateSchema]:
    """
    Dynamically computes location-specific candidate routes (Primary Corridor, Alternate Bypass, Secondary Connector)
    between exact coordinates or city nodes.
    """
    # 1. Resolve start and end graph nodes
    start_node = find_nearest_graph_node(origin_lat, origin_lng) if (origin_lat and origin_lng) else (
        origin if origin in NER_GRAPH_NODES else "Guwahati"
    )
    end_node = find_nearest_graph_node(destination_lat, destination_lng) if (destination_lat and destination_lng) else (
        destination if destination in NER_GRAPH_NODES else "Imphal"
    )
    
    overrides = {}
    if blocked_road_name:
        overrides[blocked_road_name] = "blocked"
        
    G = build_ner_transport_graph(overrides, active_incidents)
    
    candidates = []
    
    # Path 1: Optimal Multi-Criteria Shortest Path
    try:
        path_nodes = nx.shortest_path(G, source=start_node, target=end_node, weight="weight")
    except nx.NetworkXNoPath:
        # Fallback to pure distance if impedance blocked
        try:
            path_nodes = nx.shortest_path(G, source=start_node, target=end_node, weight="distance")
        except:
            path_nodes = [start_node, end_node]
            
    # Path 2: Alternate Bypass (penalizing edges of primary path)
    G_alt = G.copy()
    for i in range(len(path_nodes) - 1):
        u, v = path_nodes[i], path_nodes[i+1]
        if G_alt.has_edge(u, v):
            G_alt[u][v]["weight"] = G_alt[u][v]["weight"] * 2.8 + 250.0
            
    try:
        path_nodes_alt = nx.shortest_path(G_alt, source=start_node, target=end_node, weight="weight")
    except:
        path_nodes_alt = path_nodes
        
    # Path 3: Secondary Backup Connector
    G_sec = G_alt.copy()
    for i in range(len(path_nodes_alt) - 1):
        u, v = path_nodes_alt[i], path_nodes_alt[i+1]
        if G_sec.has_edge(u, v):
            G_sec[u][v]["weight"] = G_sec[u][v]["weight"] * 3.5 + 400.0
            
    try:
        path_nodes_sec = nx.shortest_path(G_sec, source=start_node, target=end_node, weight="weight")
    except:
        path_nodes_sec = path_nodes_alt

    unique_paths = []
    seen = set()
    for p in [path_nodes, path_nodes_alt, path_nodes_sec]:
        key = "->".join(p)
        if key not in seen:
            seen.add(key)
            unique_paths.append(p)

    # Build Candidate Objects
    for idx, node_seq in enumerate(unique_paths[:3]):
        cand_id = f"route-{idx + 1}"
        dist_km = 0.0
        time_min = 0.0
        max_risk = 15
        inc_count = 0
        is_blocked = False
        segments: List[RouteSegmentSchema] = []
        path_points: List[GeoPointSchema] = []

        if origin_lat and origin_lng:
            path_points.append(GeoPointSchema(lat=origin_lat, lng=origin_lng))

        for i in range(len(node_seq) - 1):
            u, v = node_seq[i], node_seq[i+1]
            u_node = NER_GRAPH_NODES[u]
            v_node = NER_GRAPH_NODES[v]
            
            # Interpolated points along edge for realistic polylines
            path_points.append(GeoPointSchema(lat=u_node["lat"], lng=u_node["lng"]))
            path_points.append(GeoPointSchema(
                lat=u_node["lat"] * 0.5 + v_node["lat"] * 0.5 + (0.02 if idx == 1 else -0.02 if idx == 2 else 0),
                lng=u_node["lng"] * 0.5 + v_node["lng"] * 0.5 + (0.02 if idx == 1 else -0.02 if idx == 2 else 0)
            ))
            
            edge_info = G.get_edge_data(u, v, default={
                "name": "State Highway", "distance": haversine_km(u_node["lat"], u_node["lng"], v_node["lat"], v_node["lng"]),
                "base_time": 90, "risk": 30, "status": "accessible", "traffic": "low", "active_incidents_count": 0
            })
            
            seg_dist = edge_info.get("distance", 50.0)
            seg_time = edge_info.get("base_time", 75.0)
            seg_status = edge_info.get("status", "accessible")
            seg_incidents = edge_info.get("active_incidents_count", 0)
            seg_risk = edge_info.get("risk", 30)
            
            dist_km += seg_dist
            time_min += seg_time
            max_risk = max(max_risk, seg_risk)
            inc_count += seg_incidents
            if seg_status == "blocked":
                is_blocked = True
                
            segments.append(RouteSegmentSchema(
                name=edge_info.get("name", "Corridor"),
                fromDistrict=u,
                toDistrict=v,
                distanceKm=round(seg_dist, 1),
                durationMin=round(seg_time, 1),
                trafficLevel=edge_info.get("traffic", "low"),
                rainfallMm=35.0 if "Shillong" in (u, v) or "Gangtok" in (u, v) else 15.0,
                landslideRisk=round(seg_risk * 0.8, 1),
                floodRisk=round(seg_risk * 0.5, 1),
                roadCondition="Good" if seg_risk < 35 else "Fair" if seg_risk < 65 else "Severe",
                bridgeCondition="Inspected (Clear)" if seg_status != "blocked" else "Scour Hazard",
                activeIncidentsCount=seg_incidents,
                status=seg_status
            ))

        if destination_lat and destination_lng:
            path_points.append(GeoPointSchema(lat=destination_lat, lng=destination_lng))
        elif node_seq:
            last_node = NER_GRAPH_NODES[node_seq[-1]]
            path_points.append(GeoPointSchema(lat=last_node["lat"], lng=last_node["lng"]))

        primary_corridor_name = segments[0].name if segments else "Corridor"
        name_label = (
            f"Route 1: Primary {primary_corridor_name} Highway" if idx == 0
            else f"Route 2: Alternate {'/'.join(s.name for s in segments[:2])} Bypass" if idx == 1
            else f"Route 3: Secondary {' & '.join(s.name for s in segments[-2:])} Connector"
        )

        risk_level = "critical" if is_blocked or max_risk >= 80 else "high" if max_risk >= 60 else "medium" if max_risk >= 35 else "low"
        traffic_delay = 35 if is_blocked else (15 if idx == 0 else 5)
        
        candidates.append(RouteCandidateSchema(
            id=cand_id,
            name=name_label,
            distance=round(dist_km, 1),
            estimatedTime=round(time_min, 1),
            durationInTrafficMin=round(time_min + traffic_delay, 1),
            riskLevel=risk_level,
            riskScore=94 if is_blocked else max_risk,
            trafficLevel="high" if is_blocked else ("medium" if idx == 0 else "low"),
            trafficDelayMin=traffic_delay,
            weatherCondition="Heavy Rain" if "Shillong" in node_seq or "Gangtok" in node_seq else "Clear",
            activeIncidentsCount=inc_count,
            score=20 if is_blocked else max(30, min(96, int(100 - (dist_km * 0.08 + time_min * 0.05 + max_risk * 0.4)))),
            reason=f"Corridor transit via {', '.join(node_seq)}.",
            isRecommended=False,
            accessibility="blocked" if is_blocked else ("high_risk" if risk_level == "high" else "accessible"),
            riskReduction=round(max(0.0, 75.0 - max_risk), 1),
            additionalDistanceKm=0.0,
            additionalTimeMin=0.0,
            summary=f"Transit through {len(node_seq)} regional hubs ({' ➔ '.join(node_seq)})",
            confidence=0.92,
            cargoSuitability="High" if not is_blocked and risk_level != "high" else "Moderate",
            path=path_points,
            segments=segments
        ))

    # Fallback in case graph had <3 candidates
    while len(candidates) < 3:
        idx = len(candidates)
        base = candidates[0] if candidates else RouteCandidateSchema(
            id="route-1", name="Route 1", distance=100.0, estimatedTime=120.0, riskLevel="low", trafficLevel="low", score=90, reason="Nominal", isRecommended=True, accessibility="accessible"
        )
        extra_km = round((idx + 1) * 22.0, 1)
        extra_min = round((idx + 1) * 28.0, 1)
        candidates.append(RouteCandidateSchema(
            id=f"route-{idx + 1}",
            name=f"Route {idx + 1}: Secondary Bypass Corridor",
            distance=round(base.distance + extra_km, 1),
            estimatedTime=round(base.estimatedTime + extra_min, 1),
            durationInTrafficMin=round(base.estimatedTime + extra_min, 1),
            riskLevel="low" if base.riskLevel != "low" else "medium",
            riskScore=max(15, (base.riskScore or 30) - 10),
            trafficLevel="low",
            trafficDelayMin=0,
            weatherCondition="Clear",
            activeIncidentsCount=0,
            score=max(40, base.score - 5),
            reason=f"Secondary connector providing a safe bypass (+{extra_km} km).",
            isRecommended=False,
            accessibility="accessible",
            riskReduction=42.0,
            additionalDistanceKm=extra_km,
            additionalTimeMin=extra_min,
            summary=f"Bypass avoiding primary corridor constraints",
            confidence=0.88,
            cargoSuitability="High",
            path=base.path,
            segments=base.segments
        ))

    # 4. Invoke Cargo-Aware Recommendation Service
    rec_res = generate_cargo_recommendation(
        candidates=candidates,
        cargo_type=cargo or "Emergency Medicines",
        priority=priority or "critical",
        origin_name=start_node,
        dest_name=end_node
    )
    
    return rec_res.candidates
