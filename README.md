# Solar Smart Cold Storage — IoT Sensor + AI Spoilage Prediction Platform

[![GitHub Pages Deployment](https://img.shields.io/badge/Deployable-GitHub%20Pages-brightgreen)](https://pages.github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20ES6%2B-emerald)](https://developer.mozilla.org/)
[![Firebase CDN](https://img.shields.io/badge/Backend-Firebase%20RTDB%20%2B%20Firestore-orange)](https://firebase.google.com/)
[![ESP32 FreeRTOS](https://img.shields.io/badge/Firmware-ESP32%20Dual--Core%20C%2B%2B-red)](https://www.espressif.com/)

An enterprise-grade, solar-powered agricultural post-harvest platform designed for **Three-Zone Smart Cold Storage**. Built with pure vanilla HTML5/CSS3/ES6+ JavaScript, Chart.js, Lucide Icons, jsPDF, and SheetJS for direct deployment to **GitHub Pages** without requiring a traditional backend server.

---

## 1. System Architecture

```
                SOLAR PV ARRAY (4.8 kWp)
                           ↓
                   BATTERY BANK (48V)
                           ↓
                ESP32 MASTER CONTROLLER
                           ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
     ZONE 1             ZONE 2             ZONE 3
   (10–13°C)           (0–2°C)            (0–8°C)
  Tropical Crops      Deep Chill         Temperate
  • SHT31 Temp       • SHT31 Temp       • SHT31 Temp
  • SHT31 Hum        • SHT31 Hum        • SHT31 Hum
  • HX711 Weight     • HX711 Weight     • HX711 Weight
  • Ethylene Probe   • Ethylene Probe   • Ethylene Probe
        └──────────────────┬──────────────────┘
                           ↓ (Wi-Fi / REST / WebSocket)
                 FIREBASE REALTIME DB
                           ↓
                  WEB APPLICATION (SPA)
        ┌──────────────────┴──────────────────┐
        ↓                                     ↓
   REAL-TIME MONITORING                  AI PREDICTION ENGINE
   • Independent Zone Gauges             • Multi-Parameter Scoring
   • Continuous Transpiration Loss       • Freshness Score (0-100)
   • Ethylene Acceleration (ppm)         • Spoilage Risk Categorization
   • Solar Power & Battery SoC           • Est. Remaining Shelf Life
                                              ↓
                                      SMART SELLING QUEUE
                                      • Quality-Ranked Dispatch
                                      • SELL FIRST / SELL SOON
```

---

## 2. Three-Zone Target Specifications

| Parameter | Zone 1 (Tropical) | Zone 2 (Deep Chill) | Zone 3 (Temperate) |
| :--- | :--- | :--- | :--- |
| **Target Temperature** | **10.0 – 13.0°C** | **0.0 – 2.0°C** | **0.0 – 8.0°C** |
| **Optimal Humidity** | 85 – 95 %RH | 90 – 98 %RH | 88 – 95 %RH |
| **Representative Crops** | Tomato, Potato, Chilli, Mango | Apple, Carrot, Cabbage, Strawberry | Green Beans, Peas, Cucumber |
| **Key Risk Mitigated** | Chilling injury / sunken pits | Respiration & decay slowing | Ethylene climacteric acceleration |
| **Instrumentation** | SHT31, HX711, Analog C2H4 | SHT31, HX711, Analog C2H4 | SHT31, HX711, UART C2H4 |

---

## 3. Key Platform Capabilities

### A. Gated User Flow & Admin Approval
* Role-based registration (`Farmer`, `Operator`, `Technician`, `Researcher`).
* New accounts default to `status = "pending"` and are strictly gated from monitoring until approved by an administrator in the **Admin Approval Panel**.

### B. AI Spoilage & Shelf-Life Prediction Engine (`prediction-engine.js`)
* Decoupled biological scoring engine evaluating 5 distinct degradation dimensions:
  1. *Thermal Stress* (Corridor deviation + temperature volatility)
  2. *Moisture Stress* (Vapor pressure deficit & condensation risk)
  3. *Weight Loss Velocity* (Transpiration rate measured by HX711 load cells)
  4. *Ethylene Ripening Gas* (Concentration ppm + rising acceleration rate)
  5. *Storage Longevity* (Cultivar baseline shelf life model)
* Produces:
  * **Freshness Score** (0–100%)
  * **Spoilage Risk** (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  * **Estimated Remaining Shelf Life** (in Days/Hours)
  * **Quality Trend** (`STABLE`, `DEGRADING`, `RAPID DECAY`)
  * **Recommended Action** (`SAFE TO STORE`, `MONITOR CLOSELY`, `SELL SOON`, `SELL FIRST`)
  * **Explainability Matrix** explaining exactly why the score changed.

### C. Quality-Based Smart Selling
* Real-time dynamic queue prioritizing produce batches based on urgency score.
* Color-coded action badges: `SELL FIRST` (Red), `SELL SOON` (Amber), `SAFE TO STORE` (Emerald).

### D. Sensor Calibration Suite
* Tare zeroing and 2-point reference weight calibration for Zone 1-3 HX711 load cells.
* Fresh-air baseline zeroing for electrochemical ethylene gas sensors.

### E. Solar Energy & Power Management
* Real-time monitoring of Solar PV wattage, 48V Battery Bank SoC, Compressor load, and Power Modes (`SOLAR_PRIORITY`, `NORMAL`, `ENERGY_SAVING`, `CRITICAL`).

### F. Reports & Multi-Format Exports
* One-click automated export to **PDF** (via jsPDF + AutoTable) and **Excel / CSV** (via SheetJS).

### G. Virtual ESP32 Hardware Simulator
* Built-in interactive simulator with selectable anomaly scenarios (*Normal, Solar Drop, Ethylene Surge, Temp Spike, Rapid Loss*) for standalone testing on GitHub Pages.

---

## 4. Complete ESP32 Modular Firmware (`/esp32`)

* [`esp32_main.ino`](file:///esp32/esp32_main.ino): FreeRTOS multi-core task scheduler.
* [`wifi_manager.ino`](file:///esp32/wifi_manager.ino): Non-blocking Wi-Fi auto-reconnection.
* [`firebase_manager.ino`](file:///esp32/firebase_manager.ino): Realtime Database telemetry uploader.
* [`temperature_sensor.ino`](file:///esp32/temperature_sensor.ino): Zone 1-3 temperature acquisition (SHT31 / DS18B20).
* [`humidity_sensor.ino`](file:///esp32/humidity_sensor.ino): Zone 1-3 relative humidity measurement.
* [`load_cell_manager.ino`](file:///esp32/load_cell_manager.ino): HX711 24-bit ADC, tare & digital moving-average filter.
* [`ethylene_sensor.ino`](file:///esp32/ethylene_sensor.ino): Modular gas abstraction (ADC / UART / I2C / Modbus).
* [`zone_manager.ino`](file:///esp32/zone_manager.ino): Zone coordination and status thresholds.
* [`telemetry_manager.ino`](file:///esp32/telemetry_manager.ino): JSON serialization and timestamping.
* [`prediction_support.ino`](file:///esp32/prediction_support.ino): Autonomous local edge refrigeration safeguard (100% offline protection).
* [`rs485_modbus.ino`](file:///esp32/rs485_modbus.ino): Solar inverter Modbus RTU telemetry.

---

## 5. Deployment on GitHub Pages

1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Deploy Solar Smart Cold Storage platform"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. In your GitHub repository, go to **Settings** &rarr; **Pages**.
3. Under **Branch**, select `main` and root directory `/ (root)`, then click **Save**.
4. Your site will be published at `https://<your-username>.github.io/<repo-name>/`.

---

## 6. Scientific & Food Safety Disclaimer

*The AI prediction algorithms and freshness indicators provided by this platform are computational estimation models based on environmental sensor trends and biological produce degradation literature. They are designed for post-harvest logistics decision support and must not be interpreted as certified laboratory food-safety determinations.*
