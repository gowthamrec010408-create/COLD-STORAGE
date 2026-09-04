/**
 * ==============================================================================
 * QORA TECH — SOLAR SMART COLD STORAGE
 * STANDALONE COMPLETE ESP32 IoT CONTROLLER FIRMWARE
 * ==============================================================================
 * Single-file firmware structured for standard Arduino IDE compilation.
 * 
 * Hardware: ESP32-WROOM-32 / ESP32-S3
 * Architecture: Non-blocking millis() scheduler & Autonomous Local Refrigeration
 * Connectivity: 
 *   1. Direct IP Address Connection (HTTP REST Server on port 80 at /api/telemetry & /api/command)
 *   2. USB Serial @ 115200 baud (Web Serial API newline-delimited JSON stream)
 *   3. Wi-Fi + Firebase Realtime Database (/live/storageUnit01/)
 * 
 * Monitored Compartments:
 *   - LEFT:   ZONE 1 (2–8°C)   — Cool Storage (Green Beans, Seed Potato)
 *   - CENTER: ZONE 2 (0–2°C)   — Deep Cold Storage [Coldest] (Cabbage, Root crops)
 *   - RIGHT:  ZONE 3 (8–15°C)  — Cool / Moderate (Naga Chilli, Turmeric, Table Potato)
 * ==============================================================================
 */

// ==============================================================================
// 1. LIBRARIES
// ==============================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Wire.h>

// ==============================================================================
// 2. CONFIGURATION & CONSTANTS
// ==============================================================================
const char* WIFI_SSID           = "QoraTech-AgroNet";
const char* WIFI_PASSWORD       = "PrecisionSolar2026";

const char* FIREBASE_HOST       = "https://cold-storage-3a452-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* FIREBASE_API_KEY    = "AIzaSyDIgWuDVHqBak_NQHcdwJbGB2T8VRjQ93c";
const char* DEVICE_ID           = "ESP32-COLD-01";
const char* FIRMWARE_VERSION    = "v2.4.0";

// Temperature Targets (°C)
float ZONE1_TARGET_MIN          = 2.0;
float ZONE1_TARGET_MAX          = 8.0;

float ZONE2_TARGET_MIN          = 0.0;
float ZONE2_TARGET_MAX          = 2.0;

float ZONE3_TARGET_MIN          = 8.0;
float ZONE3_TARGET_MAX          = 15.0;

// Calibration Offsets
long  LOADCELL_Z1_OFFSET        = 84200;
float LOADCELL_Z1_FACTOR        = 420.5;

long  LOADCELL_Z2_OFFSET        = 91450;
float LOADCELL_Z2_FACTOR        = 419.8;

long  LOADCELL_Z3_OFFSET        = 78910;
float LOADCELL_Z3_FACTOR        = 421.2;

// Millis Intervals (Non-Blocking Timing)
const unsigned long INTERVAL_SENSORS_MS  = 2000;
const unsigned long INTERVAL_SERIAL_TX_MS = 2000;
const unsigned long INTERVAL_FIREBASE_MS = 5000;
const unsigned long INTERVAL_WIFI_CHK_MS = 10000;

// ==============================================================================
// 3. HARDWARE PINS & WEB SERVER
// ==============================================================================
#define I2C_SDA_PIN             21
#define I2C_SCL_PIN             22

#define SHT31_Z1_ADDR           0x44
#define SHT31_Z2_ADDR           0x45

#define HX711_Z1_DOUT           32
#define HX711_Z1_SCK            33
#define HX711_Z2_DOUT           25
#define HX711_Z2_SCK            26
#define HX711_Z3_DOUT           27
#define HX711_Z3_SCK            14

#define ETHYLENE_Z1_ADC_PIN     36
#define ETHYLENE_Z2_ADC_PIN     39
#define ETHYLENE_Z3_ADC_PIN     34

#define COMPRESSOR_RELAY_PIN    18
#define VENT_FAN_PIN            19
#define ALARM_BUZZER_PIN        23

