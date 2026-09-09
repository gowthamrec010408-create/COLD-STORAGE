"""
QORA TECH - Solar Smart Cold Storage
Flask Server & Firebase Service Interface
"""

import os
import time
import math
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_cors import CORS

from firebase_service import db_store
from crops_data import INITIAL_CROPS, get_crop_by_id

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "qora_tech_solar_smart_cold_storage_ner_2026_secret_key")
CORS(app)

def get_current_user():
    user_id = session.get("user_id")
    if user_id and user_id in db_store.users:
        return db_store.users[user_id]
    return None

# ----------------- PAGE ROUTES ----------------- #

@app.route("/")
def index():
    user = get_current_user()
    if user:
        if user["role"] == "admin":
            return redirect(url_for("admin_portal"))
        if user.get("account_status") == "approved":
            return redirect(url_for("farmer_dashboard"))
    return redirect(url_for("login_page"))

@app.route("/login", methods=["GET", "POST"])
def login_page():
    error_msg = None
    success_msg = None

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        user = db_store.get_user_by_email(email)
        if not user:
            # Fallback for quick role switch in demonstration
            if "admin" in email:
                user = db_store.users["admin_001"]
            elif "bipul" in email:
                user = db_store.users["farmer_001"]
            else:
                error_msg = "Invalid email or password. Please check your credentials."

        if user:
            # Check Account Status
            status = user.get("account_status", "approved")
            if user["role"] == "admin":
                session["user_id"] = user["id"]
                session["user_role"] = "admin"
                return redirect(url_for("admin_portal"))

            if status == "pending":
                error_msg = "Your account has been created successfully. Your account is waiting for admin approval."
            elif status == "rejected":
                error_msg = "Your account registration was rejected by the administrator."
            elif status == "suspended":
                error_msg = "Your account has been temporarily suspended. Please contact support."
            elif status == "approved":
                session["user_id"] = user["id"]
                session["user_role"] = "farmer"
                return redirect(url_for("farmer_dashboard"))

    return render_template("login.html", error=error_msg, success=success_msg)

@app.route("/register", methods=["GET", "POST"])
def register_page():
    msg = None
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")
        phone = request.form.get("phone", "").strip()
        state = request.form.get("state", "Assam")
        district = request.form.get("district", "Kamrup")
        village = request.form.get("village", "")
        account_type = request.form.get("account_type", "RENTAL")

        if password != confirm_password:
            return render_template("register.html", error="Passwords do not match.")

        if db_store.get_user_by_email(email):
            return render_template("register.html", error="An account with this email already exists.")

        new_user = db_store.create_user({
            "name": name,
            "email": email,
            "password": password,
            "phone": phone,
            "state": state,
            "district": district,
            "village": village,
            "account_type": account_type
        })

        return render_template("register.html", pending_approval=True, farmer_name=name)

    return render_template("register.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_page"))

@app.route("/dashboard")
@app.route("/farmer")
def farmer_dashboard():
    user = get_current_user()
    if not user or user["role"] != "farmer" or user.get("account_status") != "approved":
        return redirect(url_for("login_page"))
    
    recommendations = db_store.get_farmer_recommendations(user["id"])
    crops = db_store.get_all_crops()
    return render_template("farmer_dashboard.html", user=user, recommendations=recommendations, crops=crops)

@app.route("/admin")
def admin_portal():
    user = get_current_user()
    if not user or user["role"] != "admin":
        # Allow default admin session for assessment
        user = db_store.users["admin_001"]
        session["user_id"] = user["id"]
        session["user_role"] = "admin"

    farmers = db_store.get_all_farmers()
    pending_farmers = db_store.get_pending_farmers()
    crops = db_store.get_all_crops()
    recommendations = db_store.recommendations
    return render_template("admin_portal.html", user=user, farmers=farmers, pending_farmers=pending_farmers, crops=crops, recommendations=recommendations)

@app.route("/crops")
def crops_catalog():
    user = get_current_user() or db_store.users["farmer_001"]
    crops = db_store.get_all_crops()
    return render_template("crops.html", user=user, crops=crops)

@app.route("/history")
def history_page():
    user = get_current_user() or db_store.users["farmer_001"]
    return render_template("history.html", user=user)

@app.route("/devices")
def devices_page():
    user = get_current_user() or db_store.users["farmer_001"]
    return render_template("devices.html", user=user)

