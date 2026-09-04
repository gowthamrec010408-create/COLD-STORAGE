/**
 * Solar Smart Cold Storage — Sensor Calibration Service
 * Provides HX711 Load Cell Tare, 2-point weight calibration,
 * electrochemical ethylene baseline zeroing, and temperature offset adjustments
 * with persistent Cloud Firestore & LocalStorage synchronization.
 */

import { store } from '../core/state.js';
import { firebaseService } from './firebase-service.js';

export class SensorCalibrationService {
  /**
   * Load calibrations from Cloud Firestore on startup
   */
  async init() {
    try {
      await firebaseService.getSensorCalibrations();
    } catch (e) {
      console.warn('Calibration init warning:', e);
    }
  }

  /**
   * Perform Zero Tare for a Load Cell
   * @param {string} sensorId - e.g. 'loadcell-z1'
   * @param {number} rawAdcReading - current raw digital reading from HX711
   */
  async tareLoadCell(sensorId, rawAdcReading = null) {
    const registry = store.get('calibration') || {};
    const sensor = registry[sensorId] || { id: sensorId, zone: 1, type: 'Load Cell (HX711)', unit: 'kg' };

    // Simulated or supplied raw ADC reading
    const simulatedRaw = rawAdcReading || (80000 + Math.round((Math.random() - 0.5) * 4000));

    const updated = {
      ...sensor,
      zeroOffset: simulatedRaw,
      lastCalibrated: new Date().toISOString().split('T')[0],
      status: 'CALIBRATED'
    };

    await firebaseService.saveSensorCalibration(sensorId, updated);
    return updated;
  }

  /**
   * 2-Point Calibration with Known Reference Weight
   * @param {string} sensorId - e.g. 'loadcell-z1'
   * @param {number} knownWeightKg - Reference weight placed on scale in kg (e.g. 20.0 kg)
   * @param {number} rawLoadedAdc - Raw reading with weight placed
   */
  async calibrateWithKnownWeight(sensorId, knownWeightKg, rawLoadedAdc = null) {
    const registry = store.get('calibration') || {};
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

    await firebaseService.saveSensorCalibration(sensorId, updated);
    return updated;
  }

  /**
   * Zero Clean-Air Baseline for Ethylene Gas Sensor
   * @param {string} sensorId - e.g. 'ethylene-z1'
   */
  async zeroEthyleneSensor(sensorId) {
    const registry = store.get('calibration') || {};
    const sensor = registry[sensorId];
    if (!sensor) throw new Error(`Sensor ${sensorId} not found.`);

    const updated = {
      ...sensor,
      zeroOffset: 0.00,
      lastCalibrated: new Date().toISOString().split('T')[0],
      status: 'CALIBRATED'
    };

    await firebaseService.saveSensorCalibration(sensorId, updated);
    return updated;
  }

  /**
   * Update manual calibration parameters
   */
  async saveSensorParams(sensorId, params) {
    const registry = store.get('calibration') || {};
    const sensor = registry[sensorId] || { id: sensorId, zone: 1, unit: 'kg' };

    const updated = {
      ...sensor,
      ...params,
      lastCalibrated: new Date().toISOString().split('T')[0],
      status: 'CALIBRATED'
    };

    await firebaseService.saveSensorCalibration(sensorId, updated);
    return updated;
  }

  /**
   * Reset sensor calibration to factory defaults
   */
  async resetToFactory(sensorId) {
    const registry = store.get('calibration') || {};
    const sensor = registry[sensorId] || { id: sensorId };

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

    await firebaseService.saveSensorCalibration(sensorId, updated);
    return updated;
  }
}

export const calibrationService = new SensorCalibrationService();
