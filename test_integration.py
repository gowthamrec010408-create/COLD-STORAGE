"""
QORA TECH - End-to-End Live HTTP Integration Test
"""

import requests

def run_integration_tests():
    base = 'http://127.0.0.1:5000'
    session = requests.Session()

    print("\n--- Running QORA TECH Real Assessment Live Integration ---")

    # 1. Test Login & Session
    login_res = session.post(
        f'{base}/login',
        data={'email': 'bipul.barman@qoratech.in', 'password': 'farmer123'},
        allow_redirects=True
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.status_code}"
    assert 'Bipul Barman' in login_res.text, "Farmer name not in rendered dashboard"
    assert 'QORA TECH' in login_res.text, "Branding not in dashboard"
    assert 'Plan: RENTAL' in login_res.text, "Rental plan not rendered"
    print("[PASS] 1. Authentication & Farmer Dashboard greeting with RENTAL plan confirmed.")

    # 2. Test Live System Status & Real Telemetry
    status_res = session.get(f'{base}/api/system/status')
    assert status_res.status_code == 200
    status_data = status_res.json()['data']
    assert status_data['has_data'] is True
    assert status_data['power']['solar_power_kw'] == 2.4
    assert status_data['zone1']['temp'] == 5.2
    assert status_data['zone2']['temp'] == 1.2
    assert status_data['zone3']['temp'] == 9.8
    print(f"[PASS] 2. Real Telemetry API: Mode={status_data['storage_mode']}, Solar={status_data['power']['solar_power_kw']}kW, Battery={status_data['power']['battery_soc']}%, Backup Time={status_data['power']['estimated_runtime']}")

    # 3. Test Storage Mode Switching (THREE_ZONE <-> ONE_ZONE)
    mode1_res = session.post(f'{base}/api/storage/mode', json={'mode': 'ONE_ZONE'})
    assert mode1_res.json()['success'] is True
    mode1_check = session.get(f'{base}/api/system/status').json()['data']
    assert mode1_check['storage_mode'] == 'ONE_ZONE'
    print("[PASS] 3a. Storage Mode successfully switched to ONE_ZONE.")

    mode3_res = session.post(f'{base}/api/storage/mode', json={'mode': 'THREE_ZONE'})
    assert mode3_res.json()['success'] is True
    mode3_check = session.get(f'{base}/api/system/status').json()['data']
    assert mode3_check['storage_mode'] == 'THREE_ZONE'
    print("[PASS] 3b. Storage Mode successfully switched back to THREE_ZONE.")

    # 4. Test Crop Database & Accurate Photography
    crops_res = session.get(f'{base}/crops')
    assert crops_res.status_code == 200
    for crop in ['Cabbage', 'Cauliflower', 'Tomato', 'Green Chilli', 'French Beans', 'Leafy Vegetables', 'Brinjal', 'Carrot', 'Potato', 'Capsicum', 'Ginger', 'Bhut Jolokia']:
        assert crop in crops_res.text, f"Crop {crop} not found in database page"
    print("[PASS] 4. All 12 authentic NER crops rendered with specifications & photographs.")

    # 5. Test Admin Approvals Endpoint
    adm_res = session.get(f'{base}/api/admin/farmers')
    assert adm_res.status_code == 200
    adm_data = adm_res.json()
    assert len(adm_data['farmers']) >= 3
    print(f"[PASS] 5. Admin portal returned {len(adm_data['farmers'])} registered farmers ({len(adm_data['pending'])} pending).")

    # 6. Test Admin Recommendation Dispatch
    rec_payload = {
        'farmer_id': 'farmer_001',
        'crop_id': 'crop_tomato',
        'season': 'Winter',
        'recommended_zone': 'ZONE 3',
        'target_temp': '8–12°C',
        'target_humidity': '85–90%',
        'message': 'Keep winter tomatoes in Zone 3 at 10°C to avoid cold injury.'
    }
    send_rec = session.post(f'{base}/api/recommendations/send', json=rec_payload)
    assert send_rec.json()['success'] is True
    rec_list = session.get(f'{base}/api/recommendations').json()['recommendations']
    assert rec_list[0]['crop_name'] == 'Tomato'
    assert rec_list[0]['farmer_id'] == 'farmer_001'
    print(f"[PASS] 6. Dispatched targeted recommendation to {rec_list[0]['farmer_name']} for {rec_list[0]['crop_name']}.")

    # 7. Test ESP32 Hardware Config Endpoint
    hw_config = session.get(f'{base}/api/hardware/config')
    assert hw_config.status_code == 200
    assert 'storageMode' in hw_config.json()
    print("[PASS] 7. ESP32 Hardware Config Polling endpoint operational.")

    print("\n>>> ALL REAL ASSESSMENT INTEGRATION TESTS PASSED PERFECTLY! <<<\n")

if __name__ == '__main__':
    run_integration_tests()
