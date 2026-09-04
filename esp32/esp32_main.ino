/**
 * ==============================================================================
 * SOLAR SMART COLD STORAGE — ESP32 MULTI-ZONE MASTER FIRMWARE
 * ==============================================================================
 * Hardware: ESP32-WROOM-32 / ESP32-S3
 * Architecture: FreeRTOS Multi-Tasking IoT Sensor Controller
 * Zones Monitored:
 *   - Zone 1 (10–13°C): Tropical Vegetables (Tomatoes, Chillies, Potatoes)
 *   - Zone 2 (0–2°C): Deep Chill (Apples, Carrots, Leafy Greens)
 *   - Zone 3 (0–8°C): Temperate / Mixed Legumes (Beans, Cucumbers)
 * Sensors per Zone:
 *   - Temperature & Humidity (SHT31 / DS18B20 / DHT22 via I2C & OneWire)
 *   - Mass Transpiration Load Cell (HX711 24-bit ADC with Digital Filtering)
 *   - Electrochemical Ethylene Gas Probe (ADC / UART / I2C / RS485 Modbus)
 * ==============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <EEPROM.h>

// Firmware metadata
#define FIRMWARE_VERSION "v2.4.8-RELEASE"
#define DEVICE_ID "ESP32-COLD-MASTER-01"
#define STORAGE_UNIT_ID "COLD-ROOM-ALPHA"

// Timing Intervals (Milliseconds)
#define SENSOR_READ_INTERVAL_MS   2000   // Sample sensors every 2 seconds
#define TELEMETRY_SEND_INTERVAL_MS 5000   // Upload telemetry to Firebase every 5s
#define HEARTBEAT_INTERVAL_MS     10000  // Device status heartbeat
#define LOCAL_SAFETY_INTERVAL_MS  1000   // Local refrigeration safety checks

// FreeRTOS Task Handles
TaskHandle_t TaskSensorAcquisition;
TaskHandle_t TaskTelemetryUpload;
TaskHandle_t TaskLocalSafety;

// Global System State Flags
volatile bool wifiConnected = false;
volatile bool firebaseReady = false;
volatile bool emergencyCoolingActive = false;

// Function Prototypes
void initWiFi();
void checkWiFiConnection();
void initFirebase();
void initTemperatureSensors();
void initHumiditySensors();
void initLoadCells();
void initEthyleneSensors();
void initRS485Modbus();
void updateZoneSensors();
void transmitTelemetry();
void runLocalSafetySafeguard();

// FreeRTOS Task Implementations
void TaskSensorCode(void *pvParameters) {
  for (;;) {
    updateZoneSensors();
    vTaskDelay(pdMS_TO_TICKS(SENSOR_READ_INTERVAL_MS));
  }
}

void TaskTelemetryCode(void *pvParameters) {
  for (;;) {
    checkWiFiConnection();
    if (wifiConnected) {
      transmitTelemetry();
    }
    vTaskDelay(pdMS_TO_TICKS(TELEMETRY_SEND_INTERVAL_MS));
  }
}

void TaskSafetyCode(void *pvParameters) {
  for (;;) {
    runLocalSafetySafeguard();
    vTaskDelay(pdMS_TO_TICKS(LOCAL_SAFETY_INTERVAL_MS));
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=======================================================");
  Serial.println("  SOLAR SMART COLD STORAGE — ESP32 FIRMWARE BOOTSTRAP  ");
  Serial.printf ("  Device ID: %s | Firmware: %s\n", DEVICE_ID, FIRMWARE_VERSION);
  Serial.println("=======================================================");

  // Initialize I2C Bus for digital environmental sensors
  Wire.begin(21, 22); // SDA=GPIO21, SCL=GPIO22
  Wire.setClock(100000);

  // Initialize Non-Volatile EEPROM for calibration factors
  EEPROM.begin(512);

  // Initialize modular sensor sub-systems
  initTemperatureSensors();
  initHumiditySensors();
  initLoadCells();
  initEthyleneSensors();
  initRS485Modbus();

  // Initialize WiFi & Firebase
  initWiFi();
  initFirebase();

  // Create FreeRTOS pinned tasks across Dual-Core ESP32
  // Core 0: Wireless & Firebase Telemetry
  xTaskCreatePinnedToCore(TaskTelemetryCode, "TaskTelemetry", 8192, NULL, 1, &TaskTelemetryUpload, 0);

  // Core 1: Precision Sensor Acquisition & Real-Time Safety Control Loop
  xTaskCreatePinnedToCore(TaskSensorCode, "TaskSensors", 8192, NULL, 2, &TaskSensorAcquisition, 1);
  xTaskCreatePinnedToCore(TaskSafetyCode, "TaskSafety", 4096, NULL, 3, &TaskLocalSafety, 1);

  Serial.println("✅ All FreeRTOS system tasks initialized successfully.");
}

void loop() {
  // FreeRTOS handles task scheduling; main loop remains dormant
  vTaskDelay(pdMS_TO_TICKS(1000));
}
