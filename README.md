# NER-LOGIX AI — Regional Logistics Accessibility Intelligence Platform

> **AI-Powered Logistics Accessibility & Disaster Resilience Intelligence Command Center for India's North Eastern Region (NER)**

---

## 🌟 Executive Overview

**NER-LOGIX** monitors roads, bridges, relief convoys, meteorological sensors, landslides, floods, district isolation risks, and essential hospital supplies across all 8 North Eastern states (**Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura**).

The platform operates on a closed-loop intelligence architecture:

$$\text{WEATHER + ROAD + TERRAIN + INCIDENTS + TRAFFIC} \longrightarrow \text{AI RISK PREDICTION} \longrightarrow \text{ROAD ACCESSIBILITY} \longrightarrow \text{ROUTE OPTIMIZATION} \longrightarrow \text{VEHICLE TRACKING} \longrightarrow \text{ALERTS} \longrightarrow \text{FIELD RESPONSE}$$

---

## 🏗️ System Architecture

```
                  +-------------------------------------------------+
                  |           NEXT.JS / REACT 19 FRONTEND           |
                  |  (GIS Command Center, Copilot, PWA, Multi-Lang) |
                  +------------------------+------------------------+
                                           |  REST & WebSockets
                                           v
                  +-------------------------------------------------+
                  |              FASTAPI BACKEND CORE               |
                  |  /api/dashboard, /api/routes/optimize, ...      |
                  |  /ws/vehicles, /ws/alerts, /ws/incidents        |
                  +---------+--------------------+------------------+
                            |                    |
             +--------------+                    +----------------+
             v                                                    v
+-------------------------+                             +--------------------+
|   AI/ML RISK ENGINE     |                             |  GIS & ROUTING     |
| (Scikit-Learn Random    |                             | (NetworkX Graph,   |
| Forest Classifier/Reg)  |                             | Multi-Criteria)    |
+------------+------------+                             +----------+---------+
             |                                                     |
             +---------------------+-------------------------------+
                                   v
                  +-------------------------------------------------+
                  |              POSTGRESQL + POSTGIS               |
                  |  (Roads, Vehicles, Deliveries, Incidents, ...)  |
                  +-------------------------------------------------+
```

---

## 🚀 Key Modules & Capabilities

### 1. GIS Command Center & Corridor Inspection
- Live status color-coding for all regional highways:
  - 🟢 **GREEN**: Open / Fully Accessible
  - 🟡 **YELLOW**: Moderate Caution (Minor slip / waterlogging)
  - 🟠 **ORANGE**: High Risk (Precipitation threshold exceeded)
  - 🔴 **RED**: Blocked (Active landslide debris / bridge failure)
  - 🟣 **PURPLE**: Emergency Green-Corridor
- **Corridor Inspection Drawer**: Click any highway line to inspect rainfall, traffic density, landslide probability %, flood risk %, overall AI risk score, and click `[ FIND ALTERNATIVE ROUTE ]`.

### 2. Scikit-Learn AI/ML Risk Engine
- Implemented in `backend/app/ai/risk_model.py`:
  - Inputs: `rainfall`, `rainfall_24h`, `rainfall_72h`, `slope`, `elevation`, `soil_moisture`, `river_level`, `historical_landslides`, `road_condition`, `traffic_density`, `bridge_condition`.
  - Machine Learning: Multi-target **Random Forest Classifier + Regressor** with joblib persistence.
  - Explainable Output: Human-readable contributing factors (e.g., *"Heavy rainfall (82.0 mm)"*, *"Steep slope (38°)"*, *"High soil moisture saturation (94%)"*).

### 3. NetworkX AI Multi-Criteria Route Optimization
- Implemented in `backend/app/gis/network.py`:
  $$\text{Cost} = w_d \cdot \text{distance} + w_t \cdot \text{time} + p_{\text{traffic}} + p_{\text{weather}} + p_{\text{landslide}} + p_{\text{flood}} + p_{\text{blockage}}$$
  - Computes and compares **Route A** (Direct Highway), **Route B** (Southern Valley Bypass), and **Route C** (Northern Ridge Connector) with trade-off metrics.

