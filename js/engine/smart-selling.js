/**
 * Solar Smart Cold Storage — Smart Selling & Quality-Ranked Inventory Engine
 * Computes optimal dispatch & market priority for stored produce batches.
 * Minimizes post-harvest loss through intelligent FIFO + Quality dynamic ranking.
 */

import { predictionEngine } from './prediction-engine.js';

export class SmartSellingEngine {
  /**
   * Evaluates all produce batches and returns a sorted priority list
   * @param {Array<Object>} batches - Array of produce batch records
   * @param {Object} zoneTelemetry - Map of current zone sensor values { 1: {...}, 2: {...}, 3: {...} }
   * @returns {Array<Object>} Ranked batches with sell recommendation badges and urgency scores
   */
  static rankBatches(batches = [], zoneTelemetry = {}) {
    if (!batches || batches.length === 0) return [];

    const evaluatedBatches = batches.map(batch => {
      const zoneData = zoneTelemetry[batch.zoneId || batch.zone] || {
        temperature: 11.5,
        humidity: 88.0,
        ethylene: 0.35,
        ethyleneTrend: 5.0,
        tempFluctuation: 0.3,
        hoursOutside: 0
      };

      // Storage duration in days
      const dateStored = new Date(batch.dateStored || Date.now() - 86400000 * 3);
      const now = new Date();
      const durationDays = Math.max(0.1, (now - dateStored) / (1000 * 60 * 60 * 24));

      // Predict batch freshness and shelf life
      const prediction = predictionEngine.predict({
        produceType: batch.produceType || batch.name,
        variety: batch.variety,
        zone: batch.zoneId || batch.zone || 1,
        currentTemp: zoneData.temperature,
        currentHumidity: zoneData.humidity,
        tempFluctuation: zoneData.tempFluctuation,
        initialWeight: batch.initialWeight || 100,
        currentWeight: batch.currentWeight || (batch.initialWeight ? batch.initialWeight * 0.96 : 96),
        ethylene: zoneData.ethylene,
        ethyleneTrendRate: zoneData.ethyleneTrend,
        storageDurationDays: durationDays,
        hoursOutsideTarget: zoneData.hoursOutside || 0
      });

      // Calculate composite Urgency Score (0 - 100, where 100 is most critical to sell immediately)
      // Higher risk + shorter remaining life + higher weight loss = higher urgency
      const shelfLifeUrgency = Math.max(0, 100 - (prediction.remainingShelfLifeDays * 12));
      const freshnessDeficit = 100 - prediction.freshnessScore;
      const ethyleneRisk = prediction.metrics.ethylenePenalty;
      const weightLossUrgency = prediction.metrics.weightPenalty;

      const urgencyScore = Math.min(100, Math.round(
        (shelfLifeUrgency * 0.35) +
        (freshnessDeficit * 0.30) +
        (ethyleneRisk * 0.20) +
        (weightLossUrgency * 0.15)
      ));

      let badgeClass = 'badge-safe';
      let priorityLevel = 3; // 1 = Highest (Sell First), 2 = Sell Soon, 3 = Safe

      if (prediction.sellPriority === 'SELL FIRST' || urgencyScore >= 70) {
        badgeClass = 'badge-critical';
        priorityLevel = 1;
      } else if (prediction.sellPriority === 'SELL SOON' || urgencyScore >= 45) {
        badgeClass = 'badge-warning';
        priorityLevel = 2;
      }

      return {
        ...batch,
        durationDays: Number(durationDays.toFixed(1)),
        prediction,
        urgencyScore,
        priorityLevel,
        badgeClass,
        marketActionText: prediction.sellPriority,
        estimatedLossRisk: prediction.spoilageRisk
      };
    });

    // Sort descending by priorityLevel (1 first), then by urgencyScore descending
    return evaluatedBatches.sort((a, b) => {
      if (a.priorityLevel !== b.priorityLevel) {
        return a.priorityLevel - b.priorityLevel;
      }
      return b.urgencyScore - a.urgencyScore;
    });
  }

  /**
   * Get summary insights for dashboard widgets
   */
  static getSellingSummary(rankedBatches = []) {
    const totalBatches = rankedBatches.length;
    const sellFirstCount = rankedBatches.filter(b => b.priorityLevel === 1).length;
    const sellSoonCount = rankedBatches.filter(b => b.priorityLevel === 2).length;
    const safeCount = rankedBatches.filter(b => b.priorityLevel === 3).length;

    const totalWeight = rankedBatches.reduce((acc, b) => acc + (Number(b.currentWeight) || 0), 0);
    const atRiskWeight = rankedBatches
      .filter(b => b.priorityLevel <= 2)
      .reduce((acc, b) => acc + (Number(b.currentWeight) || 0), 0);

    return {
      totalBatches,
      sellFirstCount,
      sellSoonCount,
      safeCount,
      totalWeightKg: Number(totalWeight.toFixed(1)),
      atRiskWeightKg: Number(atRiskWeight.toFixed(1)),
      urgentBatches: rankedBatches.slice(0, 4)
    };
  }
}
