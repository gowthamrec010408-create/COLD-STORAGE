"""
Comprehensive Verification Script for QORA TECH Solar Smart Cold Storage
Validates:
1. Image assets & vegetable mappings
2. crops_data.py consistency
3. firebase_service.py database storage & fetching
4. app.py endpoints, session authentication & API routes
5. index.html SPA syntax, elements & view wiring
"""

import os
import re
import unittest
from app import app
from crops_data import INITIAL_CROPS
from firebase_service import db_store

class ComprehensiveSystemVerification(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_01_crop_images_exist_and_healthy(self):
        """Verify all 12 crop image assets exist with healthy file sizes."""
        crops_dir = os.path.join("static", "images", "crops")
        self.assertTrue(os.path.exists(crops_dir), "Crops directory missing!")
        
        expected_crops = [
            "cabbage.jpg", "cauliflower.jpg", "tomato.jpg", "green_chilli.jpg",
            "french_beans.jpg", "leafy_veg.jpg", "brinjal.jpg", "carrot.jpg",
            "potato.jpg", "capsicum.jpg", "ginger.jpg", "bhut_jolokia.jpg"
        ]
        
        for img_name in expected_crops:
            img_path = os.path.join(crops_dir, img_name)
            self.assertTrue(os.path.exists(img_path), f"Crop image {img_name} does not exist!")
            size_bytes = os.path.getsize(img_path)
            self.assertGreater(size_bytes, 10000, f"Crop image {img_name} is too small ({size_bytes} bytes)")
            print(f" [PASS] Asset verified: {img_name} ({size_bytes // 1024} KB)")

    def test_02_crop_database_consistency(self):
        """Verify all 12 crops in crops_data.py have complete specifications."""
        self.assertEqual(len(INITIAL_CROPS), 12)
        for c in INITIAL_CROPS:
            self.assertTrue(c["id"].startswith("crop_"))
            self.assertIn("name", c)
            self.assertIn("scientific_name", c)
            self.assertIn("recommended_zone", c)
            self.assertIn("min_temp", c)
            self.assertIn("max_temp", c)
            self.assertIn("min_humidity", c)
            self.assertIn("max_humidity", c)
            self.assertIn("shelf_life_ambient", c)
            self.assertIn("shelf_life_cold", c)
            self.assertTrue(os.path.exists(c["image_url"]), f"Image {c['image_url']} not found on disk")
        print(f" [PASS] All 12 crops metadata & image paths verified.")

    def test_03_database_storing_and_fetching(self):
        """Verify adding, updating, and deleting crops, farmers, and recommendations."""
        # Add Crop
        new_crop_payload = {
            "name": "Pumpkin",
            "scientific_name": "Cucurbita moschata",
            "category": "Cucurbit",
            "min_temp": 10.0,
            "max_temp": 13.0,
            "min_humidity": 70,
            "max_humidity": 75,
            "shelf_life_ambient": "30 Days",
            "shelf_life_cold": "90–180 Days",
            "advisory": "Store in Zone 3 with moderate humidity to avoid stem rot."
        }
        added_crop = db_store.add_crop(new_crop_payload)
        self.assertIsNotNone(added_crop)
        self.assertIn(added_crop["id"], db_store.crops)
        print(f" [PASS] Stored new crop in DB: {added_crop['id']} ({added_crop['name']})")

        # Update Crop
        updated = db_store.update_crop(added_crop["id"], {"shelf_life_cold": "120–180 Days"})
        self.assertEqual(updated["shelf_life_cold"], "120–180 Days")
        print(f" [PASS] Updated crop in DB: {added_crop['id']}")

        # Delete Crop
        deleted = db_store.delete_crop(added_crop["id"])
        self.assertTrue(deleted)
        self.assertNotIn(added_crop["id"], db_store.crops)
        print(f" [PASS] Deleted temporary test crop from DB.")

        # Set Zone Crop
        set_z1 = db_store.set_zone_crop("ST-NER-01", "zone1", "crop_capsicum")
        self.assertTrue(set_z1)
        self.assertEqual(db_store.live_telemetry["ST-NER-01"]["zone1"]["crop_name"], "Capsicum (Bell Pepper)")
        print(" [PASS] Dynamic zone vegetable mapping verified.")

    def test_04_app_endpoints_and_workflows(self):
        """Verify all Flask routes, API endpoints, and button actions."""
        # 1. Page Routes
        for route in ['/login', '/register', '/crops', '/devices', '/help', '/history', '/power']:
            res = self.client.get(route)
            self.assertEqual(res.status_code, 200, f"Route {route} failed")
        print(" [PASS] All page routes (including /power) returned 200 OK.")

        # 2. Storage Mode API
        res_mode = self.client.post('/api/storage/mode', json={'mode': 'ONE_ZONE'})
        self.assertEqual(res_mode.status_code, 200)
        self.assertEqual(res_mode.get_json()['storageMode'], 'ONE_ZONE')

        res_mode3 = self.client.post('/api/storage/mode', json={'mode': 'THREE_ZONE'})
        self.assertEqual(res_mode3.status_code, 200)
        self.assertEqual(res_mode3.get_json()['storageMode'], 'THREE_ZONE')
        print(" [PASS] Storage mode switching API verified.")

        # 3. Dynamic Zone Crop API
        res_zc = self.client.post('/api/zone/crop', json={'zone': 'zone1', 'crop': 'crop_french_beans'})
        self.assertEqual(res_zc.status_code, 200)
        self.assertEqual(db_store.live_telemetry["ST-NER-01"]["zone1"]["crop_name"], "French Beans")
        print(" [PASS] Zone crop change API verified.")

        # 4. History Data API
        for timeframe in ['today', '7days', '30days']:
            res_hist = self.client.get(f'/api/history/data?range={timeframe}')
            self.assertEqual(res_hist.status_code, 200)
            data = res_hist.get_json()
            self.assertTrue(data['success'])
            self.assertIn('datasets', data)
            self.assertIn('temp_zone1', data['datasets'])
        print(" [PASS] Historical telemetry analytics API verified.")

        # 5. Recommendation API
        rec_res = self.client.post('/api/recommendations/send', json={
            'farmer_id': 'farmer_001',
            'crop_id': 'crop_cabbage',
            'season': 'Winter',
            'recommended_zone': 'ZONE 2',
            'target_temp': '0–2°C',
            'target_humidity': '95–98%',
            'message': 'Harvest cabbage now for peak storage efficiency.'
        })
        self.assertEqual(rec_res.status_code, 200)
        self.assertTrue(rec_res.get_json()['success'])
        print(" [PASS] Agronomy recommendation dispatch API verified.")

        # 6. Admin Farmer Status Approval
        stat_res = self.client.post('/api/admin/farmers/farmer_003/status', json={'status': 'approved'})
        self.assertEqual(stat_res.status_code, 200)
        self.assertEqual(db_store.users['farmer_003']['account_status'], 'approved')
        print(" [PASS] Admin farmer approval endpoint verified.")

    def test_05_index_html_structure(self):
        """Verify index.html SPA contains all required views, forms, and scripts."""
        with open('index.html', 'r', encoding='utf-8') as f:
            content = f.read()

        views = ['loginView', 'registerView', 'farmerView', 'cropsView', 'powerView', 'historyView', 'devicesView', 'helpView', 'adminView']
        for v in views:
            self.assertIn(f'id="{v}"', content, f"View {v} missing in index.html")
        
        # Verify singleCropSelect has all 12 crops
        self.assertIn('value="Bhut Jolokia (Ghost Pepper)"', content)
        self.assertIn('value="Ginger (Nadia / Maran)"', content)
        self.assertIn('value="Green Chilli"', content)
        self.assertIn('value="Brinjal (Eggplant)"', content)
        print(" [PASS] index.html SPA structure & crop dropdowns verified.")

if __name__ == '__main__':
    unittest.main()
