import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import Base, engine, SessionLocal
from backend.app.services.seed_data import seed_database_if_empty

class TestLocationAwareness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        seed_database_if_empty(db)
        db.close()
        cls.client = TestClient(app)

    def test_different_locations_produce_different_routes(self):
        # 1. Guwahati -> Shillong (Short corridor ~98km)
        res1 = self.client.post("/api/routes/optimize", json={
            "origin": "Guwahati",
            "destination": "Shillong",
            "origin_lat": 26.1445,
            "origin_lng": 91.7362,
            "destination_lat": 25.5788,
            "destination_lng": 91.8933,
            "cargo": "Emergency Medicines",
            "priority": "critical"
        })
        self.assertEqual(res1.status_code, 200)
        routes1 = res1.json()
        self.assertGreaterEqual(len(routes1), 1)
        dist1 = routes1[0]["distance"]

        # 2. Guwahati -> Imphal (Long mountain corridor ~470km+)
        res2 = self.client.post("/api/routes/optimize", json={
            "origin": "Guwahati",
            "destination": "Imphal",
            "origin_lat": 26.1445,
            "origin_lng": 91.7362,
            "destination_lat": 24.8170,
            "destination_lng": 93.9368,
            "cargo": "Emergency Medicines",
            "priority": "critical"
        })
        self.assertEqual(res2.status_code, 200)
        routes2 = res2.json()
        dist2 = routes2[0]["distance"]

        # 3. Siliguri -> Gangtok (Sikkim lifeline ~115km)
        res3 = self.client.post("/api/routes/optimize", json={
            "origin": "Siliguri",
            "destination": "Gangtok",
            "origin_lat": 26.7271,
            "origin_lng": 88.3953,
            "destination_lat": 27.3389,
            "destination_lng": 88.6065,
            "cargo": "Oxygen Cylinders",
            "priority": "critical"
        })
        self.assertEqual(res3.status_code, 200)
        routes3 = res3.json()
        dist3 = routes3[0]["distance"]

        # Assert distinct distances, ETAs, and paths
        self.assertNotEqual(dist1, dist2)
        self.assertNotEqual(dist2, dist3)
        self.assertNotEqual(dist1, dist3)
        self.assertLess(abs(dist1 - 98.0), 30.0)  # Approx 98km
        self.assertGreater(dist2, 350.0)         # Imphal is far
        self.assertLess(dist3, 200.0)            # Gangtok corridor

    def test_location_weather_varies_by_coordinates(self):
        # Shillong coordinates (25.5788, 91.8933)
        res_shillong = self.client.get("/api/weather/location?lat=25.5788&lng=91.8933")
        self.assertEqual(res_shillong.status_code, 200)
        w_shillong = res_shillong.json()
        self.assertEqual(w_shillong["district"], "Shillong")
        self.assertEqual(w_shillong["state"], "Meghalaya")

        # Imphal coordinates (24.8170, 93.9368)
        res_imphal = self.client.get("/api/weather/location?lat=24.8170&lng=93.9368")
        self.assertEqual(res_imphal.status_code, 200)
        w_imphal = res_imphal.json()
        self.assertEqual(w_imphal["district"], "Imphal")
        self.assertEqual(w_imphal["state"], "Manipur")

        # Ensure location attributes are distinct
        self.assertNotEqual(w_shillong["latitude"], w_imphal["latitude"])
        self.assertNotEqual(w_shillong["longitude"], w_imphal["longitude"])
        self.assertNotEqual(w_shillong["district"], w_imphal["district"])

    def test_incident_geofiltering_by_radius(self):
        # Search around Tamenglong (24.98, 93.62) where landslide is seeded
        res_near = self.client.get("/api/incidents/nearby?lat=24.98&lng=93.62&radius=30")
        self.assertEqual(res_near.status_code, 200)
        data_near = res_near.json()
        self.assertGreaterEqual(data_near["totalCount"], 1)
        self.assertTrue(any("Tamenglong" in (inc.get("location") or "") for inc in data_near["incidents"]))

        # Search around Gangtok (27.3389, 88.6065) with 20km radius (should NOT include Tamenglong landslide)
        res_far = self.client.get("/api/incidents/nearby?lat=27.3389&lng=88.6065&radius=20")
        self.assertEqual(res_far.status_code, 200)
        data_far = res_far.json()
        self.assertFalse(any("Tamenglong" in (inc.get("location") or "") for inc in data_far["incidents"]))

    def test_cargo_aware_recommendation(self):
        # Critical medicine delivery
        res_med = self.client.post("/api/routes/optimize", json={
            "origin": "Guwahati",
            "destination": "Imphal",
            "origin_lat": 26.1445,
            "origin_lng": 91.7362,
            "destination_lat": 24.8170,
            "destination_lng": 93.9368,
            "cargo": "Emergency Medicines",
            "priority": "critical"
        })
        self.assertEqual(res_med.status_code, 200)
        med_routes = res_med.json()
        rec_med = next(r for r in med_routes if r["isRecommended"])
        self.assertTrue("Emergency Medicines" in rec_med["reason"] or "disruption" in rec_med["reason"].lower() or "risk" in rec_med["reason"].lower())

    def test_nearby_map_bundle(self):
        res = self.client.get("/api/map/nearby?lat=26.1445&lng=91.7362&radius=80")
        self.assertEqual(res.status_code, 200)
        bundle = res.json()
        self.assertIn("centerLat", bundle)
        self.assertIn("vehicles", bundle)
        self.assertIn("roads", bundle)
        self.assertIn("weather", bundle)
        self.assertIsNotNone(bundle["weather"])

if __name__ == "__main__":
    unittest.main()
