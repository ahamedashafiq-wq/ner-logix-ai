from sqlalchemy import Column, String, Float, Integer, Boolean, Text, JSON, DateTime
from datetime import datetime
from backend.app.database import Base

class UserModel(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="viewer")  # admin, logistics_manager, field_officer, viewer
    hashed_password = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DistrictModel(Base):
    __tablename__ = "districts"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    state = Column(String, index=True, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    accessibility_score = Column(Integer, default=75)
    connectivity_score = Column(Integer, default=75)
    connectivity_status = Column(String, default="GOOD")
    road_status = Column(String, default="open")
    weather_risk = Column(String, default="low")
    active_incidents = Column(Integer, default=0)
    delayed_deliveries = Column(Integer, default=0)
    supply_status = Column(String, default="adequate")
    population = Column(String, default="100k")
    isolation_risk = Column(Integer, default=15)
    estimated_isolation_hours = Column(Float, default=48.0)

class RoadModel(Base):
    __tablename__ = "roads"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    start_district = Column(String, nullable=False)
    end_district = Column(String, nullable=False)
    status = Column(String, default="accessible")  # accessible, yellow, orange, blocked
    risk_level = Column(String, default="low")     # low, medium, high, critical
    rainfall_mm = Column(Float, default=20.0)
    traffic_level = Column(String, default="low")
    road_condition = Column(String, default="Good")
    landslide_prob = Column(Integer, default=15)
    flood_risk = Column(Integer, default=10)
    overall_risk = Column(Integer, default=20)
    delay_min = Column(Integer, default=0)
    length_km = Column(Float, default=100.0)
    elevation_m = Column(Float, default=500.0)
    affected_vehicles = Column(JSON, default=list)
    affected_deliveries = Column(JSON, default=list)

class VehicleModel(Base):
    __tablename__ = "vehicles"
    id = Column(String, primary_key=True, index=True)
    vehicle_number = Column(String, index=True, nullable=False)
    type = Column(String, default="truck")
    driver_id = Column(String, nullable=False)
    driver_name = Column(String, nullable=False)
    current_lat = Column(Float, nullable=False)
    current_lng = Column(Float, nullable=False)
    speed = Column(Float, default=0.0)
    status = Column(String, default="available")
    cargo = Column(String, nullable=True)
    cargo_priority = Column(String, default="medium")  # critical, high, medium, low
    capacity = Column(Float, default=3000.0)
    current_load = Column(Float, default=0.0)
    fuel = Column(Float, default=100.0)
    battery = Column(Float, nullable=True)
    current_delivery_id = Column(String, nullable=True)
    origin = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    eta = Column(String, nullable=True)
    delivery_percentage = Column(Float, default=0.0)
    risk_level = Column(String, default="low")
    is_demo_gps = Column(Boolean, default=True)

class DeliveryModel(Base):
    __tablename__ = "deliveries"
    id = Column(String, primary_key=True, index=True)
    pickup_location = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    cargo_type = Column(String, nullable=False)
    cargo_weight = Column(Float, default=0.0)
    priority = Column(String, default="medium")
    status = Column(String, default="in_transit")
    vehicle_id = Column(String, nullable=True)
    scheduled_time = Column(String, nullable=False)
    eta = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    risk_level = Column(String, default="low")
    delay_minutes = Column(Integer, default=0)

class IncidentModel(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    status = Column(String, default="active")
    location = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    timestamp = Column(String, default="Just now")
    description = Column(Text, default="")
    reported_by = Column(String, default="Command Center")
    affected_roads = Column(JSON, default=list)
    affected_vehicles = Column(JSON, default=list)
    confidence = Column(Float, default=90.0)
    photo_data_url = Column(Text, nullable=True)

class AlertModel(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    message = Column(String, nullable=False)
    title = Column(String, nullable=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    recommended_action = Column(String, nullable=True)
    affected_vehicles = Column(JSON, default=list)
    affected_deliveries = Column(JSON, default=list)
    timestamp = Column(String, default="Just now")
    resolved = Column(Boolean, default=False)

class SupplyModel(Base):
    __tablename__ = "supplies"
    id = Column(String, primary_key=True, index=True)
    category = Column(String, nullable=False)
    name = Column(String, nullable=False)
    stock = Column(Float, default=0.0)
    incoming = Column(Float, default=0.0)
    outgoing = Column(Float, default=0.0)
    minimum_threshold = Column(Float, default=30.0)
    risk_level = Column(String, default="low")
    days_remaining = Column(Float, default=7.0)
    priority_score = Column(Integer, default=50)
    warehouses_json = Column(JSON, default=list)

class WarehouseModel(Base):
    __tablename__ = "warehouses"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    capacity = Column(Float, default=100.0)
    current_inventory = Column(Float, default=70.0)
    daily_consumption = Column(Float, default=5.0)
    days_remaining = Column(Float, default=10.0)
    supplies_json = Column(JSON, default=list)

class WeatherModel(Base):
    __tablename__ = "weather_observations"
    district = Column(String, primary_key=True, index=True)
    temperature_c = Column(Float, default=24.0)
    rainfall_mm = Column(Float, default=20.0)
    humidity = Column(Float, default=80.0)
    wind_kph = Column(Float, default=15.0)
    visibility_km = Column(Float, default=6.0)
    condition = Column(String, default="Monsoon Rain")
    warning = Column(String, nullable=True)
    is_demo = Column(Boolean, default=True)