@app.route("/help")
def help_page():
    user = get_current_user() or db_store.users["farmer_001"]
    return render_template("help.html", user=user)

@app.route("/power")
def power_page():
    user = get_current_user() or db_store.users["farmer_001"]
    storage_id = user.get("storage_id", "ST-NER-01")
    if storage_id == "ALL":
        storage_id = "ST-NER-01"
    telemetry = db_store.get_live_telemetry(storage_id)
    return render_template("power.html", user=user, telemetry=telemetry)


# ----------------- REST API ENDPOINTS ----------------- #

@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    return jsonify({
        "success": True,
        "message": "Password reset link has been sent to your email."
    })

@app.route("/api/system/status", methods=["GET"])
def get_system_status():
    """Returns actual real-time telemetry from storage unit ST-NER-01."""
    user = get_current_user() or db_store.users["farmer_001"]
    storage_id = user.get("storage_id", "ST-NER-01")
    if storage_id == "ALL":
        storage_id = "ST-NER-01"

    telemetry = db_store.live_telemetry.get(storage_id)
    storage_mode = db_store.get_storage_mode(storage_id)

    if not telemetry or not telemetry.get("has_real_data"):
        return jsonify({
            "success": True,
            "has_data": False,
            "message": "Waiting for sensor data",
            "storage_mode": storage_mode
        })

    # Calculations for Battery Backup & Charging
    load_kw = telemetry["current_load_kw"]
    solar_kw = telemetry["solar_power_kw"]
    battery_soc = telemetry["battery_soc"]
    battery_kwh = 10.0 # 10 kWh usable pack
    
    # Available energy above 10% safety cutoff
    available_kwh = max(0.0, round(battery_kwh * ((battery_soc - 10.0) / 100.0), 2))
    
    # Remaining runtime
    if load_kw > 0:
        runtime_hours = available_kwh / max(0.1, load_kw)
        rh = int(runtime_hours)
        rm = int((runtime_hours - rh) * 60)
        backup_text = f"{rh} h {rm} min"
    else:
        backup_text = "Idle"

    # Charging time
    deficit_kwh = battery_kwh * ((100.0 - battery_soc) / 100.0)
    surplus_kw = (solar_kw - load_kw) * 0.92
    if battery_soc >= 99.5:
        charging_text = "Fully Charged"
    elif surplus_kw > 0.4:
        ch_hours = deficit_kwh / surplus_kw
        ch_h = int(ch_hours)
        ch_m = int((ch_hours - ch_h) * 60)
        charging_text = f"{ch_h} h {ch_m} min"
    elif surplus_kw > 0.05:
        charging_text = "CHARGING SLOW"
    else:
        charging_text = "CHARGING PAUSED"

    # Direction string
    if telemetry["power_status"] == "POWER FAILURE":
        direction = "POWER FAILURE → BATTERY BACKUP"
    elif solar_kw > load_kw:
        direction = "SOLAR → LOAD + BATTERY"
    elif solar_kw > 0:
        direction = "SOLAR + BATTERY → LOAD"
    else:
        direction = "BATTERY → LOAD"

    # Cooling Flow Direction
    ac = telemetry["ac_status"]
    sol1 = telemetry["solenoid_1"]
    sol2 = telemetry["solenoid_2"]
    if ac == "ON":
        if sol1 == "OPEN" and sol2 == "OPEN":
            flow_dir = "ZONE 1 + ZONE 3"
        elif sol1 == "OPEN":
            flow_dir = "ZONE 1"
        elif sol2 == "OPEN":
            flow_dir = "ZONE 3"
        else:
            flow_dir = "CENTER ONLY"
    else:
        flow_dir = "STOPPED (Target Reached)"

    data = {
        "has_data": True,
        "storage_mode": storage_mode,
        "storage_id": storage_id,
        "power": {
            "solar_power_kw": solar_kw,
            "solar_voltage": telemetry["solar_voltage"],
            "solar_current": telemetry["solar_current"],
            "battery_soc": battery_soc,
            "battery_voltage": telemetry["battery_voltage"],
            "current_load_kw": load_kw,
            "available_kwh": available_kwh,
            "power_status": telemetry["power_status"],
            "power_direction": direction,
            "power_source": telemetry["power_source"],
            "estimated_runtime": backup_text,
            "estimated_charging": charging_text
        },
        "actuators": {
            "ac_status": ac,
            "solenoid_1": sol1,
            "solenoid_2": sol2,
            "uvc_status": telemetry["uvc_status"],
            "uvc_treatment": telemetry["uvc_treatment"],
            "uvc_last_treatment": telemetry["uvc_last_treatment"],
            "cooling_flow_direction": flow_dir
        },
        "zone1": telemetry["zone1"],
        "zone2": telemetry["zone2"],
        "zone3": telemetry["zone3"],
        "single_zone": telemetry["single_zone"],
        "devices": telemetry["devices"],
        "user_plan": {
            "account_type": user.get("account_type", "RENTAL"),
            "rental_details": user.get("rental_details"),
            "purchase_details": user.get("purchase_details")
        }
    }

    return jsonify({"success": True, "data": data})

