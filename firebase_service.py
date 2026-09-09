"""
QORA TECH - Solar Smart Cold Storage
Firebase Realtime Database, Firestore & Authentication Service Layer
Configured for Project: solar-project-c85b5
"""

import os
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from crops_data import INITIAL_CROPS

FIREBASE_CONFIG = {
    "apiKey": "AIzaSyBqkt3YvIKQbMnBFbrD6FpvR4sNbXDomWw",
    "authDomain": "solar-project-c85b5.firebaseapp.com",
    "databaseURL": "https://solar-project-c85b5-default-rtdb.asia-southeast1.firebasedatabase.app",
    "projectId": "solar-project-c85b5",
    "storageBucket": "solar-project-c85b5.firebasestorage.app",
    "messagingSenderId": "536385864818",
    "appId": "1:536385864818:web:eb8b0d65b76a7a3a286eeb",
    "measurementId": "G-KCEY47EC1S"
}

class FirebaseDataStore:
    def __init__(self):
        self.config = FIREBASE_CONFIG
        self.is_live_firebase = True
        self.database_url = self.config["databaseURL"]
        self.api_key = self.config["apiKey"]
        self.project_id = self.config["projectId"]
        self.db = None
        self._init_local_store()
        self._sync_initial_to_firebase()

    def _init_local_store(self):
        """Initializes real database records with Admin Approval workflow and Rental/Purchase models."""
        self.users = {
            "farmer_001": {
                "id": "farmer_001",
                "name": "Bipul Barman",
                "email": "bipul.barman@qoratech.in",
                "phone": "+91 98640 12345",
                "role": "farmer",
                "account_type": "RENTAL",
                "account_status": "approved", # approved / pending / rejected / suspended
                "state": "Assam",
                "district": "Kamrup Rural",
                "village": "Hajo",
                "storage_id": "ST-NER-01",
                "created_at": "2026-01-15T10:00:00Z",
                "rental_details": {
                    "monthly_price": 5000,
                    "duration_months": 12,
                    "start_date": "2026-01-01",
                    "end_date": "2026-12-31",
                    "payment_status": "PAID",
                    "rental_status": "ACTIVE"
                }
            },
            "farmer_002": {
                "id": "farmer_002",
                "name": "Tenzing Lhamo",
                "email": "tenzing.lhamo@qoratech.in",
                "phone": "+91 94360 54321",
                "role": "farmer",
                "account_type": "PURCHASED",
                "account_status": "approved",
                "state": "Arunachal Pradesh",
                "district": "West Kameng",
                "village": "Dirang",
                "storage_id": "ST-NER-02",
                "created_at": "2026-02-10T11:30:00Z",
                "purchase_details": {
                    "purchase_date": "2025-11-15",
                    "installation_date": "2025-12-01",
                    "storage_unit": "ST-NER-02",
                    "warranty": "5 Years Full System (until Dec 2030)",
                    "system_status": "OPERATIONAL"
                }
            },
            "farmer_003": {
                "id": "farmer_003",
                "name": "Lalthansanga",
                "email": "lalthansanga@qoratech.in",
                "phone": "+91 98620 98765",
                "role": "farmer",
                "account_type": "RENTAL",
                "account_status": "pending", # PENDING ADMIN APPROVAL
                "state": "Mizoram",
                "district": "Aizawl",
                "village": "Selesih",
                "storage_id": "ST-NER-03",
                "created_at": "2026-03-01T09:15:00Z",
                "rental_details": {
                    "monthly_price": 4500,
                    "duration_months": 6,
                    "start_date": "2026-03-01",
                    "end_date": "2026-08-31",
                    "payment_status": "PENDING_VERIFICATION",
                    "rental_status": "PENDING"
                }
            },
            "admin_001": {
                "id": "admin_001",
                "name": "Dr. Subhash Sarma",
                "email": "admin@qoratech.in",
                "phone": "+91 98540 01122",
                "role": "admin",
                "account_type": "ADMIN",
                "account_status": "approved",
                "state": "Assam",
                "district": "Guwahati",
                "village": "IIT Guwahati Research Park",
                "storage_id": "ALL",
                "created_at": "2026-01-01T00:00:00Z"
            }
        }
        
        self.storage_units = {
            "ST-NER-01": {
                "storage_id": "ST-NER-01",
                "farmer_id": "farmer_001",
                "unit_name": "QORA Solar Mini Cold Storage Unit #1",
                "location": "Hajo, Kamrup, Assam",
                "storage_mode": "THREE_ZONE",
                "installed_capacity_kg": 500,
                "solar_pv_kw": 2.4,
                "battery_capacity_kwh": 10.0,
                "status": "OPERATIONAL"
            },
            "ST-NER-02": {
                "storage_id": "ST-NER-02",
                "farmer_id": "farmer_002",
                "unit_name": "QORA Solar Mini Cold Storage Unit #2",
                "location": "Dirang, West Kameng, Arunachal Pradesh",
                "storage_mode": "THREE_ZONE",
                "installed_capacity_kg": 500,
                "solar_pv_kw": 2.4,
                "battery_capacity_kwh": 10.0,
                "status": "OPERATIONAL"
            }
        }
        
        self.crops = {c["id"]: dict(c) for c in INITIAL_CROPS}
        
        self.recommendations = [
            {
                "id": "rec_001",
                "farmer_id": "farmer_001",
                "farmer_name": "Bipul Barman",
                "admin_id": "admin_001",
                "admin_name": "Dr. Subhash Sarma (NER Agronomy Specialist)",
                "crop_id": "crop_cabbage",
                "crop_name": "Cabbage",
                "crop_image": "static/images/crops/cabbage.jpg",
                "season": "Winter / Rabi",
                "recommended_zone": "ZONE 2",
                "target_temp": "0–2°C",
                "target_humidity": "95–98%",
                "message": "Peak harvest season in Kamrup valley. Store fresh cabbage in Zone 2 immediately after harvest to preserve crispness and maintain weight for 60+ days.",
                "created_at": (datetime.now() - timedelta(hours=3)).strftime("%Y-%m-%d %I:%M %p"),
                "status": "UNREAD",
                "badge": "NEW"
            }
        ]
        
        self.alerts = [
            {
                "id": "alert_001",
                "farmer_id": "farmer_001",
                "storage_id": "ST-NER-01",
                "zone_id": "ZONE 3",
                "type": "TEMPERATURE_INFO",
                "message": "Zone 3 temperature stabilized at 9.8°C (Safe Range: 8–15°C)",
                "severity": "NORMAL",
                "timestamp": (datetime.now() - timedelta(minutes=20)).strftime("%I:%M %p"),
                "resolved": True
            }
        ]
        
        self.settings = {
            "storage_mode": "THREE_ZONE",
            "target_temperatures": {
                "zone1": 4.5,
                "zone2": 1.0,
                "zone3": 10.0,
                "single_zone": 1.5
            },
            "hysteresis_deadband": 0.8,
            "uvc_auto_cycle_hours": 4
        }
        
        # Real Hardware Telemetry Store (populated by ESP32 / Field Gateway)
        self.live_telemetry = {
            "ST-NER-01": {
                "has_real_data": True,
                "last_seen_ts": time.time(),
                "ambient_temp": 26.5,
                "solar_power_kw": 2.4,
                "solar_voltage": 76.4,
                "solar_current": 31.4,
                "battery_soc": 82.0,
                "battery_voltage": 51.8,
                "current_load_kw": 1.25,
                "power_status": "NORMAL", # NORMAL / POWER FAILURE
                "power_direction": "SOLAR → LOAD + BATTERY",
                "power_source": "SOLAR",
                "failure_start": None,
                "ac_status": "ON", # ON / OFF / FAULT
                "solenoid_1": "OPEN", # OPEN / CLOSED / FAULT
                "solenoid_2": "CLOSED",
                "uvc_status": "ON",
                "uvc_treatment": "ACTIVE",
                "uvc_last_treatment": "12:15 PM",
                "zone1": {
                    "temp": 5.2,
                    "target": 5.0,
                    "min_temp": 2.0,
                    "max_temp": 8.0,
                    "humidity": 91.0,
                    "weight": 84.5,
                    "ethylene": "LOW",
                    "online": True,
                    "crop_name": "French Beans",
                    "crop_id": "crop_french_beans",
                    "crop_image": "static/images/crops/french_beans.jpg"
                },
                "zone2": {
                    "temp": 1.2,
                    "target": 1.0,
                    "min_temp": 0.0,
                    "max_temp": 2.0,
                    "humidity": 96.5,
                    "weight": 124.0,
                    "ethylene": "LOW",
                    "online": True,
                    "crop_name": "Cabbage",
                    "crop_id": "crop_cabbage",
                    "crop_image": "static/images/crops/cabbage.jpg"
                },
                "zone3": {
                    "temp": 9.8,
                    "target": 10.0,
                    "min_temp": 8.0,
                    "max_temp": 15.0,
                    "humidity": 88.0,
                    "weight": 98.0,
                    "ethylene": "LOW",
                    "online": True,
                    "crop_name": "Tomato",
                    "crop_id": "crop_tomato",
                    "crop_image": "static/images/crops/tomato.jpg"
                },
                "single_zone": {
                    "temp": 1.5,
                    "target": 1.5,
                    "humidity": 96.0,
                    "weight": 306.5,
                    "ethylene": "LOW",
                    "crop_name": "Cabbage",
                    "crop_id": "crop_cabbage",
                    "crop_image": "static/images/crops/cabbage.jpg"
                },
                "devices": {
                    "esp32": "ONLINE",
                    "usb": "CONNECTED",
                    "local_ip": "CONNECTED",
                    "ip_address": "192.168.1.142",
                    "firebase": "CONNECTED",
                    "internet": "CONNECTED"
                }
            }
        }

    # User & Auth
    def get_user_by_email(self, email):
        email = email.strip().lower()
        for user in self.users.values():
            if user["email"].lower() == email:
                return user
        return None

    def create_user(self, user_data):
        user_id = f"farmer_{len(self.users) + 1:03d}"
        account_type = user_data.get("account_type", "RENTAL").upper()
        if account_type not in ["RENTAL", "PURCHASED"]:
            account_type = "RENTAL"
            
        new_user = {
            "id": user_id,
            "name": user_data.get("name", "Farmer"),
            "email": user_data.get("email", "").strip().lower(),
            "phone": user_data.get("phone", ""),
            "password": user_data.get("password", ""),
            "role": "farmer",
            "account_type": account_type,
            "account_status": "pending", # Must be approved by Admin
            "state": user_data.get("state", "Assam"),
            "district": user_data.get("district", "Kamrup"),
            "village": user_data.get("village", "Local"),
            "storage_id": f"ST-NER-{len(self.users):02d}",
            "created_at": datetime.now().isoformat()
        }
        
        if account_type == "RENTAL":
            new_user["rental_details"] = {
                "monthly_price": int(user_data.get("rental_price", 5000)),
                "duration_months": 12,
                "start_date": datetime.now().strftime("%Y-%m-%d"),
                "end_date": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
                "payment_status": "PENDING_APPROVAL",
                "rental_status": "PENDING"
            }
        else:
            new_user["purchase_details"] = {
                "purchase_date": datetime.now().strftime("%Y-%m-%d"),
                "installation_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
                "storage_unit": new_user["storage_id"],
                "warranty": "5 Years Full System",
                "system_status": "PENDING_INSTALLATION"
            }
            
        self.users[user_id] = new_user
        self._push_to_rtdb(f"farmers/{user_id}", new_user)
        self._push_to_rtdb(f"pending_farmers/{user_id}", new_user)
        return new_user

    def set_user_status(self, user_id, new_status):
        if user_id in self.users:
            if new_status in ["approved", "pending", "rejected", "suspended"]:
                self.users[user_id]["account_status"] = new_status
                if "rental_details" in self.users[user_id]:
                    if new_status == "approved":
                        self.users[user_id]["rental_details"]["rental_status"] = "ACTIVE"
                    elif new_status == "suspended":
                        self.users[user_id]["rental_details"]["rental_status"] = "SUSPENDED"
                self._push_to_rtdb(f"farmers/{user_id}/account_status", new_status)
                if new_status == "approved":
                    self._push_to_rtdb(f"pending_farmers/{user_id}", None)
                return True
        return False

    def update_user_rental(self, user_id, monthly_price, duration_months, start_date, end_date):
        if user_id in self.users and self.users[user_id].get("account_type") == "RENTAL":
            self.users[user_id]["rental_details"].update({
                "monthly_price": int(monthly_price),
                "duration_months": int(duration_months),
                "start_date": start_date,
                "end_date": end_date
            })
            self._push_to_rtdb(f"farmers/{user_id}/rental_details", self.users[user_id]["rental_details"])
            return True
        return False

    def get_all_farmers(self):
        return [u for u in self.users.values() if u["role"] == "farmer"]

    def get_pending_farmers(self):
        return [u for u in self.users.values() if u["role"] == "farmer" and u["account_status"] == "pending"]

    # Storage Mode Configuration
    def get_storage_mode(self, storage_id="ST-NER-01"):
        return self.settings.get("storage_mode", "THREE_ZONE")

    def set_storage_mode(self, mode, storage_id="ST-NER-01"):
        if mode in ["THREE_ZONE", "ONE_ZONE"]:
            self.settings["storage_mode"] = mode
            if storage_id in self.storage_units:
                self.storage_units[storage_id]["storage_mode"] = mode
            self._push_to_rtdb(f"storageUnits/{storage_id}/mode", mode)
            return True
        return False

    def get_live_telemetry(self, storage_id="ST-NER-01"):
        if storage_id in self.live_telemetry:
            return self.live_telemetry[storage_id]
        return self.live_telemetry.get("ST-NER-01", {})

    # Recommendations
    def add_recommendation(self, rec_data):
        rec_id = f"rec_{int(time.time())}"
        farmer_id = rec_data.get("farmer_id", "farmer_001")
        farmer = self.users.get(farmer_id, {})
        crop_id = rec_data.get("crop_id", "crop_cabbage")
        crop = self.crops.get(crop_id, {})
        
        new_rec = {
            "id": rec_id,
            "farmer_id": farmer_id,
            "farmer_name": farmer.get("name", "Farmer"),
            "admin_id": rec_data.get("admin_id", "admin_001"),
            "admin_name": rec_data.get("admin_name", "Dr. Subhash Sarma (NER Agronomy Specialist)"),
            "crop_id": crop_id,
            "crop_name": crop.get("name", rec_data.get("crop_name", "Crop")),
            "crop_image": crop.get("image_url", "static/images/crops/cabbage.jpg"),
            "season": rec_data.get("season", "Current Season"),
            "recommended_zone": rec_data.get("recommended_zone", crop.get("recommended_zone", "ZONE 2")),
            "target_temp": rec_data.get("target_temp", f"{crop.get('min_temp', 0)}–{crop.get('max_temp', 2)}°C"),
            "target_humidity": rec_data.get("target_humidity", f"{crop.get('min_humidity', 95)}–{crop.get('max_humidity', 98)}%"),
            "message": rec_data.get("message", "Optimal storage condition for your harvest."),
            "created_at": datetime.now().strftime("%Y-%m-%d %I:%M %p"),
            "status": "UNREAD",
            "badge": "NEW"
        }
        self.recommendations.insert(0, new_rec)
        self._push_to_rtdb(f"recommendations/{rec_id}", new_rec)
        return new_rec

    def get_farmer_recommendations(self, farmer_id):
        return [r for r in self.recommendations if r["farmer_id"] == farmer_id]

    # Crop Management
    def get_all_crops(self):
        return list(self.crops.values())

    def add_crop(self, crop_data):
        crop_id = f"crop_{len(self.crops) + 1:03d}"
        min_temp = float(crop_data.get("min_temp", 0))
        # Temperature determines recommended zone
        if min_temp < 2.0:
            rec_zone = "ZONE 2"
        elif min_temp < 8.0:
            rec_zone = "ZONE 1"
        else:
            rec_zone = "ZONE 3"

        new_crop = {
            "id": crop_id,
            "name": crop_data.get("name", ""),
            "scientific_name": crop_data.get("scientific_name", ""),
            "category": crop_data.get("category", "Vegetable"),
            "recommended_zone": rec_zone,
            "min_temp": min_temp,
            "max_temp": float(crop_data.get("max_temp", 2)),
            "optimal_temp": float(crop_data.get("optimal_temp", min_temp)),
            "min_humidity": int(crop_data.get("min_humidity", 90)),
            "max_humidity": int(crop_data.get("max_humidity", 95)),
            "shelf_life_ambient": crop_data.get("shelf_life_ambient", "3–5 Days"),
            "image_url": crop_data.get("image_url", "static/images/crops/cabbage.jpg"),
            "source_info": crop_data.get("source_info", "NER Agronomy Guide"),
            "season": crop_data.get("season", "Winter"),
            "suitable_seasons": [crop_data.get("season", "Winter")],
            "advisory": crop_data.get("advisory", "")
        }
        self.crops[crop_id] = new_crop
        self._push_to_rtdb(f"crops/{crop_id}", new_crop)
        return new_crop

    def update_crop(self, crop_id, updated_fields):
        if crop_id in self.crops:
            self.crops[crop_id].update(updated_fields)
            self._push_to_rtdb(f"crops/{crop_id}", self.crops[crop_id])
            return self.crops[crop_id]
        return None

    def delete_crop(self, crop_id):
        if crop_id in self.crops:
            del self.crops[crop_id]
            self._push_to_rtdb(f"crops/{crop_id}", None)
            return True
        return False

    def set_zone_crop(self, storage_id, zone_key, crop_id_or_name):
        crop = None
        for c in self.crops.values():
            if c["id"] == crop_id_or_name or c["name"].lower() == crop_id_or_name.lower():
                crop = c
                break
        if not crop:
            return False
        
        if storage_id in self.live_telemetry:
            tel = self.live_telemetry[storage_id]
            if zone_key in tel:
                tel[zone_key]["crop_name"] = crop["name"]
                tel[zone_key]["crop_id"] = crop["id"]
                tel[zone_key]["crop_image"] = crop["image_url"]
                tel[zone_key]["target"] = crop.get("optimal_temp", crop["min_temp"])
                tel[zone_key]["min_temp"] = crop["min_temp"]
                tel[zone_key]["max_temp"] = crop["max_temp"]
                self._push_to_rtdb(f"storageUnits/{storage_id}/{zone_key}/crop", {
                    "crop_id": crop["id"],
                    "crop_name": crop["name"],
                    "target": crop.get("optimal_temp", crop["min_temp"])
                })
                return True
        return False

    def _sync_initial_to_firebase(self):
        """Asynchronously or synchronously push initial state to Firebase Realtime Database."""
        try:
            # Sync metadata / status
            self._push_to_rtdb("system_info", {
                "project": "QORA TECH - Solar Smart Cold Storage",
                "projectId": self.project_id,
                "status": "ONLINE",
                "sync_time": datetime.now().isoformat()
            })
            # Sync storage unit initial state
            unit_mode = self.storage_units.get("ST-NER-01", {}).get("storage_mode", "THREE_ZONE")
            self._push_to_rtdb("storageUnits/ST-NER-01", {
                "mode": unit_mode,
                "ac_status": "ON",
                "uvc_status": "ACTIVE",
                "solenoid_valve_1": "OPEN",
                "solenoid_valve_2": "CLOSED",
                "last_update": datetime.now().isoformat()
            })
        except Exception as e:
            # Non-blocking if network is restricted
            pass

    def _push_to_rtdb(self, path, data):
        """Helper to push data to Firebase Realtime Database REST endpoint."""
        try:
            url = f"{self.database_url}/{path}.json"
            req_data = json.dumps(data).encode("utf-8")
            req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"}, method="PUT")
            with urllib.request.urlopen(req, timeout=3) as resp:
                return resp.status == 200
        except Exception:
            return False

# Global singleton instance
db_store = FirebaseDataStore()
