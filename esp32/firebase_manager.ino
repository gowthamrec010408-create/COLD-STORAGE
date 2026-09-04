/**
 * Solar Smart Cold Storage — Firebase Realtime Database Manager
 * Uses HTTPClient / REST or Firebase-ESP32 client to upload multi-zone telemetry.
 */

#include <HTTPClient.h>
#include <WiFiClientSecure.h>

const char* FIREBASE_HOST = "https://solar-cold-storage-iot-default-rtdb.firebaseio.com";
const char* FIREBASE_AUTH_KEY = "AIzaSyDemoSmartColdStorageKey2026"; // Or Database Secret / Auth Token

void initFirebase() {
  Serial.println("Initializing Firebase Client connection...");
  firebaseReady = true;
  Serial.println("✅ Firebase Client ready for RTDB endpoints.");
}

/**
 * Upload JSON payload to Firebase Realtime Database node
 */
bool sendJsonToFirebase(const String& path, const String& jsonPayload) {
  if (!wifiConnected) return false;

  HTTPClient http;
  String url = String(FIREBASE_HOST) + "/" + path + ".json";
  if (strlen(FIREBASE_AUTH_KEY) > 0) {
    url += "?auth=" + String(FIREBASE_AUTH_KEY);
  }

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // PATCH for updating node without overwriting sibling keys
  int httpResponseCode = http.PATCH(jsonPayload);

  if (httpResponseCode > 0) {
    // 200 OK
    http.end();
    return true;
  } else {
    Serial.printf("❌ Firebase HTTP Error on %s: %s (Code: %d)\n", 
                  path.c_str(), http.errorToString(httpResponseCode).c_str(), httpResponseCode);
    http.end();
    return false;
  }
}