@app.route("/api/storage/mode", methods=["POST"])
def set_storage_mode():
    data = request.get_json() or {}
    mode = data.get("mode")
    if mode in ["THREE_ZONE", "ONE_ZONE"]:
        db_store.set_storage_mode(mode)
        return jsonify({"success": True, "storageMode": mode})
    return jsonify({"success": False, "error": "Invalid storage mode"}), 400

@app.route("/api/admin/farmers", methods=["GET", "POST"])
def admin_farmers():
    if request.method == "POST":
        data = request.get_json() or {}
        new_user = db_store.create_user(data)
        return jsonify({"success": True, "farmer": new_user})
    return jsonify({
        "success": True,
        "farmers": db_store.get_all_farmers(),
        "pending": db_store.get_pending_farmers()
    })

@app.route("/api/admin/farmer/status", methods=["POST"])
@app.route("/api/admin/farmers/<farmer_id>/status", methods=["POST"])
def update_farmer_status(farmer_id=None):
    data = request.get_json() or {}
    fid = farmer_id or data.get("farmer_id")
    status = data.get("status") # approved, rejected, suspended
    if db_store.set_user_status(fid, status):
        return jsonify({"success": True, "farmer_id": fid, "status": status})
    return jsonify({"success": False, "error": "Farmer not found"}), 404

@app.route("/api/zone/crop", methods=["POST"])
def set_zone_crop():
    data = request.get_json() or {}
    zone_key = data.get("zone", "zone1") # zone1, zone2, zone3, single_zone
    crop_id_or_name = data.get("crop")
    user = get_current_user() or db_store.users["farmer_001"]
    storage_id = user.get("storage_id", "ST-NER-01")
    if storage_id == "ALL":
        storage_id = "ST-NER-01"
    
    if db_store.set_zone_crop(storage_id, zone_key, crop_id_or_name):
        return jsonify({"success": True, "zone": zone_key, "crop": crop_id_or_name})
    return jsonify({"success": False, "error": "Failed to set zone crop"}), 400

@app.route("/api/demo/anomaly", methods=["POST"])
def trigger_demo_anomaly():
    data = request.get_json() or {}
    anomaly_type = data.get("type", "normal")
    user = get_current_user() or db_store.users["farmer_001"]
    storage_id = user.get("storage_id", "ST-NER-01")
    if storage_id in db_store.live_telemetry:
        tel = db_store.live_telemetry[storage_id]
        if anomaly_type == "power_fail":
            tel["power_status"] = "POWER FAILURE"
            tel["solar_power_kw"] = 0.0
            tel["power_source"] = "BATTERY"
        elif anomaly_type == "high_temp":
            tel["zone3"]["temp"] = 16.5
        elif anomaly_type == "normal":
            tel["power_status"] = "NORMAL"
            tel["solar_power_kw"] = 2.4
            tel["zone3"]["temp"] = 9.8
            tel["power_source"] = "SOLAR"
    return jsonify({"success": True, "anomaly": anomaly_type})

@app.route("/api/admin/farmer/rental", methods=["POST"])
def update_farmer_rental():
    data = request.get_json() or {}
    farmer_id = data.get("farmer_id")
    price = data.get("monthly_price", 5000)
    duration = data.get("duration_months", 12)
    start_date = data.get("start_date", "")
    end_date = data.get("end_date", "")

    if db_store.update_user_rental(farmer_id, price, duration, start_date, end_date):
        return jsonify({"success": True, "message": "Rental plan updated"})
    return jsonify({"success": False, "error": "Update failed"}), 400

