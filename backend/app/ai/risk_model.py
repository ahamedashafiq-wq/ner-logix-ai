"""
Scikit-Learn ML Risk Prediction Engine for NER Terrain
Utilizes Random Forest Classifier + Regressor with factor attribution.
"""
import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from backend.app.schemas import RiskPredictionRequest, RiskPredictionResponse

MODEL_PATH = os.path.join(os.path.dirname(__file__), "ner_rf_risk_model.pkl")

# Categorical mapping dictionaries
ROAD_COND_MAP = {"good": 0.1, "fair": 0.4, "poor": 0.75, "severely damaged": 1.0}
TRAFFIC_MAP = {"low": 0.15, "medium": 0.45, "heavy": 0.8, "extreme": 1.0}
BRIDGE_MAP = {"good": 0.1, "fair": 0.4, "poor": 0.7, "critical damage": 1.0}

def _train_and_save_model():
    """Generates synthetic training dataset of 2,000 NER terrain samples and trains Random Forest."""
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    
    np.random.seed(42)
    n_samples = 2000
    
    rain = np.random.uniform(5, 140, n_samples)
    rain_24h = rain * np.random.uniform(1.2, 2.5, n_samples)
    rain_72h = rain_24h * np.random.uniform(1.5, 3.0, n_samples)
    slope = np.random.uniform(5, 55, n_samples)
    elevation = np.random.uniform(100, 2400, n_samples)
    soil_moist = np.clip((rain_72h / 300) * 80 + np.random.uniform(10, 25, n_samples), 10, 100)
    river_lvl = np.random.uniform(0.5, 5.0, n_samples)
    hist_ls = np.random.poisson(2, n_samples)
    road_cond = np.random.choice([0.1, 0.4, 0.75, 1.0], n_samples)
    traffic = np.random.choice([0.15, 0.45, 0.8, 1.0], n_samples)
    bridge_cond = np.random.choice([0.1, 0.4, 0.7, 1.0], n_samples)
    
    # Feature matrix X
    X = np.column_stack([
        rain, rain_24h, rain_72h, slope, elevation, soil_moist,
        river_lvl, hist_ls, road_cond, traffic, bridge_cond
    ])
    
    # Ground truth formula with physical terrain dynamics
    ls_risk = (rain_24h / 180.0) * 35 + (slope / 45.0) * 30 + (soil_moist / 100.0) * 20 + hist_ls * 3
    fl_risk = (rain / 90.0) * 35 + (river_lvl / 4.0) * 45
    rd_risk = road_cond * 40 + bridge_cond * 35 + traffic * 25
    
    composite_risk = np.clip(np.maximum(ls_risk, np.maximum(fl_risk, rd_risk)), 5, 99)
    
    # Event labels
    event_labels = []
    for i in range(n_samples):
        if ls_risk[i] >= 65 and slope[i] >= 28:
            event_labels.append("LANDSLIDE")
        elif fl_risk[i] >= 65 and river_lvl[i] >= 2.5:
            event_labels.append("FLOOD")
        elif rd_risk[i] >= 65:
            event_labels.append("ROAD_DAMAGE")
        elif composite_risk[i] >= 45:
            event_labels.append("MONSOON_HAZARD")
        else:
            event_labels.append("SAFE")
            
    clf = RandomForestClassifier(n_estimators=40, max_depth=8, random_state=42)
    reg = RandomForestRegressor(n_estimators=40, max_depth=8, random_state=42)
    
    clf.fit(X, event_labels)
    reg.fit(X, composite_risk)
    
    model_bundle = {
        "classifier": clf,
        "regressor": reg,
        "feature_names": [
            "rainfall", "rainfall_24h", "rainfall_72h", "slope", "elevation",
            "soil_moisture", "river_level", "historical_landslides",
            "road_condition", "traffic_density", "bridge_condition"
        ]
    }
    joblib.dump(model_bundle, MODEL_PATH)
    return model_bundle

def load_or_train_model():
    if os.path.exists(MODEL_PATH):
        try:
            return joblib.load(MODEL_PATH)
        except Exception:
            return _train_and_save_model()
    return _train_and_save_model()

# Initialize ML model bundle
_MODEL_BUNDLE = load_or_train_model()

def predict_risk_ml(req: RiskPredictionRequest) -> RiskPredictionResponse:
    """Evaluates real Scikit-learn Random Forest model on incoming multi-parameter terrain vector."""
    road_cond_val = ROAD_COND_MAP.get(req.road_condition.lower(), 0.4)
    traffic_val = TRAFFIC_MAP.get(req.traffic_density.lower(), 0.45)
    bridge_val = BRIDGE_MAP.get(req.bridge_condition.lower(), 0.1)
    
    feat_vector = np.array([[
        req.rainfall,
        req.rainfall_24h,
        req.rainfall_72h,
        req.slope,
        req.elevation,
        req.soil_moisture,
        req.river_level,
        req.historical_landslides,
        road_cond_val,
        traffic_val,
        bridge_val
    ]])
    
    clf = _MODEL_BUNDLE["classifier"]
    reg = _MODEL_BUNDLE["regressor"]
    
    pred_risk_score = int(np.clip(reg.predict(feat_vector)[0], 5, 99))
    pred_event = clf.predict(feat_vector)[0]
    probs = clf.predict_proba(feat_vector)[0]
    confidence = float(np.max(probs) * 100)
    
    # Calculate contributing factors based on threshold triggers
    factors: List[str] = []
    if req.rainfall >= 60 or req.rainfall_24h >= 100:
        factors.append(f"Heavy rainfall ({req.rainfall:.1f} mm, 24h: {req.rainfall_24h:.1f} mm)")
    if req.soil_moisture >= 80:
        factors.append(f"High soil moisture saturation ({req.soil_moisture:.1f}%)")
    if req.slope >= 30:
        factors.append(f"Steep terrain slope gradient ({req.slope:.1f}°)")
    if req.river_level >= 2.5:
        factors.append(f"Surging river stage ({req.river_level:.1f}m above datum)")
    if road_cond_val >= 0.7:
        factors.append(f"Poor road condition ({req.road_condition})")
    if req.historical_landslides >= 2:
        factors.append(f"Historical slope shear zone ({req.historical_landslides} past occurrences)")
    if traffic_val >= 0.8:
        factors.append(f"High convoy traffic density ({req.traffic_density})")
        
    if not factors:
        factors.append("Nominal regional terrain and meteorological baseline")
        
    # Risk Level classification
    if pred_risk_score >= 81:
        risk_level = "CRITICAL"
        action = "Immediate corridor closure recommended. Divert all commercial & relief convoys to Route B."
    elif pred_risk_score >= 61:
        risk_level = "HIGH"
        action = "Issue high-risk transit advisory. Speed restriction 25 km/h with single-lane pilot convoy."
    elif pred_risk_score >= 31:
        risk_level = "MODERATE"
        action = "Maintain routine monsoon watch. Pre-position emergency culvert repair kits."
    else:
        risk_level = "LOW"
        action = "Corridor fully open and accessible for all logistics assets."
        
    return RiskPredictionResponse(
        risk_score=pred_risk_score,
        risk_level=risk_level,
        predicted_event=pred_event if pred_risk_score >= 40 else "SAFE",
        confidence=round(confidence, 1),
        contributing_factors=factors,
        recommended_action=action
    )
