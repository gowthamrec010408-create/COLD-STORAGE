# Solar Smart Cold Storage — ESP32 Master Controller Firmware

Modular FreeRTOS-based firmware for monitoring three independent cold-storage zones, measuring continuous produce mass transpiration with HX711 load cells, sampling electrochemical ethylene gas, and streaming real-time telemetry to Firebase Realtime Database.

---

## 1. Hardware Architecture & GPIO Pinout

| Function / Sensor | Interface | ESP32 GPIO Pin | Description |
| :--- | :--- | :--- | :--- |
| **I2C Bus (SDA / SCL)** | I²C | `GPIO 21` / `GPIO 22` | SHT31 Temperature & Humidity Probes |
| **Zone 1 Load Cell (HX711)** | Digital | `GPIO 32` (DOUT) / `GPIO 33` (SCK) | 24-bit Mass Transpiration ADC |
| **Zone 2 Load Cell (HX711)** | Digital | `GPIO 25` (DOUT) / `GPIO 26` (SCK) | 24-bit Mass Transpiration ADC |
| **Zone 3 Load Cell (HX711)** | Digital | `GPIO 27` (DOUT) / `GPIO 14` (SCK) | 24-bit Mass Transpiration ADC |
| **Zone 1 Ethylene Gas** | Analog ADC | `GPIO 36` (ADC1_CH0) | Electrochemical C2H4 Pre-Amp |
| **Zone 2 Ethylene Gas** | Analog ADC | `GPIO 39` (ADC1_CH3) | Electrochemical C2H4 Pre-Amp |
| **Zone 3 Ethylene Gas** | UART2 | `GPIO 16` (RX2) / `GPIO 17` (TX2) | Digital NDIR / ZE03 Ethylene Probe |
| **RS485 Modbus Solar** | Serial | `GPIO 16` / `GPIO 17` / `GPIO 5` (DE/RE)| Solar Inverter & Battery MPPT |
| **Cooling Compressor Relay**| Digital Output | `GPIO 18` | Autonomous Thermal Safeguard |
| **Ventilation Fan Relay** | Digital Output | `GPIO 19` | Autonomous Ethylene Scavenging |
| **Local Piezo Buzzer** | PWM Output | `GPIO 23` | On-site Audible Emergency Alert |

---

## 2. Storage Zone Targets

* **ZONE 1 (10–13°C)**: Tropical & Cold-Sensitive Produce (*Tomatoes, Potatoes, Chillies, Bananas*).
* **ZONE 2 (0–2°C)**: Deep Chill & Deciduous Produce (*Apples, Carrots, Cabbage, Leafy Greens*).
* **ZONE 3 (0–8°C)**: Temperate & Legume Produce (*Green Beans, Peas, Cucumbers*).

---

## 3. Required Arduino IDE Libraries

Install via **Arduino Library Manager**:
1. `WiFi` (Built-in ESP32 core)
2. `HTTPClient` (Built-in ESP32 core)
3. `Wire` (Built-in ESP32 core)
4. `EEPROM` (Built-in ESP32 core)
5. `ArduinoJson` (v6.21+ or v7.x)
6. `Adafruit SHT31 Library`
7. `HX711` by *Bogde*

---

## 4. Flashing Instructions

1. Open Arduino IDE or PlatformIO.
2. Select Board: **ESP32 Dev Module**.
3. Set CPU Frequency: **240MHz (WiFi/BT)**.
4. Set Flash Size: **4MB (32Mb)**.
5. In `wifi_manager.ino`, update `WIFI_SSID` and `WIFI_PASS`.
6. In `firebase_manager.ino`, update `FIREBASE_HOST` and `FIREBASE_AUTH_KEY`.
7. Upload the sketch. Open Serial Monitor at **115200 baud**.

---

## 5. Offline Autonomous Protection

The firmware implements autonomous FreeRTOS edge protection in `prediction_support.ino`. 
If Wi-Fi is severed or Firebase is unreachable, the physical cold storage **continues 100% autonomous local refrigeration control and ethylene exhaust ventilation**.
