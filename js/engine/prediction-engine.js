/**
 * QORA TECH — AI Spoilage & Freshness Prediction Engine
 * Biological Rule-Based & Multi-Factorial Weighted Scoring Engine
 * 
 * Configurable Dimension Weights:
 * - Temperature Condition: 25%
 * - Humidity Condition:    15%
 * - Weight Loss:           20%
 * - Ethylene Gas:          25%
 * - Storage Duration:      15%
 * 
 * Produces: Freshness Score, Spoilage Risk, Estimated Shelf Life, Quality Trend,
 * Recommended Action, and "Why is the risk high?" factor explainability matrix.
 * Labeled: AI-ASSISTED ESTIMATE.
 */

import { DEFAULT_PRODUCE_PROFILES, ZONE_SPECS } from '../config/produce-profiles.js';

export class SpoilagePredictionEngine {
  constructor(customProfiles = {}) {
    this.profiles = { ...DEFAULT_PRODUCE_PROFILES, ...customProfiles };
  }

  getProfile(cropNameOrId) {
    const key = (cropNameOrId || '').toLowerCase().trim();
    if (this.profiles[key]) return this.profiles[key];

    const found = Object.values(this.profiles).find(p => 
      p.id.toLowerCase() === key ||
      p.name.toLowerCase() === key ||
      (p.varieties && p.varieties.some(v => v.toLowerCase() === key))
    );
    if (found) return found;

    return DEFAULT_PRODUCE_PROFILES['tomato'];
  }