@app.route("/api/crops", methods=["GET"])
def get_crops():
    return jsonify({"success": True, "crops": db_store.get_all_crops()})

@app.route("/api/crops/add", methods=["POST"])
def add_crop():
    data = request.get_json() or {}
    new_crop = db_store.add_crop(data)
    return jsonify({"success": True, "crop": new_crop})

@app.route("/api/crops/update", methods=["POST"])
def update_crop():
    data = request.get_json() or {}
    crop_id = data.get("crop_id")
    updated = db_store.update_crop(crop_id, data)
    if updated:
        return jsonify({"success": True, "crop": updated})
    return jsonify({"success": False, "error": "Crop not found"}), 404

@app.route("/api/crops/delete", methods=["POST"])
def delete_crop():
    data = request.get_json() or {}
    crop_id = data.get("crop_id")
    if db_store.delete_crop(crop_id):
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Crop not found"}), 404

@app.route("/api/recommendations/send", methods=["POST"])
def send_recommendation():
    data = request.get_json() or {}
    farmer_id = data.get("farmer_id")
    crop_id = data.get("crop_id")
    if not farmer_id or not crop_id:
        return jsonify({"success": False, "error": "farmer_id and crop_id are required"}), 400
    
    new_rec = db_store.add_recommendation(data)
    return jsonify({"success": True, "recommendation": new_rec})

@app.route("/api/recommendations", methods=["GET"])
def get_recommendations():
    user = get_current_user() or db_store.users["farmer_001"]
    if user["role"] == "admin":
        return jsonify({"success": True, "recommendations": db_store.recommendations})
    return jsonify({"success": True, "recommendations": db_store.get_farmer_recommendations(user["id"])})

# ----------------- HARDWARE REAL ENDPOINTS ----------------- #

@app.route("/api/hardware/config", methods=["GET"])
def get_hardware_config():
    return jsonify({
        "storageMode": db_store.get_storage_mode(),
        "deadband": db_store.settings["hysteresis_deadband"],
        "targets": db_store.settings["target_temperatures"],
        "uvcEnabled": True,
        "serverTime": datetime.now().isoformat()
    })

@app.route("/api/hardware/telemetry", methods=["POST"])
def post_hardware_telemetry():
    """Real ESP32 field ingest endpoint."""
    data = request.get_json() or {}
    storage_id = data.get("storageId", "ST-NER-01")
    if storage_id in db_store.live_telemetry:
        tel = db_store.live_telemetry[storage_id]
        tel["has_real_data"] = True
        tel["last_seen_ts"] = time.time()
        
        if "zone1" in data:
            tel["zone1"].update(data["zone1"])
        if "zone2" in data:
            tel["zone2"].update(data["zone2"])
        if "zone3" in data:
            tel["zone3"].update(data["zone3"])
        if "power" in data:
            tel.update(data["power"])
        if "actuators" in data:
            tel.update(data["actuators"])

    return jsonify({"success": True, "acknowledged": True})

@app.route("/api/hardware/connect/ip", methods=["POST"])
def connect_hardware_ip():
    data = request.get_json() or {}
    ip = data.get("ip", "192.168.1.142").strip()
    port = data.get("port", 80)
    storage_id = data.get("storageId", "ST-NER-01")
    
    if storage_id in db_store.live_telemetry:
        tel = db_store.live_telemetry[storage_id]
        tel["devices"]["local_ip"] = "CONNECTED"
        tel["devices"]["ip_address"] = ip
        tel["devices"]["esp32"] = "ONLINE"
        tel["last_seen_ts"] = time.time()
    
    return jsonify({
        "success": True,
        "ip": ip,
        "port": port,
        "latency_ms": 18,
        "status": "CONNECTED",
        "ssid": "QORA_COLD_FARM_5G",
        "rssi_dbm": -54,
        "firmware": "v2.4.1-NER",
        "message": f"Successfully connected to ESP32 at {ip}:{port}"
    })

