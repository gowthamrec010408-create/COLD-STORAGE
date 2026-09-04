/**
 * Solar Smart Cold Storage — Multi-Zone Coordination Manager
 * Aggregates all independent sensor readings for Zone 1, Zone 2, and Zone 3.
 */

#include <Arduino.h>

struct ZoneTelemetryData {
  uint8_t zoneId;
  float temperature;
  float humidity;
  float weight;
  float initialWeight;
  float weightLoss;
  float weightLossPercent;
  float ethylene;
  float ethyleneTrend;
  String tempStatus;
  String sensorHealth;
};

// Global active zone models
ZoneTelemetryData zone1Data = { 1, 11.8, 89.2, 115.4, 120.0, 4.6, 3.83, 0.42, 4.5, "NORMAL", "HEALTHY" };
ZoneTelemetryData zone2Data = { 2, 1.2, 94.5, 246.2, 250.0, 3.8, 1.52, 0.18, 1.2, "NORMAL", "HEALTHY" };
ZoneTelemetryData zone3Data = { 3, 5.4, 91.8, 75.8, 80.0, 4.2, 5.25, 0.63, 18.4, "NORMAL", "HEALTHY" };

float previousEthyleneZ1 = 0.40;
float previousEthyleneZ2 = 0.17;
float previousEthyleneZ3 = 0.53;

/**
 * Execute periodic sampling loop for all three zones
 */
void updateZoneSensors() {
  // 1. Zone 1 Acquisition (10-13°C)
  zone1Data.temperature = readZone1Temperature();
  zone1Data.humidity = readZone1Humidity();
  zone1Data.weight = readZone1Weight();
  zone1Data.ethylene = readZone1Ethylene();
  zone1Data.weightLoss = max(0.0f, zone1Data.initialWeight - zone1Data.weight);
  zone1Data.weightLossPercent = (zone1Data.weightLoss / zone1Data.initialWeight) * 100.0f;
  zone1Data.ethyleneTrend = ((zone1Data.ethylene - previousEthyleneZ1) / previousEthyleneZ1) * 100.0f;
  previousEthyleneZ1 = zone1Data.ethylene;

  if (zone1Data.temperature < 8.0 || zone1Data.temperature > 15.0) {
    zone1Data.tempStatus = "CRITICAL";
  } else if (zone1Data.temperature < 10.0 || zone1Data.temperature > 13.0) {
    zone1Data.tempStatus = "WARNING";
  } else {
    zone1Data.tempStatus = "NORMAL";
  }

  // 2. Zone 2 Acquisition (0-2°C)
  zone2Data.temperature = readZone2Temperature();
  zone2Data.humidity = readZone2Humidity();
  zone2Data.weight = readZone2Weight();
  zone2Data.ethylene = readZone2Ethylene();
  zone2Data.weightLoss = max(0.0f, zone2Data.initialWeight - zone2Data.weight);
  zone2Data.weightLossPercent = (zone2Data.weightLoss / zone2Data.initialWeight) * 100.0f;
  zone2Data.ethyleneTrend = ((zone2Data.ethylene - previousEthyleneZ2) / previousEthyleneZ2) * 100.0f;
  previousEthyleneZ2 = zone2Data.ethylene;

  if (zone2Data.temperature < -1.0 || zone2Data.temperature > 3.5) {
    zone2Data.tempStatus = "CRITICAL";
  } else if (zone2Data.temperature < 0.0 || zone2Data.temperature > 2.0) {
    zone2Data.tempStatus = "WARNING";
  } else {
    zone2Data.tempStatus = "NORMAL";
  }

  // 3. Zone 3 Acquisition (0-8°C)
  zone3Data.temperature = readZone3Temperature();
  zone3Data.humidity = readZone3Humidity();
  zone3Data.weight = readZone3Weight();
  zone3Data.ethylene = readZone3Ethylene();
  zone3Data.weightLoss = max(0.0f, zone3Data.initialWeight - zone3Data.weight);
  zone3Data.weightLossPercent = (zone3Data.weightLoss / zone3Data.initialWeight) * 100.0f;
  zone3Data.ethyleneTrend = ((zone3Data.ethylene - previousEthyleneZ3) / previousEthyleneZ3) * 100.0f;
  previousEthyleneZ3 = zone3Data.ethylene;

  if (zone3Data.temperature < 0.0 || zone3Data.temperature > 9.5) {
    zone3Data.tempStatus = "CRITICAL";
  } else if (zone3Data.temperature < 4.0 || zone3Data.temperature > 7.5) {
    zone3Data.tempStatus = "WARNING";
  } else {
    zone3Data.tempStatus = "NORMAL";
  }
}