  predict(input) {
    const profile = this.getProfile(input.produceType || input.cropId);
    const zoneSpec = ZONE_SPECS[input.zone] || ZONE_SPECS[1];

    const initialWeight = Math.max(0.1, Number(input.initialWeight) || 100);
    const currentWeight = Math.min(initialWeight * 1.05, Math.max(0, Number(input.currentWeight) || initialWeight));
    const weightLoss = Math.max(0, initialWeight - currentWeight);
    const weightLossPercent = (weightLoss / initialWeight) * 100;

    const temp = Number(input.currentTemp);
    const humidity = Number(input.currentHumidity);
    const ethylene = Math.max(0, Number(input.ethylene) || 0);
    const ethyleneTrend = Number(input.ethyleneTrendRate) || 0;
    const durationDays = Math.max(0.1, Number(input.storageDurationDays) || 1);

    // 1. Temperature Deviation & Stress (Weight: 25%)
    let thermalPenalty = 0;
    let tempDeviation = 0;
    let tempStatus = 'NORMAL';

    if (temp < profile.tempMin) {
      tempDeviation = profile.tempMin - temp;
      thermalPenalty = Math.min(100, tempDeviation * 14);
      tempStatus = tempDeviation > 3 ? 'CRITICAL_COLD' : 'WARNING_COLD';
    } else if (temp > profile.tempMax) {
      tempDeviation = temp - profile.tempMax;
      thermalPenalty = Math.min(100, tempDeviation * 14);
      tempStatus = tempDeviation > 3 ? 'CRITICAL_HOT' : 'WARNING_HOT';
    }

    // 2. Humidity Deviation & Stress (Weight: 15%)
    let humidityPenalty = 0;
    let humDeviation = 0;
    let humidityStatus = 'NORMAL';

    if (humidity < profile.humidityMin) {
      humDeviation = profile.humidityMin - humidity;
      humidityPenalty = Math.min(100, humDeviation * 2.2);
      humidityStatus = humDeviation > 12 ? 'CRITICAL_DRY' : 'WARNING_DRY';
    } else if (humidity > profile.humidityMax + 2) {
      humDeviation = humidity - profile.humidityMax;
      humidityPenalty = Math.min(100, humDeviation * 2.0);
      humidityStatus = 'WARNING_SATURATED';
    }

    // 3. Weight Loss & Transpiration (Weight: 20%)
    let weightPenalty = 0;
    let weightLossRisk = 'LOW';
    const maxLoss = profile.maxWeightLossPercent || 5.0;
    const lossRatio = weightLossPercent / maxLoss;

    if (lossRatio > 1.0) {
      weightPenalty = 70 + Math.min(30, (lossRatio - 1.0) * 50);
      weightLossRisk = 'HIGH';
    } else if (lossRatio > 0.6) {
      weightPenalty = 35 + (lossRatio - 0.6) * 80;
      weightLossRisk = 'MEDIUM';
    } else {
      weightPenalty = lossRatio * 50;
      weightLossRisk = 'LOW';
    }

    const lossPerDay = weightLossPercent / durationDays;
    const expectedLossPerDay = (maxLoss / profile.baseShelfLifeDays) * 1.2;
    let weightLossTrend = lossPerDay > expectedLossPerDay * 2.0 && durationDays >= 1 ? 'ABNORMAL LOSS' : 'NORMAL LOSS';

    // 4. Ethylene Gas & Rising Trend (Weight: 25%)
    let ethylenePenalty = 0;
    let ethyleneStatus = 'NORMAL';
    const warnPpm = profile.ethyleneWarnThreshold || 0.40;
    const critPpm = profile.ethyleneCritThreshold || 1.00;

    if (ethylene >= critPpm) {
      ethylenePenalty = 75 + Math.min(25, (ethylene - critPpm) * 30);
      ethyleneStatus = 'HIGH ETHYLENE / RIPENING RISK';
    } else if (ethylene >= warnPpm) {
      ethylenePenalty = 30 + ((ethylene - warnPpm) / (critPpm - warnPpm)) * 45;
      ethyleneStatus = ethyleneTrend > 10 ? 'ETHYLENE RISING' : 'MODERATE ETHYLENE';
    } else if (ethyleneTrend > 25) {
      ethylenePenalty = 20;
      ethyleneStatus = 'ETHYLENE RISING';
    }

    // 5. Storage Duration & Biological Senescence (Weight: 15%)
    const baseLife = profile.baseShelfLifeDays || 14;
    const ageRatio = durationDays / baseLife;
    const senescencePenalty = Math.min(100, Math.max(0, ageRatio * 70));

    // Weighted Quality Risk Score (0-100)
    const qualityRiskScore = Math.min(100, Math.max(0, (
      (thermalPenalty * 0.25) +
      (humidityPenalty * 0.15) +
      (weightPenalty * 0.20) +
      (ethylenePenalty * 0.25) +
      (senescencePenalty * 0.15)
    )));

    // Freshness Score (0 - 100)
    const freshnessScore = Math.round(Math.max(0, Math.min(100, 100 - qualityRiskScore)));

    // Spoilage Risk Categorization
    let spoilageRisk = 'LOW';
    if (freshnessScore < 40 || qualityRiskScore >= 65) {
      spoilageRisk = 'CRITICAL';
    } else if (freshnessScore < 65 || qualityRiskScore >= 45) {
      spoilageRisk = 'HIGH';
    } else if (freshnessScore < 80 || qualityRiskScore >= 25) {
      spoilageRisk = 'MEDIUM';
    } else {
      spoilageRisk = 'LOW';
    }

    // Remaining Shelf Life Calculation
    const acceleration = 1.0 + (qualityRiskScore / 35.0);
    const rawRemaining = Math.max(0, baseLife - durationDays) / acceleration;
    let remainingShelfLifeDays = Number((rawRemaining * (freshnessScore / 100)).toFixed(1));
    if (spoilageRisk === 'CRITICAL' && remainingShelfLifeDays > 1.5) remainingShelfLifeDays = 1.0;

    let qualityTrend = (ethyleneTrend > 20 || thermalPenalty > 40 || weightLossRisk === 'HIGH') ? 'RAPID DECAY' :
                       (qualityRiskScore > 30 || durationDays > baseLife * 0.6) ? 'DEGRADING' : 'STABLE';

    let recommendedAction = (spoilageRisk === 'CRITICAL' || remainingShelfLifeDays <= 2) ? 'SELL IMMEDIATELY (SELL FIRST)' :
                            (spoilageRisk === 'HIGH' || remainingShelfLifeDays <= 4) ? 'SELL SOON (WITHIN 48-72 HRS)' :
                            (spoilageRisk === 'MEDIUM' || ethyleneStatus === 'ETHYLENE RISING') ? 'MONITOR CLOSELY' : 'SAFE TO STORE';

    let sellPriority = (spoilageRisk === 'CRITICAL' || remainingShelfLifeDays <= 2) ? 'SELL FIRST' :
                       (spoilageRisk === 'HIGH' || remainingShelfLifeDays <= 4) ? 'SELL SOON' : 'SAFE TO STORE';

    return {
      produceType: profile.name,
      variety: input.variety || 'Standard',
      zone: input.zone,
      freshnessScore,
      spoilageRisk,
      remainingShelfLifeDays,
      remainingShelfLifeText: remainingShelfLifeDays <= 1 
        ? `${Math.max(6, Math.round(remainingShelfLifeDays * 24))} Hours` 
        : `${remainingShelfLifeDays} Days`,
      qualityTrend,
      recommendedAction,
      sellPriority,
      predictionConfidence: 86,

      // "WHY IS THE RISK HIGH?" Explainability Factors
      metrics: {
        currentTemp: temp,
        targetTempRange: `${profile.tempMin}–${profile.tempMax}°C`,
        tempDeviation: Number(tempDeviation.toFixed(1)),
        tempStatus,
        thermalPenalty: Math.round(thermalPenalty),

        currentHumidity: humidity,
        targetHumidityRange: `${profile.humidityMin}–${profile.humidityMax}%`,
        humidityStatus,
        humidityPenalty: Math.round(humidityPenalty),

        initialWeightKg: Number(initialWeight.toFixed(1)),
        currentWeightKg: Number(currentWeight.toFixed(1)),
        weightLossKg: Number(weightLoss.toFixed(1)),
        weightLossPercent: Number(weightLossPercent.toFixed(2)),
        weightLossRisk,
        weightLossTrend,
        weightPenalty: Math.round(weightPenalty),

        currentEthylenePpm: Number(ethylene.toFixed(3)),
        ethyleneStatus,
        ethyleneTrendPercent: Number(ethyleneTrend.toFixed(1)),
        ethylenePenalty: Math.round(ethylenePenalty),

        storageDurationDays: Number(durationDays.toFixed(1)),
        senescencePenalty: Math.round(senescencePenalty),
        qualityRiskScore: Math.round(qualityRiskScore)
      },

      label: 'AI-ASSISTED ESTIMATE',
      disclaimer: 'AI-assisted estimation based on real-time environmental, gas, and biological weight loss sensors. Not a laboratory-certified food-safety determination.'
    };
  }
}

export const predictionEngine = new SpoilagePredictionEngine();