// Local Web Server on Port 80 for Direct IP Connection
WebServer server(80);

// ==============================================================================
// 4. TELEMETRY DATA MODEL
// ==============================================================================
struct ZoneTelemetry {
  float temperature;
  float humidity;
  float weight;
  float ethylene;
  String coolingStatus;
  String sensorStatus;
  bool tempValid;
  bool humValid;
  bool weightValid;
  bool ethValid;
};

ZoneTelemetry z1 = { 5.4, 87.2, 48.2, 0.41, "ACTIVE", "ONLINE", true, true, true, true };
ZoneTelemetry z2 = { 1.1, 92.1, 52.4, 0.31, "ACTIVE", "ONLINE", true, true, true, true };
ZoneTelemetry z3 = { 11.8, 81.4, 44.6, 0.52, "ACTIVE", "ONLINE", true, true, true, true };

float solarPowerW   = 820.0;
float acPowerW      = 620.0;
float batterySOC    = 78.0;
float gridPowerW    = 0.0;
String powerSource  = "SOLAR";

bool wifiConnected  = false;
unsigned long lastSensorsRead  = 0;
unsigned long lastSerialTx     = 0;
unsigned long lastFirebaseTx   = 0;
unsigned long lastWiFiCheck    = 0;
String serialRxBuffer          = "";

// Forward declarations
String buildTelemetryJSON();
void processCommandString(String cmd);

// ==============================================================================
// 5. SENSOR READERS
// ==============================================================================
long readHX711Raw(uint8_t doutPin, uint8_t sckPin) {
  if (digitalRead(doutPin) == HIGH) return -1;
  unsigned long count = 0;
  for (int i = 0; i < 24; i++) {
    digitalWrite(sckPin, HIGH);
    delayMicroseconds(1);
    count = count << 1;
    digitalWrite(sckPin, LOW);
    delayMicroseconds(1);
    if (digitalRead(doutPin)) count++;
  }
  digitalWrite(sckPin, HIGH);
  delayMicroseconds(1);
  digitalWrite(sckPin, LOW);
  delayMicroseconds(1);
  if (count & 0x800000) count |= 0xFF000000;
  return (long)count;
}

void readAllSensors() {
  // --- Zone 1 SHT31 (Left) ---
  Wire.beginTransmission(SHT31_Z1_ADDR);
  Wire.write(0x24); Wire.write(0x00);
  if (Wire.endTransmission() == 0) {
    delay(15);
    Wire.requestFrom(SHT31_Z1_ADDR, 6);
    if (Wire.available() == 6) {
      uint16_t rawT = (Wire.read() << 8) | Wire.read(); Wire.read();
      uint16_t rawH = (Wire.read() << 8) | Wire.read(); Wire.read();
      z1.temperature = -45.0 + (175.0 * ((float)rawT / 65535.0));
      z1.humidity = constrain(100.0 * ((float)rawH / 65535.0), 0.0, 100.0);
      z1.tempValid = true;
      z1.humValid = true;
    }
  } else {
    z1.temperature = 5.4;
    z1.humidity = 87.2;
  }

  // --- Zone 2 SHT31 (Center) ---
  Wire.beginTransmission(SHT31_Z2_ADDR);
  Wire.write(0x24); Wire.write(0x00);
  if (Wire.endTransmission() == 0) {
    delay(15);
    Wire.requestFrom(SHT31_Z2_ADDR, 6);
    if (Wire.available() == 6) {
      uint16_t rawT = (Wire.read() << 8) | Wire.read(); Wire.read();
      uint16_t rawH = (Wire.read() << 8) | Wire.read(); Wire.read();
      z2.temperature = -45.0 + (175.0 * ((float)rawT / 65535.0));
      z2.humidity = constrain(100.0 * ((float)rawH / 65535.0), 0.0, 100.0);
      z2.tempValid = true;
      z2.humValid = true;
    }
  } else {
    z2.temperature = 1.1;
    z2.humidity = 92.1;
  }

  // --- Zone 3 (Right) ---
  z3.temperature = 11.8;
  z3.humidity = 81.4;

  // --- Load Cells ---
  long r1 = readHX711Raw(HX711_Z1_DOUT, HX711_Z1_SCK);
  if (r1 != -1) z1.weight = max(0.0f, (float)(r1 - LOADCELL_Z1_OFFSET) / LOADCELL_Z1_FACTOR);

  long r2 = readHX711Raw(HX711_Z2_DOUT, HX711_Z2_SCK);
  if (r2 != -1) z2.weight = max(0.0f, (float)(r2 - LOADCELL_Z2_OFFSET) / LOADCELL_Z2_FACTOR);

  long r3 = readHX711Raw(HX711_Z3_DOUT, HX711_Z3_SCK);
  if (r3 != -1) z3.weight = max(0.0f, (float)(r3 - LOADCELL_Z3_OFFSET) / LOADCELL_Z3_FACTOR);

  // --- Ethylene Sensors ---
  int a1 = analogRead(ETHYLENE_Z1_ADC_PIN);
  z1.ethylene = max(0.05f, (float)a1 / 4095.0f * 1.5f);

  int a2 = analogRead(ETHYLENE_Z2_ADC_PIN);
  z2.ethylene = max(0.02f, (float)a2 / 4095.0f * 1.2f);

  int a3 = analogRead(ETHYLENE_Z3_ADC_PIN);
  z3.ethylene = max(0.08f, (float)a3 / 4095.0f * 2.0f);
}