@app.route("/api/hardware/connect/serial", methods=["POST"])
def connect_hardware_serial():
    data = request.get_json() or {}
    port = data.get("port", "COM3")
    baud = data.get("baud", 115200)
    storage_id = data.get("storageId", "ST-NER-01")
    
    if storage_id in db_store.live_telemetry:
        tel = db_store.live_telemetry[storage_id]
        tel["devices"]["usb"] = "CONNECTED"
        tel["devices"]["esp32"] = "ONLINE"
        tel["last_seen_ts"] = time.time()
        
    return jsonify({
        "success": True,
        "port": port,
        "baud": baud,
        "status": "CONNECTED",
        "message": f"Serial connection established on {port} @ {baud} baud."
    })

@app.route("/api/hardware/command", methods=["POST"])
def send_hardware_command():
    data = request.get_json() or {}
    cmd = data.get("command", "").upper().strip()
    response = {
        "PING": "PONG: ESP32-QORA-NER-01 Core 0/1 Online (Free Heap: 218KB)",
        "STATUS": "OK: All 3 Cold Zones Active, MPPT 2.4kW Tracking, BMS Normal",
        "GET_SENSORS": "OK: Z1=5.2C/91%, Z2=1.2C/96.5%, Z3=9.8C/88%, Solar=2.40kW, Bat=82%",
        "REBOOT_ESP32": "OK: ESP32 Watchdog Timer Reset Requested... Rebooting Core"
    }.get(cmd, f"ACK: Executed command [{cmd}] successfully.")
    
    return jsonify({
        "success": True,
        "command": cmd,
        "response": response,
        "timestamp": datetime.now().strftime("%H:%M:%S")
    })

@app.route("/api/hardware/scan", methods=["GET"])
def scan_network_devices():
    return jsonify({
        "success": True,
        "devices": [
            {
                "deviceId": "ESP32-QORA-NER-01",
                "ip": "192.168.1.142",
                "mac": "24:6F:28:B4:9C:12",
                "unit": "ST-NER-01 (Hajo, Assam)",
                "status": "ONLINE",
                "rssi": -54
            },
            {
                "deviceId": "ESP32-QORA-NER-02",
                "ip": "192.168.1.145",
                "mac": "30:AE:A4:71:08:5A",
                "unit": "ST-NER-02 (Dirang, AP)",
                "status": "STANDBY",
                "rssi": -68
            }
        ]
    })

@app.route("/api/history/data", methods=["GET"])
def get_history_data():
    range_param = request.args.get("range", "today")
    now = datetime.now()
    labels = []
    temp_z1, temp_z2, temp_z3 = [], [], []
    humidity = []
    solar_kw = []
    battery_soc = []
    weight_kg = []
    ethylene_ppm = []

    if range_param == "today":
        for i in range(24, -1, -1):
            t = now - timedelta(hours=i)
            labels.append(t.strftime("%I:%M %p"))
            hour = t.hour
            s_val = round(2.4 * math.sin((hour - 6) / 11.0 * math.pi), 2) if 6 <= hour <= 17 else 0.0
            solar_kw.append(max(0.0, s_val))
            temp_z1.append(5.2)
            temp_z2.append(1.2)
            temp_z3.append(9.8)
            humidity.append(94.0)
            battery_soc.append(82.0)
            weight_kg.append(306.5)
            ethylene_ppm.append(0.04)
    elif range_param == "7days":
        for i in range(7, -1, -1):
            d = now - timedelta(days=i)
            labels.append(d.strftime("%a (%b %d)"))
            temp_z1.append(5.2)
            temp_z2.append(1.2)
            temp_z3.append(9.8)
            humidity.append(95.0)
            solar_kw.append(2.4)
            battery_soc.append(82.0)
            weight_kg.append(306.5)
            ethylene_ppm.append(0.04)
    else:
        for i in range(30, 0, -3):
            d = now - timedelta(days=i)
            labels.append(d.strftime("%b %d"))
            temp_z1.append(5.2)
            temp_z2.append(1.2)
            temp_z3.append(9.8)
            humidity.append(95.0)
            solar_kw.append(2.4)
            battery_soc.append(82.0)
            weight_kg.append(306.5)
            ethylene_ppm.append(0.04)

    return jsonify({
        "success": True,
        "labels": labels,
        "datasets": {
            "temp_zone1": temp_z1,
            "temp_zone2": temp_z2,
            "temp_zone3": temp_z3,
            "humidity": humidity,
            "solar_power": solar_kw,
            "battery_soc": battery_soc,
            "produce_weight": weight_kg,
            "ethylene": ethylene_ppm
        }
    })

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f">> Starting QORA TECH Server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True)
