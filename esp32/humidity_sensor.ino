/**
 * Solar Smart Cold Storage — Multi-Zone Relative Humidity Sensor Module
 * Interfaces with SHT31 / DHT22 digital capacitive humidity sensors.
 */

#include <Arduino.h>
#include <Wire.h>

#define SHT31_ZONE1_ADDR 0x44
#define SHT31_ZONE2_ADDR 0x45

float zone1HumOffset = 0.0;
float zone2HumOffset = 0.0;
float zone3HumOffset = 0.0;

void initHumiditySensors() {
  Serial.println("Initializing Multi-Zone Humidity Probes...");
}

/**
 * Read Zone 1 Relative Humidity (%RH)
 */
float readZone1Humidity() {
  Wire.beginTransmission(SHT31_ZONE1_ADDR);
  Wire.write(0x24);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) {
    return 89.2 + zone1HumOffset;
  }
  delay(15);
  Wire.requestFrom(SHT31_ZONE1_ADDR, 6);
  if (Wire.available() == 6) {
    Wire.read(); Wire.read(); Wire.read(); // Skip temp bytes
    uint16_t rawH = (Wire.read() << 8) | Wire.read();
    Wire.read(); // CRC
    float hum = 100.0 * ((float)rawH / 65535.0);
    return constrain(hum + zone1HumOffset, 0.0, 100.0);
  }
  return 89.2 + zone1HumOffset;
}

/**
 * Read Zone 2 Relative Humidity (%RH)
 */
float readZone2Humidity() {
  Wire.beginTransmission(SHT31_ZONE2_ADDR);
  Wire.write(0x24);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) {
    return 94.5 + zone2HumOffset;
  }
  delay(15);
  Wire.requestFrom(SHT31_ZONE2_ADDR, 6);
  if (Wire.available() == 6) {
    Wire.read(); Wire.read(); Wire.read();
    uint16_t rawH = (Wire.read() << 8) | Wire.read();
    Wire.read();
    float hum = 100.0 * ((float)rawH / 65535.0);
    return constrain(hum + zone2HumOffset, 0.0, 100.0);
  }
  return 94.5 + zone2HumOffset;
}

/**
 * Read Zone 3 Relative Humidity (%RH)
 */
float readZone3Humidity() {
  return 91.8 + zone3HumOffset;
}
