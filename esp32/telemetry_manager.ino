/**
 * Solar Smart Cold Storage — Telemetry Packaging & Firebase Dispatcher
 * Serializes multi-zone sensor records into clean JSON objects for Firebase RTDB.
 */

#include <Arduino.h>

extern bool sendJsonToFirebase(const String& path, const String& jsonPayload);
extern ZoneTelemetryData zone1Data;
extern ZoneTelemetryData zone2Data;
extern ZoneTelemetryData zone3Data;
extern int getWiFiRSSI();

void transmitTelemetry() {
  unsigned long timestamp = millis();

  // 1. Package Zone 1 JSON Payload
  String z1Json = "{";
  z1Json += "\"zoneId\":1,";
  z1Json += "\"temperature\":" + String(zone1Data.temperature, 1) + ",";
  z1Json += "\"humidity\":" + String(zone1Data.humidity, 1) + ",";
  z1Json += "\"weight\":" + String(zone1Data.weight, 1) + ",";
  z1Json += "\"initialWeight\":" + String(zone1Data.initialWeight, 1) + ",";
  z1Json += "\"weightLoss\":" + String(zone1Data.weightLoss, 2) + ",";
  z1Json += "\"weightLossPercent\":" + String(zone1Data.weightLossPercent, 2) + ",";
  z1Json += "\"ethylene\":" + String(zone1Data.ethylene, 3) + ",";
  z1Json += "\"ethyleneTrend\":" + String(zone1Data.ethyleneTrend, 1) + ",";
  z1Json += "\"tempStatus\":\"" + zone1Data.tempStatus + "\",";
  z1Json += "\"timestamp\":" + String(timestamp);
  z1Json += "}";

  sendJsonToFirebase("zones/1", z1Json);

  // 2. Package Zone 2 JSON Payload
  String z2Json = "{";
  z2Json += "\"zoneId\":2,";
  z2Json += "\"temperature\":" + String(zone2Data.temperature, 1) + ",";
  z2Json += "\"humidity\":" + String(zone2Data.humidity, 1) + ",";
  z2Json += "\"weight\":" + String(zone2Data.weight, 1) + ",";
  z2Json += "\"initialWeight\":" + String(zone2Data.initialWeight, 1) + ",";
  z2Json += "\"weightLoss\":" + String(zone2Data.weightLoss, 2) + ",";
  z2Json += "\"weightLossPercent\":" + String(zone2Data.weightLossPercent, 2) + ",";
  z2Json += "\"ethylene\":" + String(zone2Data.ethylene, 3) + ",";
  z2Json += "\"ethyleneTrend\":" + String(zone2Data.ethyleneTrend, 1) + ",";
  z2Json += "\"tempStatus\":\"" + zone2Data.tempStatus + "\",";
  z2Json += "\"timestamp\":" + String(timestamp);
  z2Json += "}";

  sendJsonToFirebase("zones/2", z2Json);

  // 3. Package Zone 3 JSON Payload
  String z3Json = "{";
  z3Json += "\"zoneId\":3,";
  z3Json += "\"temperature\":" + String(zone3Data.temperature, 1) + ",";
  z3Json += "\"humidity\":" + String(zone3Data.humidity, 1) + ",";
  z3Json += "\"weight\":" + String(zone3Data.weight, 1) + ",";
  z3Json += "\"initialWeight\":" + String(zone3Data.initialWeight, 1) + ",";
  z3Json += "\"weightLoss\":" + String(zone3Data.weightLoss, 2) + ",";
  z3Json += "\"weightLossPercent\":" + String(zone3Data.weightLossPercent, 2) + ",";
  z3Json += "\"ethylene\":" + String(zone3Data.ethylene, 3) + ",";
  z3Json += "\"ethyleneTrend\":" + String(zone3Data.ethyleneTrend, 1) + ",";
  z3Json += "\"tempStatus\":\"" + zone3Data.tempStatus + "\",";
  z3Json += "\"timestamp\":" + String(timestamp);
  z3Json += "}";

  sendJsonToFirebase("zones/3", z3Json);

  // 4. Device Heartbeat & Diagnostics
  String devJson = "{";
  devJson += "\"online\":true,";
  devJson += "\"wifiRssi\":" + String(getWiFiRSSI()) + ",";
  devJson += "\"freeHeapBytes\":" + String(ESP.getFreeHeap()) + ",";
  devJson += "\"firmwareVersion\":\"" + String(FIRMWARE_VERSION) + "\",";
  devJson += "\"lastSeen\":" + String(timestamp);
  devJson += "}";

  sendJsonToFirebase("devices/ESP32-COLD-MASTER-01", devJson);
}