### 4. "Medicine Delivery Emergency" Built-in Scenario
- Demonstrates the complete resilience workflow:
  $$\text{NER-MED-204 Dispatched} \rightarrow \text{Rainfall Surge} \rightarrow \text{Landslide on NH-14} \rightarrow \text{Road Blocked (92\% Risk)} \rightarrow \text{Route B Auto-Selected (72\% Risk Reduction)} \rightarrow \text{Hospital Alerted} \rightarrow \text{Delivery Protected}$$

### 5. NER Intelligence Copilot (`POST /api/copilot/query`)
- Grounded operational assistant answering questions on live data:
  - *"Which districts are high risk?"*
  - *"Which roads are blocked?"*
  - *"Find the safest medicine route."*
  - *"Which vehicles are delayed?"*
  - *"Which district may face medicine shortage?"*
  - *"What should authorities prioritize?"*

### 6. District Accessibility & Isolation Predictor
- Predicts physical isolation probabilities and pre-positioning time windows for high-risk mountain districts (e.g., Dima Hasao, Kohima, Tawang).

### 7. Supply Chain & Warehouse Intelligence
- Calculates **Supply Priority Score (0–100)** for Medicines, Food Grains, Rescue Kits, and Fuel, with automated depletion countdowns.

### 8. Offline Field Reports (PWA + IndexedDB)
- Field officers capture GPS coordinates, attach photo evidence, and log incident reports offline with automatic background sync upon reconnection.

### 9. Multilingual Support
- Complete 4-language support across **English (EN)**, **Hindi (HI)**, **Assamese (AS)**, and **Bengali (BN)**.

---

## 💻 Installation & Quickstart

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- (Optional) Docker & Docker Compose

### 1. Frontend Setup
```bash
# Clone the repository
git clone https://github.com/your-org/ner-logix-ai.git
cd ner-logix-ai

# Install dependencies
npm install

# Run the development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 2. Backend Setup (FastAPI)
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Start FastAPI server with live reload
uvicorn backend.app.main:app --reload --port 8000
```
Open API Swagger Docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**.

### 3. Running with Docker Compose
```bash
docker-compose up --build
```

---

## 📡 REST API & WebSockets Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/dashboard` | `GET` | Centralized regional KPIs and health index |
| `/api/roads` | `GET` | Real-time road status, risk %, and delays |
| `/api/districts` | `GET` | District accessibility scores across 8 states |
| `/api/districts/{id}/isolation` | `GET` | District isolation risk & time prediction |
| `/api/vehicles` | `GET` | Live telemetry, cargo, fuel/battery, and ETAs |
| `/api/vehicles/location` | `POST` | Updates vehicle GPS position and broadcasts |
| `/api/incidents` | `GET`, `POST` | Incident records and verified alerts |
| `/api/field-reports` | `POST` | Field officer reports with photo attachment |
| `/api/risk/predict` | `POST` | Scikit-learn Random Forest ML risk calculation |
| `/api/routes/optimize` | `POST` | NetworkX risk-weighted multi-criteria route solver |
| `/api/simulation/run` | `POST` | Disaster cascade before vs. after simulator |
| `/api/copilot/query` | `POST` | Grounded NER Intelligence Copilot responses |
| `/ws/vehicles` | `WS` | WebSocket stream for live vehicle GPS |
| `/ws/alerts` | `WS` | WebSocket stream for critical alerts |
| `/ws/incidents` | `WS` | WebSocket stream for new incident triggers |

---

## 🛡️ Roles & Permissions

| Role | Permissions |
| :--- | :--- |
| **ADMIN** | Full command center access, disaster simulator, emergency mode toggle, route override |
| **LOGISTICS_MANAGER** | Convoy dispatch, delivery rerouting, warehouse inventory management |
| **FIELD_OFFICER** | Incident logging, offline field reporting, GPS evidence capture |
| **VIEWER** | Read-only regional dashboard and corridor status monitoring |

---

## 📜 License
MIT License. Built for the Smart India Hackathon & Regional Disaster Logistics Innovation.
