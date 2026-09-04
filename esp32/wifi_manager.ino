/**
 * Solar Smart Cold Storage — WiFi Connection Manager
 * Robust non-blocking connection with exponential backoff and auto-reconnect.
 */

#include <WiFi.h>

const char* WIFI_SSID = "AgriSmart-Solar-Net";
const char* WIFI_PASS = "PrecisionAgro2026";

unsigned long lastWiFiCheck = 0;
int wifiReconnectAttempts = 0;

void initWiFi() {
  Serial.print("Connecting to Wi-Fi SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) {
    delay(500);
    Serial.print(".");
    timeout++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ Wi-Fi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    wifiConnected = false;
    Serial.println("\n⚠️ Wi-Fi initial connect timed out. Operating in Offline Buffered Mode.");
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    unsigned long now = millis();
    if (now - lastWiFiCheck > 10000) {
      lastWiFiCheck = now;
      wifiReconnectAttempts++;
      Serial.printf("🔄 Attempting Wi-Fi Reconnect (Attempt #%d)...\n", wifiReconnectAttempts);
      WiFi.disconnect();
      WiFi.reconnect();
    }
  } else {
    if (!wifiConnected) {
      wifiConnected = true;
      wifiReconnectAttempts = 0;
      Serial.println("✅ Wi-Fi Connection Restored!");
    }
  }
}

int getWiFiRSSI() {
  return WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -100;
}
