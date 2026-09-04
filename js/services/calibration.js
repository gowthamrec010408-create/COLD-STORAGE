/**
 * Solar Smart Cold Storage — Sensor Calibration Service
 * Provides HX711 Load Cell Tare, 2-point weight calibration,
 * electrochemical ethylene baseline zeroing, and temperature offset adjustments.
 */

import { store } from '../core/state.js';

export class SensorCalibrationService {
  /**
   * Perform Zero Tare for a Load Cell
   * @param {string} sensorId - e.g. 'loadcell-z1'
   * @param {number} rawAdcReading - current raw digital reading from HX711
   */
  tareLoadCell(sensorId, rawAdcReading = null) {
    const registry = store.get('calibration');
    const sensor = registry[sensorId];
    if (!sensor) throw new Error(`Sensor ${sensorId} not found.`);

    // Simulated or supplied raw ADC reading
    const simulatedRaw = rawAdcReading || (80000 + Math.round((Math.random() - 0.5) * 4000));

    const updated = {
      ...sensor,
      zeroOffset: simulatedRaw,
      lastCalibrated: new Date().toISOString().split('T')[0],
      status: 'CALIBRATED'
    };

    store.set(`calibration.${sensorId}`, updated);
    return updated;
  }

  /**
   * 2-Point Calibration with Known Reference Weight
   * @param {string} sensorId - e.g. 'loadcell-z1'
   * @param {number} knownWeightKg - Reference weight placed on scale in kg (e.g. 20.0 kg)
   * @param {number} rawLoadedAdc - Raw reading with weight placed
   */
  calibrateWithKnownWeight(sensorId, knownWeightKg, rawLoadedAdc = null) {
    const registry = store.get('calibration');
    const sensor = registry[sensorId];
    if (!sensor) throw new Error(`Sensor ${sensorId} not found.`);
    if (!knownWeightKg || knownWeightKg <= 0) throw new Error('Reference weight must be greater than zero.');

    const zeroOffset = sensor.zeroOffset || 80000;
    const loadedRaw = rawLoadedAdc || (zeroOffset + (knownWeightKg * 420));
    const deltaAdc = loadedRaw - zeroOffset;

    // Calibration factor = (Raw Loaded - Zero Offset) / Known Weight
    const newFactor = Number((deltaAdc / knownWeightKg).toFixed(2));

    const updated = {
      ...sensor,
      factor: newFactor,
      lastCalibrated: new Date().toISOString().split('T')[0],
      status: 'CALIBRATED'
    };

    store.set(`calibration.${sensorId}`, updated);
    return updated;
  }

  /**
   * Zero Clean-Air Baseline for Ethylene Gas Sensor
   * @param {string} sensorId - e.g. 'ethylene-z1'
   */
  zeroEthyleneSensor(sensorId) {
    const registry = store.get('calibration');
    const sensor = registry[sensorId];
    if (!sensor) throw new Error(`Sensor ${sensorId} not found.`);

    const updated = {
      ...sensor,
      zeroOffset: 0.00,
      lastCalibrated: new Date().toISOString().split('T')[0],
      status: 'CALIBRATED'
    };

    store.set(`calibration.${sensorId}`, updated);
    return updated;
  }

  /**
   * Update manual calibration parameters
   */
  saveSensorParams(sensorId, params) {
    const registry = store.get('calibration');
    const sensor = registry[sensorId];
    if (!sensor) throw new Error(`Sensor ${sensorId} not found.`);

    const updated = {
      ...sensor,
      ...params,
      lastCalibrated: new Date().toISOString().split('T')[0],
      status: 'CALIBRATED'
    };

    store.set(`calibration.${sensorId}`, updated);
    return updated;
  }

  /**
   * Reset sensor calibration to factory defaults
   */
  resetToFactory(sensorId) {
    const registry = store.get('calibration');
    const sensor = registry[sensorId];
    if (!sensor) throw new Error(`Sensor ${sensorId} not found.`);

    let defaultOffset = 0;
    let defaultFactor = 1.0;

    if (sensorId.startsWith('loadcell')) {
      defaultOffset = 80000;
      defaultFactor = 420.0;
    } else if (sensorId.startsWith('ethylene')) {
      defaultOffset = 0.02;
      defaultFactor = 1.00;
    }

    const updated = {
      ...sensor,
      zeroOffset: defaultOffset,
      factor: defaultFactor,
      lastCalibrated: 'FACTORY',
      status: 'FACTORY'
    };

    store.set(`calibration.${sensorId}`, updated);
    return updated;
  }
}

export const calibrationService = new SensorCalibrationService();
