/**
 * Solar Smart Cold Storage — Edge Safety & Fallback Control Loop
 * Autonomous local controller safeguard. Operates independently of WiFi/Cloud.
 * "The cloud/dashboard must never be the only safety mechanism for the physical system."
 */

#include <Arduino.h>

#define COMPRESSOR_RELAY_PIN 18
#define VENTILATION_FAN_PIN  19
#define LOCAL_BUZZER_PIN     23

void initPredictionSupport() {
  pinMode(COMPRESSOR_RELAY_PIN, OUTPUT);
  pinMode(VENTILATION_FAN_PIN, OUTPUT);
  pinMode(LOCAL_BUZZER_PIN, OUTPUT);

  digitalWrite(COMPRESSOR_RELAY_PIN, LOW);
  digitalWrite(VENTILATION_FAN_PIN, LOW);
  digitalWrite(LOCAL_BUZZER_PIN, LOW);
}

/**
 * Autonomous local safety controller evaluated every 1000ms
 */
void runLocalSafetySafeguard() {
  // Autonomous Temperature Safeguard:
  // If Zone 1 > 14.5°C or Zone 2 > 3.5°C or Zone 3 > 9.0°C, force compressor ON
  if (zone1Data.temperature > 14.5 || zone2Data.temperature > 3.5 || zone3Data.temperature > 9.0) {
    digitalWrite(COMPRESSOR_RELAY_PIN, HIGH); // Engage cooling relay
    emergencyCoolingActive = true;
  } else if (zone1Data.temperature < 10.0 && zone2Data.temperature < 0.2) {
    digitalWrite(COMPRESSOR_RELAY_PIN, LOW); // Prevent chilling injury / frost
    emergencyCoolingActive = false;
  }

  // Autonomous Ethylene Gas Ventilation Safeguard:
  // If any zone ethylene gas exceeds 1.20 ppm, engage ventilation fans locally
  if (zone1Data.ethylene > 1.20 || zone2Data.ethylene > 0.80 || zone3Data.ethylene > 1.00) {
    digitalWrite(VENTILATION_FAN_PIN, HIGH);
    // Beep buzzer briefly to alert farm workers in the facility
    tone(LOCAL_BUZZER_PIN, 1200, 150);
  } else {
    digitalWrite(VENTILATION_FAN_PIN, LOW);
  }
}
