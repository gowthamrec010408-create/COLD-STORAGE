/* ==========================================================================
   QORA TECH — Solar Smart Cold Storage ESP32 Firmware
   North Eastern Region (NER) Multi-Zone Cold Chain Innovation
   
   Hardware Actuator & Sensor Pinout:
   - AC Compressor Relay: GPIO 26 (Optocoupled Relay)
   - Solenoid Valve 1:    GPIO 14 (Chilled air from Center -> Zone 1)
   - Solenoid Valve 2:    GPIO 12 (Chilled air from Center -> Zone 3)
   - UV-C + TiO2 Relay:   GPIO 27 (Photocatalytic Sanitation)
   - Zone 1 DHT22 Sensor: GPIO 4
   - Zone 2 DS18B20 1-Wire: GPIO 16
   - Zone 3 DHT22 Sensor: GPIO 17
   - HX711 Load Cell DT:  GPIO 22, SCK: GPIO 23
   - MQ-137 Ethylene Gas: GPIO 34 (ADC1)
   ========================================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Wi-Fi Credentials
const char* WIFI_SSID = "QORA_FARM_WIFI";
const char* WIFI_PASS = "SolarCold@2026";

// Cloud / Flask Backend Endpoint (or local gateway IP)
const char* SERVER_BASE_URL = "http://192.168.1.100:5000";

// GPIO Pin Definitions
#define PIN_RELAY_AC        26
#define PIN_RELAY_SOLENOID1 14
#define PIN_RELAY_SOLENOID2 12
#define PIN_RELAY_UVC       27
#define PIN_ETHYLENE_ADC    34

// Operating Configuration Variables (Synced from Cloud)
String storageMode = "THREE_ZONE"; // "THREE_ZONE" or "ONE_ZONE"
float deadbandHysteresis = 0.8;    // ±0.8°C anti-short cycle protection
float targetZone1 = 4.5;           // °C
float targetZone2 = 1.0;           // °C (Center Chamber)
float targetZone3 = 10.0;          // °C
float targetSingleZone = 1.5;      // °C

// Sensor State Readings
float tempZ1 = 4.2, humZ1 = 93.0, weightZ1 = 76.5;
float tempZ2 = 1.2, humZ2 = 96.5, weightZ2 = 124.0;
float tempZ3 = 9.8, humZ3 = 88.0, weightZ3 = 98.0;
float ethylenePpm = 0.04;

unsigned long lastTelemetryMillis = 0;
unsigned long lastConfigPollMillis = 0;
const unsigned long TELEMETRY_INTERVAL = 3000; // 3 seconds
const unsigned long CONFIG_POLL_INTERVAL = 10000; // 10 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==========================================");
  Serial.println("  QORA TECH — Solar Smart Cold Storage");
  Serial.println("  ESP32 Multi-Zone Controller Booting...");
  Serial.println("==========================================");

  // Initialize Relay GPIOs as Outputs (Active LOW relays)
  pinMode(PIN_RELAY_AC, OUTPUT);
  pinMode(PIN_RELAY_SOLENOID1, OUTPUT);
  pinMode(PIN_RELAY_SOLENOID2, OUTPUT);
  pinMode(PIN_RELAY_UVC, OUTPUT);

  digitalWrite(PIN_RELAY_AC, HIGH);        // Default OFF
  digitalWrite(PIN_RELAY_SOLENOID1, HIGH);  // Default CLOSED
  digitalWrite(PIN_RELAY_SOLENOID2, HIGH);  // Default CLOSED
  digitalWrite(PIN_RELAY_UVC, HIGH);        // Default OFF

  // Connect to Farm Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected successfully!");
    Serial.print("[Wi-Fi] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[Wi-Fi] Offline. Operating in Autonomous Fail-Safe Mode.");
  }
}

void loop() {
  // 1. Read Physical Sensor Probes
  readSensors();

  // 2. Autonomous Temperature & Relay Control Logic with Deadband Hysteresis
  executeControlLogic();

  // 3. Periodic Cloud Sync (Poll config & push telemetry)
  if (WiFi.status() == WL_CONNECTED) {
    if (millis() - lastConfigPollMillis > CONFIG_POLL_INTERVAL) {
      pollCloudConfig();
      lastConfigPollMillis = millis();
    }
    if (millis() - lastTelemetryMillis > TELEMETRY_INTERVAL) {
      pushTelemetryJSON();
      lastTelemetryMillis = millis();
    }
  }

  // 4. Handle USB Serial Debugging Commands
  handleSerialCommands();

  delay(100);
}

void readSensors() {
  // In production, invoke DHT.read(), DallasTemperature.getTempC(), HX711.get_units()
  // Here we read analog ADC for ethylene detection
  int rawAdc = analogRead(PIN_ETHYLENE_ADC);
  ethylenePpm = (rawAdc / 4095.0) * 0.5; // Scaled ppm
}

void executeControlLogic() {
  if (storageMode == "THREE_ZONE") {
    // Center Chamber (Zone 2) controls AC compressor
    if (tempZ2 > (targetZone2 + deadbandHysteresis)) {
      digitalWrite(PIN_RELAY_AC, LOW); // AC ON
    } else if (tempZ2 < (targetZone2 - 0.2)) {
      // Check if side zones still require active cooling flow
      bool needZ1 = (tempZ1 > targetZone1 + deadbandHysteresis);
      bool needZ3 = (tempZ3 > targetZone3 + deadbandHysteresis);
      if (!needZ1 && !needZ3) {
        digitalWrite(PIN_RELAY_AC, HIGH); // AC OFF
      }
    }

    // Solenoid Valve 1 (Airflow to Zone 1)
    if (tempZ1 > (targetZone1 + 0.3)) {
      digitalWrite(PIN_RELAY_SOLENOID1, LOW); // OPEN Valve 1
    } else if (tempZ1 < (targetZone1 - 0.3)) {
      digitalWrite(PIN_RELAY_SOLENOID1, HIGH); // CLOSE Valve 1
    }

    // Solenoid Valve 2 (Airflow to Zone 3)
    if (tempZ3 > (targetZone3 + 0.4)) {
      digitalWrite(PIN_RELAY_SOLENOID2, LOW); // OPEN Valve 2
    } else if (tempZ3 < (targetZone3 - 0.3)) {
      digitalWrite(PIN_RELAY_SOLENOID2, HIGH); // CLOSE Valve 2
    }

  } else { // ONE_ZONE Mode
    if (tempZ2 > (targetSingleZone + deadbandHysteresis)) {
      digitalWrite(PIN_RELAY_AC, LOW);        // AC ON
      digitalWrite(PIN_RELAY_SOLENOID1, LOW); // Open all vents
      digitalWrite(PIN_RELAY_SOLENOID2, LOW);
    } else if (tempZ2 < (targetSingleZone - 0.3)) {
      digitalWrite(PIN_RELAY_AC, HIGH);       // AC OFF
      digitalWrite(PIN_RELAY_SOLENOID1, HIGH);
      digitalWrite(PIN_RELAY_SOLENOID2, HIGH);
    }
  }
}

void pollCloudConfig() {
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/hardware/config";
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    
    if (doc.containsKey("storageMode")) {
      storageMode = doc["storageMode"].as<String>();
    }
    if (doc.containsKey("deadband")) {
      deadbandHysteresis = doc["deadband"].as<float>();
    }
    if (doc.containsKey("targets")) {
      targetZone1 = doc["targets"]["zone1"].as<float>();
      targetZone2 = doc["targets"]["zone2"].as<float>();
      targetZone3 = doc["targets"]["zone3"].as<float>();
      targetSingleZone = doc["targets"]["singleZone"].as<float>();
    }
    Serial.println("[Cloud] Synchronized config from Firebase/Flask successfully.");
  }
  http.end();
}

void pushTelemetryJSON() {
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/hardware/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(1024);
  doc["deviceId"] = "ESP32-QORA-NER-01";
  doc["storageMode"] = storageMode;
  
  JsonObject z1 = doc.createNestedObject("zone1");
  z1["temperature"] = tempZ1;
  z1["humidity"] = humZ1;
  z1["weight"] = weightZ1;
  z1["ethylene"] = ethylenePpm;

  JsonObject z2 = doc.createNestedObject("zone2");
  z2["temperature"] = tempZ2;
  z2["humidity"] = humZ2;
  z2["weight"] = weightZ2;

  JsonObject z3 = doc.createNestedObject("zone3");
  z3["temperature"] = tempZ3;
  z3["humidity"] = humZ3;
  z3["weight"] = weightZ3;

  String requestBody;
  serializeJson(doc, requestBody);
  http.POST(requestBody);
  http.end();
}

void handleSerialCommands() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.equalsIgnoreCase("STATUS")) {
      Serial.printf("[STATUS] Mode: %s | Z1: %.1fC | Z2: %.1fC | Z3: %.1fC | AC: %s\n",
        storageMode.c_str(), tempZ1, tempZ2, tempZ3,
        (digitalRead(PIN_RELAY_AC) == LOW ? "ON" : "OFF"));
    } else if (cmd.startsWith("SET_MODE ")) {
      storageMode = cmd.substring(9);
      Serial.printf("[CONFIG] Storage mode manually set via USB to %s\n", storageMode.c_str());
    }
  }
}