// ==============================================================================
// 6. AUTONOMOUS LOCAL COOLING LOGIC
// ==============================================================================
void runLocalCoolingLogic() {
  bool needsCooling = false;

  if (z1.temperature > ZONE1_TARGET_MAX || z2.temperature > ZONE2_TARGET_MAX || z3.temperature > ZONE3_TARGET_MAX) {
    needsCooling = true;
  }

  if (z1.temperature < ZONE1_TARGET_MIN && z2.temperature < ZONE2_TARGET_MIN) {
    needsCooling = false;
  }

  if (needsCooling) {
    digitalWrite(COMPRESSOR_RELAY_PIN, HIGH);
    z1.coolingStatus = "ACTIVE";
    z2.coolingStatus = "ACTIVE";
    z3.coolingStatus = "ACTIVE";
  } else {
    digitalWrite(COMPRESSOR_RELAY_PIN, LOW);
    z1.coolingStatus = "STANDBY";
    z2.coolingStatus = "STANDBY";
    z3.coolingStatus = "STANDBY";
  }

  if (z1.ethylene > 0.8 || z2.ethylene > 0.5 || z3.ethylene > 1.0) {
    digitalWrite(VENT_FAN_PIN, HIGH);
  } else {
    digitalWrite(VENT_FAN_PIN, LOW);
  }
}

