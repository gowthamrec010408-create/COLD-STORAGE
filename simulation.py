"""
QORA TECH - Solar Smart Cold Storage
Thermodynamics, Solar Power, Battery Chemistry, and Hardware Simulation Engine
"""

import time
import math
import random
from datetime import datetime, timedelta

class ColdStorageSimulation:
    def __init__(self):
        # System Modes: "THREE_ZONE" or "ONE_ZONE"
        self.storage_mode = "THREE_ZONE"
        self.demo_mode = True
        self.ambient_temperature = 26.5 # °C NER average ambient
        
        # Hardware Actuators
        self.ac_status = "ON"           # ON / OFF
        self.solenoid_1 = "OPEN"        # OPEN / CLOSED (Center -> Zone 1)
        self.solenoid_2 = "CLOSED"      # OPEN / CLOSED (Center -> Zone 3)
        self.uvc_status = "ON"          # ON / OFF
        self.uvc_treatment = "ACTIVE"   # ACTIVE / INACTIVE
        self.uvc_last_treatment = (datetime.now() - timedelta(minutes=45)).strftime("%I:%M %p")
        self.cooling_flow_direction = "Cooling → Zone 1"
        
        # 3-Zone Temperatures & Targets (with deadband hysteresis)
        self.deadband = 0.8  # ±0.8°C hysteresis to prevent AC rapid cycling
        
        # Zone 1 (2–8°C)
        self.zone1_target = 4.5
        self.zone1_temp = 4.2
        self.zone1_humidity = 93.0
        self.zone1_weight = 76.5  # kg
        self.zone1_ethylene = 0.04 # ppm (Low)
        self.zone1_crop = "French Beans"
        self.zone1_crop_id = "crop_french_beans"
        self.zone1_online = True
        
        # Zone 2 - Center Chamber (0–2°C)
        self.zone2_target = 1.0
        self.zone2_temp = 1.2
        self.zone2_humidity = 96.5
        self.zone2_weight = 124.0 # kg
        self.zone2_ethylene = 0.02 # ppm (Low)
        self.zone2_crop = "Cabbage"
        self.zone2_crop_id = "crop_cabbage"
        self.zone2_online = True
        
        # Zone 3 (8–15°C)
        self.zone3_target = 10.0
        self.zone3_temp = 9.8
        self.zone3_humidity = 88.0
        self.zone3_weight = 98.0  # kg
        self.zone3_ethylene = 0.12 # ppm (Low-Normal)
        self.zone3_crop = "Tomato"
        self.zone3_crop_id = "crop_tomato"
        self.zone3_online = True
        
        # Single Zone Mode (When active)
        self.single_zone_target = 1.5
        self.single_zone_temp = 1.6
        self.single_zone_humidity = 96.0
        self.single_zone_weight = 298.5 # kg
        self.single_zone_ethylene = 0.03
        self.single_zone_crop = "Cabbage"
        self.single_zone_crop_id = "crop_cabbage"
        self.single_zone_status = "SAFE"
        
        # Power & Solar System Specs
        self.solar_capacity_kw = 2.4     # 2.4 kW PV Array
        self.battery_capacity_kwh = 10.0 # 10 kWh 48V LiFePO4
        self.battery_soc = 82.0          # 82%
        self.battery_voltage = 51.8      # 48V nominal (~51.8V float)
        self.solar_voltage = 76.4        # V
        self.solar_current = 31.4        # A
        self.solar_power_kw = 2.40       # kW
        self.base_load_kw = 0.35         # Standby fans, sensors, controllers
        self.ac_load_kw = 1.25           # Compressor load when ON
        self.current_load_kw = 1.60      # Total kW
        self.power_failure_active = False # Anomaly simulation flag
        self.power_status = "NORMAL"     # NORMAL / POWER FAILURE
        self.power_direction = "SOLAR → COLD STORAGE + BATTERY"
        
        # Alert Tracking
        self.temp_failure_start_time = None
        self.temp_failure_zone = None
        self.anomaly_high_temp = False
        self.anomaly_power_fail = False
        self.anomaly_sensor_fail = False
        
        # Device Connectivity
        self.device_id = "ESP32-QORA-NER-01"
        self.device_ip = "192.168.1.142"
        self.usb_status = "CONNECTED"
        self.ip_status = "CONNECTED"
        self.firebase_status = "CONNECTED"
        self.internet_status = "CONNECTED"
        self.last_seen_seconds = 2

        self.last_update_ts = time.time()
        
    def step_simulation(self):
        """Advances physics & thermodynamics by small time step."""
        now = time.time()
        dt = min(3.0, now - self.last_update_ts)
        self.last_update_ts = now
        
        # 1. Update Solar Generation (Simulated realistic daylight or fixed demo)
        if self.power_failure_active or self.anomaly_power_fail:
            self.solar_power_kw = 0.0
            self.solar_voltage = 0.0
            self.solar_current = 0.0
            self.power_status = "POWER FAILURE"
        else:
            # Subtle realistic oscillation around 2.2–2.4 kW
            jitter = math.sin(now * 0.1) * 0.15 + (random.random() - 0.5) * 0.05
            self.solar_power_kw = max(0.0, min(2.4, round(2.35 + jitter, 2)))
            self.solar_voltage = round(75.0 + math.sin(now * 0.05) * 2.5, 1)
            self.solar_current = round((self.solar_power_kw * 1000) / max(1.0, self.solar_voltage), 1)
            self.power_status = "NORMAL"

        # 2. Compute AC & Load State with Hysteresis
        if self.storage_mode == "THREE_ZONE":
            # Zone 2 is primary reference for compressor
            if self.zone2_temp > (self.zone2_target + self.deadband):
                self.ac_status = "ON"
            elif self.zone2_temp < (self.zone2_target - 0.3):
                # Don't turn OFF if Zone 1 or 3 desperately need cooling and solenoids are open
                needs_zone1 = (self.zone1_temp > self.zone1_target + self.deadband)
                needs_zone3 = (self.zone3_temp > self.zone3_target + self.deadband)
                if not (needs_zone1 or needs_zone3):
                    self.ac_status = "OFF"
            
            # Solenoid 1 control for Zone 1
            if self.zone1_temp > (self.zone1_target + 0.3):
                self.solenoid_1 = "OPEN"
            elif self.zone1_temp < (self.zone1_target - 0.3):
                self.solenoid_1 = "CLOSED"
                
            # Solenoid 2 control for Zone 3
            if self.zone3_temp > (self.zone3_target + 0.4):
                self.solenoid_2 = "OPEN"
            elif self.zone3_temp < (self.zone3_target - 0.3):
                self.solenoid_2 = "CLOSED"
                
            # Cooling Flow String
            if self.ac_status == "ON":
                if self.solenoid_1 == "OPEN" and self.solenoid_2 == "OPEN":
                    self.cooling_flow_direction = "Cooling → Zone 1 + Zone 3 (Center Active)"
                elif self.solenoid_1 == "OPEN":
                    self.cooling_flow_direction = "Cooling → Zone 1 (Center Active)"
                elif self.solenoid_2 == "OPEN":
                    self.cooling_flow_direction = "Cooling → Zone 3 (Center Active)"
                else:
                    self.cooling_flow_direction = "Cooling → Center Chamber Only"
            else:
                self.cooling_flow_direction = "Cooling Stopped (Target Reached)"

        else: # ONE_ZONE Mode
            if self.single_zone_temp > (self.single_zone_target + self.deadband):
                self.ac_status = "ON"
                self.solenoid_1 = "OPEN"
                self.solenoid_2 = "OPEN"
                self.cooling_flow_direction = "Cooling → Entire Storage Chamber"
            elif self.single_zone_temp < (self.single_zone_target - 0.3):
                self.ac_status = "OFF"
                self.solenoid_1 = "CLOSED"
                self.solenoid_2 = "CLOSED"
                self.cooling_flow_direction = "Cooling Stopped (Target Reached)"

        # 3. Calculate Electrical Load & Power Direction
        if self.ac_status == "ON":
            self.current_load_kw = round(self.base_load_kw + self.ac_load_kw + (random.random() * 0.05), 2)
        else:
            self.current_load_kw = round(self.base_load_kw + (random.random() * 0.02), 2)

        net_power = self.solar_power_kw - self.current_load_kw
        if self.solar_power_kw > 0:
            if net_power > 0:
                self.power_direction = "☀ SOLAR → ❄ COLD STORAGE + 🔋 BATTERY"
                # Battery charging
                charge_delta = (net_power * 0.92 * (dt / 3600.0)) / self.battery_capacity_kwh * 100.0
                self.battery_soc = min(100.0, round(self.battery_soc + charge_delta, 1))
            else:
                self.power_direction = "☀ SOLAR + 🔋 BATTERY → ❄ COLD STORAGE"
                discharge_delta = (abs(net_power) * (dt / 3600.0)) / self.battery_capacity_kwh * 100.0
                self.battery_soc = max(10.0, round(self.battery_soc - discharge_delta, 1))
        else:
            # Solar failure or night
            self.power_direction = "🔋 BATTERY → ❄ COLD STORAGE"
            discharge_delta = (self.current_load_kw * (dt / 3600.0)) / self.battery_capacity_kwh * 100.0
            self.battery_soc = max(10.0, round(self.battery_soc - discharge_delta, 1))

        self.battery_voltage = round(48.0 + (self.battery_soc / 100.0) * 5.4, 1)

        # 4. Thermodynamic Temperature Step
        cooling_power_z2 = -0.06 if self.ac_status == "ON" else 0.015
        heat_leak_z2 = (self.ambient_temperature - self.zone2_temp) * 0.001

        if not self.anomaly_high_temp:
            # Zone 2 (Center)
            self.zone2_temp = round(max(0.1, min(2.5, self.zone2_temp + cooling_power_z2 + heat_leak_z2)), 1)
            
            # Zone 1
            leak_z1 = (self.ambient_temperature - self.zone1_temp) * 0.0012
            flow_z1 = -0.045 if (self.ac_status == "ON" and self.solenoid_1 == "OPEN") else 0.012
            self.zone1_temp = round(max(2.1, min(7.9, self.zone1_temp + flow_z1 + leak_z1)), 1)
            
            # Zone 3
            leak_z3 = (self.ambient_temperature - self.zone3_temp) * 0.0015
            flow_z3 = -0.04 if (self.ac_status == "ON" and self.solenoid_2 == "OPEN") else 0.012
            self.zone3_temp = round(max(8.2, min(14.8, self.zone3_temp + flow_z3 + leak_z3)), 1)
            
            # Single Zone
            leak_sz = (self.ambient_temperature - self.single_zone_temp) * 0.0012
            flow_sz = -0.05 if self.ac_status == "ON" else 0.015
            self.single_zone_temp = round(max(0.5, min(4.5, self.single_zone_temp + flow_sz + leak_sz)), 1)
            
            self.temp_failure_start_time = None
            self.temp_failure_zone = None
        else:
            # Anomaly: Zone 3 Temperature Rise
            self.zone3_temp = round(min(16.8, self.zone3_temp + 0.08), 1)
            if self.temp_failure_start_time is None:
                self.temp_failure_start_time = time.time() - 720 # 12 mins ago default demo
                self.temp_failure_zone = "ZONE 3"

        # Sensor noise jitter
        self.zone1_humidity = round(max(88.0, min(97.0, self.zone1_humidity + (random.random() - 0.5) * 0.3)), 1)
        self.zone2_humidity = round(max(94.0, min(99.0, self.zone2_humidity + (random.random() - 0.5) * 0.2)), 1)
        self.zone3_humidity = round(max(84.0, min(92.0, self.zone3_humidity + (random.random() - 0.5) * 0.4)), 1)
        self.single_zone_humidity = round(max(93.0, min(98.0, self.single_zone_humidity + (random.random() - 0.5) * 0.2)), 1)

        if self.anomaly_sensor_fail:
            self.zone3_online = False
        else:
            self.zone3_online = True
            
        self.last_seen_seconds = random.randint(1, 4)

    def get_battery_runtime_str(self):
        """Calculates Estimated Battery Runtime in hours and minutes."""
        # Usable energy above 10% reserve
        usable_soc = max(0.0, self.battery_soc - 10.0)
        available_kwh = round(self.battery_capacity_kwh * (usable_soc / 100.0), 2)
        
        # Effective discharge load (net power draining battery)
        net_drain_kw = self.current_load_kw - self.solar_power_kw
        if net_drain_kw <= 0.05:
            # Battery is not discharging or solar is covering it
            # Compute standalone backup time assuming sudden total solar/grid failure:
            standalone_runtime_hours = available_kwh / max(0.2, self.current_load_kw)
            hours = int(standalone_runtime_hours)
            minutes = int((standalone_runtime_hours - hours) * 60)
            return {
                "available_kwh": available_kwh,
                "current_load_kw": self.current_load_kw,
                "runtime_text": f"{hours} h {minutes} min",
                "mode_text": "On Solar (Calculated Backup if Solar Fails)"
            }
        else:
            runtime_hours = available_kwh / net_drain_kw
            hours = int(runtime_hours)
            minutes = int((runtime_hours - hours) * 60)
            return {
                "available_kwh": available_kwh,
                "current_load_kw": self.current_load_kw,
                "runtime_text": f"{hours} h {minutes} min",
                "mode_text": "Battery Discharge Active"
            }

    def get_battery_charging_str(self):
        """Calculates Estimated Charging Time to 100% full."""
        if self.battery_soc >= 99.5:
            return {
                "time_text": "Fully Charged",
                "status_text": "Float Charge Active",
                "charging_rate_kw": 0.0
            }
        
        deficit_kwh = self.battery_capacity_kwh * ((100.0 - self.battery_soc) / 100.0)
        net_solar_charging_kw = max(0.0, self.solar_power_kw - self.current_load_kw) * 0.92
        
        if net_solar_charging_kw > 0.4:
            charge_hours = deficit_kwh / net_solar_charging_kw
            hours = int(charge_hours)
            minutes = int((charge_hours - hours) * 60)
            return {
                "time_text": f"{hours} h {minutes} min",
                "status_text": "Fast Solar Charging",
                "charging_rate_kw": round(net_solar_charging_kw, 2)
            }
        elif net_solar_charging_kw > 0.05:
            return {
                "time_text": "Charging slowly",
                "status_text": "Low Solar Surplus",
                "charging_rate_kw": round(net_solar_charging_kw, 2)
            }
        else:
            return {
                "time_text": "Charging paused",
                "status_text": "No Solar Surplus",
                "charging_rate_kw": 0.0
            }

    def get_crop_condition(self, zone_num):
        """Returns simplified farmer condition and safe/warning badge."""
        if zone_num == 1:
            temp = self.zone1_temp
            eth = self.zone1_ethylene
            target = self.zone1_target
            safe_min, safe_max = 2.0, 8.0
        elif zone_num == 2:
            temp = self.zone2_temp
            eth = self.zone2_ethylene
            target = self.zone2_target
            safe_min, safe_max = 0.0, 2.5
        elif zone_num == 3:
            temp = self.zone3_temp
            eth = self.zone3_ethylene
            target = self.zone3_target
            safe_min, safe_max = 8.0, 15.0
        else:
            temp = self.single_zone_temp
            eth = self.single_zone_ethylene
            target = self.single_zone_target
            safe_min, safe_max = target - 1.5, target + 1.5

        if temp > safe_max:
            return {"status": "WARNING", "badge": "CHECK STORAGE", "class": "badge-warning", "reason": "Temperature High"}
        elif temp < safe_min - 0.5:
            return {"status": "WARNING", "badge": "TOO COLD", "class": "badge-warning", "reason": "Temperature Low"}
        elif eth > 0.25:
            return {"status": "WARNING", "badge": "VENTILATE", "class": "badge-warning", "reason": "Ethylene Gas Warning"}
        else:
            return {"status": "GOOD", "badge": "SAFE", "class": "badge-safe", "reason": "All Parameters Optimal"}

    def get_failure_duration_minutes(self):
        if self.temp_failure_start_time:
            return int((time.time() - self.temp_failure_start_time) / 60)
        return 0

    def get_system_snapshot(self):
        self.step_simulation()
        
        # Determine overall system health
        if self.power_status == "POWER FAILURE" or (self.anomaly_high_temp and self.get_failure_duration_minutes() > 5):
            system_status = "WARNING"
            system_badge_class = "status-warning"
        elif not self.zone3_online:
            system_status = "ALERT"
            system_badge_class = "status-alert"
        else:
            system_status = "NORMAL"
            system_badge_class = "status-normal"
            
        runtime_data = self.get_battery_runtime_str()
        charging_data = self.get_battery_charging_str()

        return {
            "demo_mode": self.demo_mode,
            "storage_mode": self.storage_mode,
            "system_status": system_status,
            "system_badge_class": system_badge_class,
            "ambient_temp": self.ambient_temperature,
            
            # Power
            "power": {
                "solar_power_kw": self.solar_power_kw,
                "solar_voltage": self.solar_voltage,
                "solar_current": self.solar_current,
                "solar_capacity_kw": self.solar_capacity_kw,
                "battery_soc": self.battery_soc,
                "battery_voltage": self.battery_voltage,
                "battery_capacity_kwh": self.battery_capacity_kwh,
                "available_energy_kwh": runtime_data["available_kwh"],
                "current_load_kw": self.current_load_kw,
                "power_status": self.power_status,
                "power_direction": self.power_direction,
                "estimated_runtime": runtime_data["runtime_text"],
                "runtime_mode": runtime_data["mode_text"],
                "estimated_charging": charging_data["time_text"],
                "charging_status": charging_data["status_text"],
                "charging_rate_kw": charging_data["charging_rate_kw"]
            },
            
            # Actuators & Cooling Architecture
            "actuators": {
                "ac_status": self.ac_status,
                "cooling_active": (self.ac_status == "ON"),
                "solenoid_1": self.solenoid_1,
                "solenoid_2": self.solenoid_2,
                "uvc_status": self.uvc_status,
                "uvc_treatment": self.uvc_treatment,
                "uvc_last_treatment": self.uvc_last_treatment,
                "cooling_flow_direction": self.cooling_flow_direction,
                "cooling_source": "Central Chiller (Zone 2)"
            },
            
            # 3-Zone Telemetry
            "zone1": {
                "name": "ZONE 1",
                "range_label": "2–8°C",
                "target_temp": self.zone1_target,
                "temp": self.zone1_temp,
                "humidity": self.zone1_humidity,
                "weight": self.zone1_weight,
                "ethylene_level": "LOW",
                "ethylene_ppm": self.zone1_ethylene,
                "solenoid_status": self.solenoid_1,
                "cooling_status": "ACTIVE" if (self.ac_status == "ON" and self.solenoid_1 == "OPEN") else "STOPPED",
                "sensor_connection": "ONLINE" if self.zone1_online else "OFFLINE",
                "crop_name": self.zone1_crop,
                "crop_id": self.zone1_crop_id,
                "crop_image": "/static/images/crops/french_beans.jpg",
                "condition": self.get_crop_condition(1)
            },
            "zone2": {
                "name": "ZONE 2 (CENTER CHAMBER)",
                "range_label": "0–2°C",
                "target_temp": self.zone2_target,
                "temp": self.zone2_temp,
                "humidity": self.zone2_humidity,
                "weight": self.zone2_weight,
                "ethylene_level": "LOW",
                "ethylene_ppm": self.zone2_ethylene,
                "ac_status": self.ac_status,
                "uvc_status": self.uvc_status,
                "cooling_source": "Central AC Unit",
                "cooling_status": "COOLING ACTIVE" if self.ac_status == "ON" else "TARGET REACHED",
                "sensor_connection": "ONLINE" if self.zone2_online else "OFFLINE",
                "crop_name": self.zone2_crop,
                "crop_id": self.zone2_crop_id,
                "crop_image": "/static/images/crops/cabbage.jpg",
                "condition": self.get_crop_condition(2)
            },
            "zone3": {
                "name": "ZONE 3",
                "range_label": "8–15°C",
                "target_temp": self.zone3_target,
                "temp": self.zone3_temp,
                "humidity": self.zone3_humidity,
                "weight": self.zone3_weight,
                "ethylene_level": "LOW" if self.zone3_ethylene < 0.2 else "ELEVATED",
                "ethylene_ppm": self.zone3_ethylene,
                "solenoid_status": self.solenoid_2,
                "cooling_status": "ACTIVE" if (self.ac_status == "ON" and self.solenoid_2 == "OPEN") else "STOPPED",
                "sensor_connection": "ONLINE" if self.zone3_online else "OFFLINE",
                "crop_name": self.zone3_crop,
                "crop_id": self.zone3_crop_id,
                "crop_image": "/static/images/crops/tomato.jpg",
                "condition": self.get_crop_condition(3)
            },
            
            # Single Zone Telemetry
            "single_zone": {
                "name": "SINGLE STORAGE CHAMBER",
                "range_label": "Configurable (0–15°C)",
                "target_temp": self.single_zone_target,
                "temp": self.single_zone_temp,
                "humidity": self.single_zone_humidity,
                "weight": self.single_zone_weight,
                "ethylene_level": "LOW",
                "ethylene_ppm": self.single_zone_ethylene,
                "ac_status": self.ac_status,
                "uvc_status": self.uvc_status,
                "cooling_status": "COOLING" if self.ac_status == "ON" else "STOPPED",
                "sensor_connection": "ONLINE",
                "crop_name": self.single_zone_crop,
                "crop_id": self.single_zone_crop_id,
                "crop_image": "/static/images/crops/cabbage.jpg",
                "condition": self.get_crop_condition(0)
            },
            
            # Device Status
            "device": {
                "device_id": self.device_id,
                "ip_address": self.device_ip,
                "usb_status": self.usb_status,
                "ip_status": self.ip_status,
                "firebase_status": self.firebase_status,
                "internet_status": self.internet_status,
                "last_seen": f"{self.last_seen_seconds} seconds ago",
                "firmware_version": "v2.4.1-NER-ESP32"
            },
            
            # Alerts & Failure Tracking
            "failure_metrics": {
                "temperature_failure_duration_min": self.get_failure_duration_minutes(),
                "temperature_failure_zone": self.temp_failure_zone,
                "high_temp_alert": self.anomaly_high_temp,
                "power_failure_alert": self.anomaly_power_fail or self.power_failure_active
            }
        }

# Global singleton simulation instance
sim = ColdStorageSimulation()
