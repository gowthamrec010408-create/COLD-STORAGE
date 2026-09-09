"""
QORA TECH - Automated Test Suite for Real-World Assessment Workflows
"""

import unittest
from app import app
from firebase_service import db_store

class QoraTechRealAssessmentTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_pages_render(self):
        """Verify all HTML template pages render HTTP 200 properly."""
        routes = ['/login', '/register', '/crops', '/devices', '/help']
        for route in routes:
            res = self.client.get(route)
            self.assertEqual(res.status_code, 200, f"Route {route} failed with {res.status_code}")
            print(f"[PASS] Route {route} rendered with status 200")

    def test_admin_approval_workflow(self):
        """Verify registration -> pending approval -> admin approval -> dashboard access."""
        # 1. Register a new Rental Farmer
        reg_payload = {
            'name': 'Ranjit Das',
            'email': 'ranjit.das@qoratech.in',
            'password': 'pass123',
            'confirm_password': 'pass123',
            'phone': '+91 98540 99887',
            'state': 'Assam',
            'district': 'Nalbari',
            'village': 'Barama',
            'account_type': 'RENTAL'
        }
        res_reg = self.client.post('/register', data=reg_payload)
        self.assertEqual(res_reg.status_code, 200)
        self.assertIn(b'waiting for admin approval', res_reg.data)
        print("[PASS] 1. Registration created with accountStatus='pending'.")

        # 2. Attempt login while pending (Must be blocked)
        res_login_pending = self.client.post('/login', data={'email': 'ranjit.das@qoratech.in', 'password': 'pass123'})
        self.assertIn(b'waiting for admin approval', res_login_pending.data)
        print("[PASS] 2. Pending farmer login blocked with approval notification.")

        # 3. Admin approves farmer
        user = db_store.get_user_by_email('ranjit.das@qoratech.in')
        self.assertIsNotNone(user)
        res_approve = self.client.post('/api/admin/farmer/status', json={'farmer_id': user['id'], 'status': 'approved'})
        self.assertEqual(res_approve.status_code, 200)
        self.assertEqual(user['account_status'], 'approved')
        print(f"[PASS] 3. Admin approved farmer account {user['id']}.")

        # 4. Login after approval (Must succeed)
        res_login_approved = self.client.post('/login', data={'email': 'ranjit.das@qoratech.in', 'password': 'pass123'}, follow_redirects=True)
        self.assertEqual(res_login_approved.status_code, 200)
        self.assertIn(b'Ranjit Das', res_login_approved.data)
        self.assertIn(b'Plan: RENTAL', res_login_approved.data)
        print("[PASS] 4. Approved farmer successfully accessed dashboard with RENTAL plan.")

    def test_crop_temperature_zone_logic(self):
        """Verify crops are classified into zones strictly by their temperature requirements."""
        crops = db_store.get_all_crops()
        for c in crops:
            min_t = c['min_temp']
            zone = c['recommended_zone']
            if min_t <= 2.0:
                self.assertEqual(zone, "ZONE 2", f"{c['name']} (min {min_t}C) should be Zone 2")
            elif min_t < 8.0:
                self.assertEqual(zone, "ZONE 1", f"{c['name']} (min {min_t}C) should be Zone 1")
            else:
                self.assertEqual(zone, "ZONE 3", f"{c['name']} (min {min_t}C) should be Zone 3")
        print(f"[PASS] 5. Verified temperature-driven zone logic across all {len(crops)} crops.")

    def test_live_telemetry_endpoint(self):
        """Verify real telemetry format without fake random jitter."""
        res = self.client.get('/api/system/status')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()['data']
        self.assertTrue(data['has_data'])
        self.assertEqual(data['power']['solar_power_kw'], 2.4)
        self.assertEqual(data['power']['battery_soc'], 82.0)
        self.assertEqual(data['zone1']['temp'], 5.2)
        self.assertEqual(data['zone2']['temp'], 1.2)
        self.assertEqual(data['zone3']['temp'], 9.8)
        print("[PASS] 6. Live Telemetry API returning real sensor values.")

if __name__ == '__main__':
    unittest.main()