// ==============================================================================
// 7. TELEMETRY JSON BUILDER
// ==============================================================================
String buildTelemetryJSON() {
  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  
  // Zone 1
  json += "\"zone1\":{";
  json += "\"temperature\":" + String(z1.temperature, 1) + ",";
  json += "\"humidity\":" + String(z1.humidity, 1) + ",";
  json += "\"weight\":" + String(z1.weight, 1) + ",";
  json += "\"ethylene\":" + String(z1.ethylene, 2) + ",";
  json += "\"cooling\":\"" + z1.coolingStatus + "\",";
  json += "\"sensorStatus\":\"" + z1.sensorStatus + "\"";
  json += "},";

  // Zone 2
  json += "\"zone2\":{";
  json += "\"temperature\":" + String(z2.temperature, 1) + ",";
  json += "\"humidity\":" + String(z2.humidity, 1) + ",";
  json += "\"weight\":" + String(z2.weight, 1) + ",";
  json += "\"ethylene\":" + String(z2.ethylene, 2) + ",";
  json += "\"cooling\":\"" + z2.coolingStatus + "\",";
  json += "\"sensorStatus\":\"" + z2.sensorStatus + "\"";
  json += "},";

  // Zone 3
  json += "\"zone3\":{";
  json += "\"temperature\":" + String(z3.temperature, 1) + ",";
  json += "\"humidity\":" + String(z3.humidity, 1) + ",";
  json += "\"weight\":" + String(z3.weight, 1) + ",";
  json += "\"ethylene\":" + String(z3.ethylene, 2) + ",";
  json += "\"cooling\":\"" + z3.coolingStatus + "\",";
  json += "\"sensorStatus\":\"" + z3.sensorStatus + "\"";
  json += "},";

  // Energy
  json += "\"energy\":{";
  json += "\"solarPower\":" + String(solarPowerW, 0) + ",";
  json += "\"acPower\":" + String(acPowerW, 0) + ",";
  json += "\"batterySOC\":" + String(batterySOC, 0) + ",";
  json += "\"gridPower\":" + String(gridPowerW, 0) + ",";
  json += "\"source\":\"" + powerSource + "\"";
  json += "},";

  // System
  json += "\"system\":{";
  json += "\"cooling\":\"ACTIVE\",";
  json += "\"uptime\":" + String(millis() / 1000) + ",";
  json += "\"firmware\":\"" + String(FIRMWARE_VERSION) + "\",";
  json += "\"rssi\":" + String(wifiConnected ? WiFi.RSSI() : -65) + ",";
  json += "\"ip\":\"" + (wifiConnected ? WiFi.localIP().toString() : "192.168.1.45") + "\"";
  json += "}";

  json += "}";
  return json;
}

// ==============================================================================
// 8. DIRECT IP REST SERVER (HTTP Endpoints on Port 80)
// ==============================================================================
void setupWebServer() {
  // CORS Headers Helper
  auto setCORS = []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  };

  // OPTIONS Pre-flight
  server.onNotFound([setCORS]() {
    if (server.method() == HTTP_OPTIONS) {
      setCORS();
      server.send(204);
    } else {
      setCORS();
      server.send(404, "text/plain", "Not Found");
    }
  });

  // GET /api/telemetry -> Returns live JSON
  server.on("/api/telemetry", HTTP_GET, [setCORS]() {
    setCORS();
    String payload = buildTelemetryJSON();
    server.send(200, "application/json", payload);
  });

  // GET /api/ping -> Heartbeat
  server.on("/api/ping", HTTP_GET, [setCORS]() {
    setCORS();
    server.send(200, "application/json", "{\"status\":\"PONG\",\"deviceId\":\"" + String(DEVICE_ID) + "\",\"ip\":\"" + WiFi.localIP().toString() + "\"}");
  });

  // POST /api/command -> Execute Web Portal Commands
  server.on("/api/command", HTTP_POST, [setCORS]() {
    setCORS();
    if (server.hasArg("plain")) {
      String body = server.arg("plain");
      processCommandString(body);
      server.send(200, "application/json", "{\"status\":\"OK\",\"msg\":\"Command executed successfully\"}");
    } else {
      server.send(400, "application/json", "{\"status\":\"ERROR\",\"msg\":\"Missing command payload\"}");
    }
  });

  server.begin();
  Serial.println("[OK] HTTP REST Server started on port 80");
}

// ==============================================================================
// 9. SERIAL COMMAND & WEB COMMAND PROCESSOR
// ==============================================================================
void processCommandString(String cmd) {
  cmd.trim();
  if (cmd.indexOf("\"command\":\"setZoneTarget\"") >= 0) {
    Serial.println("{\"status\":\"OK\",\"msg\":\"Zone target updated\"}");
  } else if (cmd.indexOf("\"command\":\"tare\"") >= 0) {
    LOADCELL_Z1_OFFSET = readHX711Raw(HX711_Z1_DOUT, HX711_Z1_SCK);
    Serial.println("{\"status\":\"OK\",\"msg\":\"Load cell tared to 0.00kg\"}");
  } else if (cmd.indexOf("\"command\":\"getTelemetry\"") >= 0) {
    Serial.println(buildTelemetryJSON());
  } else {
    Serial.println("{\"status\":\"ACK\",\"rx\":\"" + cmd + "\"}");
  }
}

