# QORA TECH — Solar Smart Cold Storage
### Smart Mini Cold-Storage System for Farmers in the North Eastern Region (NER) of India

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Backend-Flask-green.svg)](https://flask.palletsprojects.com/)
[![ESP32](https://img.shields.io/badge/Hardware-ESP32-red.svg)](https://www.espressif.com/en/products/socs/esp32)
[![Firebase](https://img.shields.io/badge/Cloud-Firestore-orange.svg)](https://firebase.google.com/)

---

## 1. Project Objective

Farmers in the North Eastern Region (NER) of India face high post-harvest losses (up to 35–40%) for perishable crops such as cabbage, cauliflower, tomatoes, king chillies (Bhut Jolokia), and beans due to erratic grid power and tropical humidity.

**QORA TECH** is a decentralized, solar-powered smart mini cold-storage solution engineered to provide:
1. **100% Solar-Powered Preservation:** 2.4 kW Photovoltaic array backed by 48V / 10 kWh LiFePO4 battery storage.
2. **Modular Flexible Multi-Zone Operation:** Configurable **3-Zone Mode** (0–2°C, 2–8°C, 8–15°C) and **1-Zone Mode** (single uniform room).
3. **Microbial Air Treatment:** Automated UV-C + $\text{TiO}_2$ photocatalytic sanitization to eliminate mould spores and neutralize spoilage ethylene gases.
4. **Farmer-Centric Simplicity:** Large visual indicators, real crop photography, simple English status badges (SAFE, GOOD, WARNING), and zero technical jargon on the farmer view.
5. **Agronomist Advisory Loop:** Admin portal allowing agronomists to send targeted harvest recommendations directly to specific farmers.

---

## 2. System Architecture & Cooling Distribution

```
                                  +---------------------------------------+
                                  |         SOLAR PV ARRAY (2.4 kW)       |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |    HYBRID INVERTER / MPPT & BATTERY   |
                                  |          (48V / 10 kWh LiFePO4)       |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |        AC / CENTRAL COOLING UNIT      |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                    [ ZONE 2: CENTER COOLING CHAMBER ]
                                            (0°C – 2°C, UV-C/TiO2)
                                                /           \
                                               /             \
                                [ SOLENOID VALVE 1 ]     [ SOLENOID VALVE 2 ]
                                         |                        |
                                         v                        v
                            [ ZONE 1: 2°C – 8°C ]    [ ZONE 3: 8°C – 15°C ]
                            (Leafy, Berries, etc.)   (Potato, Tomato, etc.)
                                         ^                        ^
                                         +-----------+------------+
                                                     |
                                                     v
                                  +---------------------------------------+
                                  |    ESP32 CONTROLLER + SENSORS & RELAYS|
                                  |    (Temp, Humidity, Load Cell, Gas)   |
                                  +-------------------+-------------------+
                                                      |
                                             WiFi / REST / USB
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |        FLASK BACKEND & SIMULATION     |
                                  |        (Thermodynamics, Hysteresis)   |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                             +------------------------+-----------------------+
                             |                                                |
                             v                                                v
              +-------------------------------+               +-------------------------------+
              |        FARMER DASHBOARD       |               |          ADMIN PORTAL         |
              |  - Visual 3-Zone / 1-Zone     |               |  - System & Telemetry Monitor |
              |  - Simple Crop Cards (Photos) |               |  - Solenoids & AC Control     |
              |  - Battery Runtime & Solar    |               |  - Crop Recommendation Engine |
              |  - Alerts & Recommendations   |               |  - Farmer & Unit Management   |
              +-------------------------------+               +-------------------------------+
```

---

## 3. Technology Stack

- **Frontend:** HTML5, Vanilla CSS3 (Custom Agricultural Design System, Glassmorphism, Micro-animations), Vanilla JavaScript (ES6+), Chart.js.
- **Backend:** Python 3.11+, Flask, RESTful APIs, Flask-CORS.
- **Database & Cloud:** Google Cloud Firestore / Firebase Auth (with automatic in-memory seed datastore fallback).
- **Hardware Layer:** ESP32 Microcontroller (C++/Arduino), DHT22 / DS18B20 digital probes, HX711 Load Cell, MQ-137 Ethylene gas sensor, Optocoupled relays.

---

## 4. Key Features

### A. Dual Configurable Storage Modes
- **3-Zone Mode:**
  - **Zone 1 (2–8°C):** French beans, capsicum, berries.
  - **Zone 2 (0–2°C Center Chamber):** Cabbage, cauliflower, leafy greens, carrots (primary cooling hub).
  - **Zone 3 (8–15°C):** Tomatoes, green chillies, ginger, table potatoes, Bhut Jolokia.
- **1-Zone Mode:**
  - Reconfigures all solenoid dampers to open and uses the entire storage room for a single bulk crop at a configurable target temperature (e.g. 1.5°C).

### B. Accurate Solar & Battery Math
- **Battery Usable Energy:**
  $$\text{Available Energy (kWh)} = 10.0\text{ kWh} \times \left(\frac{\text{SOC} - 10}{100}\right)$$
- **Estimated Backup Runtime:**
  $$\text{Backup Hours} = \frac{\text{Available Energy (kWh)}}{\text{Net Discharge Load (kW)}}$$
- **Estimated Charging Time:**
  $$\text{Charging Hours} = \frac{(100\% - \text{SOC}) \times 10.0\text{ kWh}}{(\text{Solar Input} - \text{Load}) \times \eta_{\text{eff}}}$$

### C. Temperature Control Hysteresis
Implements a $\pm 0.8^\circ\text{C}$ deadband around target temperatures to prevent rapid AC compressor on/off short cycling, saving compressor mechanical life and inverter surge currents.

---

## 5. Quick Start & Local Execution

### Prerequisites
- Python 3.9+ installed.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/qora-tech-cold-storage.git
cd qora-tech-cold-storage
pip install -r requirements.txt
```

### 2. Run the Application
```bash
python app.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 6. Demo Mode vs Live Hardware Stream

The application includes an **Assessment Demo Engine** (`simulation.py`):
- Click **"DEMO MODE ON"** in the top header to toggle between live ESP32 ingestion and the physics simulator.
- Use the **Admin Portal** demo anomaly buttons to trigger:
  - ⚠ **High Temperature Rise in Zone 3** (records failure duration in minutes).
  - ⚠ **Solar / Grid Power Failure** (activates LiFePO4 battery backup).
  - ⚠ **Sensor Disconnect** (demonstrates fail-safe solenoid locking).
  - ✓ **Reset to Normal**.

---

## 7. ESP32 Hardware Integration

The sketch is located in `esp32_firmware/qora_cold_storage_esp32.ino`:
1. Open the `.ino` sketch in Arduino IDE.
2. Update `WIFI_SSID`, `WIFI_PASS`, and your local Flask `SERVER_BASE_URL`.
3. Flash to an ESP32 Development Board.
4. The ESP32 will periodically poll `/api/hardware/config` and push live readings to `/api/hardware/telemetry`.

---

## 8. Security & Firebase Setup

For production cloud deployment:
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
2. Generate a Private Key (`serviceAccountKey.json`).
3. Set the environment variable:
   ```bash
   export FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
   ```
> **Security Notice:** Never commit `firebase_credentials.json`, `serviceAccountKey.json`, or `.env` to GitHub.

---

## 9. Future AI & IoT Roadmap

- **Computer Vision Spoilage Detection:** Edge camera running lightweight YOLOv8-Nano to inspect outer vegetable leaves for browning or rot.
- **Dynamic Market Price Predictive Dispatch:** Forecasting NER mandi wholesale prices to recommend optimal storage release dates.
- **LoRaWAN Mesh:** Long-range wireless telemetry for remote hill farms in Arunachal Pradesh, Meghalaya, and Nagaland without cellular coverage.

---
Developed for **North Eastern Region (NER) Agricultural Advancement** • **QORA TECH**