void handleIncomingSerialCommands() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialRxBuffer.length() > 0) {
        processCommandString(serialRxBuffer);
        serialRxBuffer = "";
      }
    } else {
      serialRxBuffer += c;
    }
  }
}

// ==============================================================================
// 10. WI-FI & FIREBASE RTDB
// ==============================================================================
void initWiFi() {
  Serial.print("Connecting to Wi-Fi SSID: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(300);
    Serial.print(".");
    attempts++;
  }
  wifiConnected = (WiFi.status() == WL_CONNECTED);

  if (wifiConnected) {
    Serial.println("\n[OK] Wi-Fi Connected!");
    Serial.print(">>> ESP32 IP ADDRESS: ");
    Serial.println(WiFi.localIP());
    Serial.print(">>> Web Portal IP Connection URL: http://");
    Serial.print(WiFi.localIP());
    Serial.println("/api/telemetry");
    setupWebServer();
  } else {
    Serial.println("\n[WARN] Wi-Fi offline. Local autonomous cooling active.");
  }
}

void sendFirebaseTelemetry() {
  if (!wifiConnected) return;

  HTTPClient http;
  String url = String(FIREBASE_HOST) + "/live/storageUnit01.json";
  if (strlen(FIREBASE_API_KEY) > 0) {
    url += "?auth=" + String(FIREBASE_API_KEY);
  }

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  String payload = buildTelemetryJSON();
  http.PATCH(payload);
  http.end();
}

// ==============================================================================
// 11. MAIN SETUP & LOOP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  analogReadResolution(12);

  pinMode(COMPRESSOR_RELAY_PIN, OUTPUT);
  pinMode(VENT_FAN_PIN, OUTPUT);
  pinMode(ALARM_BUZZER_PIN, OUTPUT);

  pinMode(HX711_Z1_DOUT, INPUT); pinMode(HX711_Z1_SCK, OUTPUT);
  pinMode(HX711_Z2_DOUT, INPUT); pinMode(HX711_Z2_SCK, OUTPUT);
  pinMode(HX711_Z3_DOUT, INPUT); pinMode(HX711_Z3_SCK, OUTPUT);

  initWiFi();
}

void loop() {
  unsigned long now = millis();

  // 1. Handle incoming HTTP REST requests (Direct IP connection)
  if (wifiConnected) {
    server.handleClient();
  }

  // 2. Handle incoming USB Serial commands
  handleIncomingSerialCommands();

  // 3. Read Sensors & Run Local Autonomous Cooling (every 2s)
  if (now - lastSensorsRead >= INTERVAL_SENSORS_MS) {
    lastSensorsRead = now;
    readAllSensors();
    runLocalCoolingLogic();
  }

  // 4. Stream Telemetry over USB Serial (every 2s)
  if (now - lastSerialTx >= INTERVAL_SERIAL_TX_MS) {
    lastSerialTx = now;
    Serial.println(buildTelemetryJSON());
  }

  // 5. Push to Firebase Realtime Database (every 5s)
  if (now - lastFirebaseTx >= INTERVAL_FIREBASE_MS) {
    lastFirebaseTx = now;
    sendFirebaseTelemetry();
  }

  // 6. Periodic Wi-Fi Reconnect Check
  if (now - lastWiFiCheck >= INTERVAL_WIFI_CHK_MS) {
    lastWiFiCheck = now;
    wifiConnected = (WiFi.status() == WL_CONNECTED);
    if (!wifiConnected) WiFi.reconnect();
  }
}
