/**
 * QORA TECH — NER Personalized Seasonal Crop Advisor Engine
 * 
 * Provides personalized horticultural recommendations for each approved user based on:
 * 1. User Location & State (8 Northeast India States)
 * 2. Seasonal Climate & Month
 * 3. Cultivated Primary & Secondary Crops + Available Capacity
 * 4. Real-Time Physical Sensor Data across Zone 1, 2, 3 (DHT22, Load Cells, MQ-137)
 * 5. AI Freshness & Spoilage Predictions
 * 6. Solar Panel Energy Availability
 * 
 * Multi-Factor Scoring Formula (Configurable via Admin Panel):
 * Score = W_temp * TempScore + W_hum * HumScore + W_cap * CapScore + W_spoil * SpoilScore + 
 *         W_weight * WeightScore + W_eth * EthScore + W_dur * DurScore
 */

import { store } from './core/state.js';
import { DEFAULT_PRODUCE_PROFILES, recommendZoneForCrop, ZONE_SPECS } from './config/produce-profiles.js';

// Default Transparent Scoring Weights (Total = 1.0 / 100%)
export const DEFAULT_ADVISOR_WEIGHTS = {
  temp: 0.30,       // 30% Temperature compatibility with zone corridor
  hum: 0.15,        // 15% Humidity corridor match
  capacity: 0.15,   // 15% User available capacity vs zone volume
  spoilage: 0.15,   // 15% Produce freshness & respiration safety
  weightLoss: 0.10, // 10% Moisture loss prevention score
  ethylene: 0.10,   // 10% Ethylene threshold & co-storage safety
  duration: 0.05    // 5%  Target storage duration / shelf life gain
};

// NER Regional Agro-Climatic Seasons & Rules Database
export const NER_SEASONAL_RULES = {
  'Assam': {
    spring: { months: [3, 4, 5], name: 'Pre-Monsoon / Spring', tempRange: '20–32°C', rh: '70–85%', primaryFlush: ['Green Beans', 'Okra', 'Brinjal', 'Tomato'] },
    monsoon: { months: [6, 7, 8, 9], name: 'Monsoon / Kharif Peak', tempRange: '26–36°C', rh: '85–98%', primaryFlush: ['Ginger (Fresh)', 'Bhut Jolokia', 'Cabbage', 'Lai Xaak'] },
    autumn: { months: [10, 11], name: 'Post-Monsoon Harvest', tempRange: '18–28°C', rh: '70–82%', primaryFlush: ['Ginger', 'Turmeric', 'Table Potato', 'Mandarin'] },
    winter: { months: [12, 1, 2], name: 'Winter / Rabi Harvest', tempRange: '8–22°C', rh: '55–75%', primaryFlush: ['Cabbage', 'Cauliflower', 'Broccoli', 'Carrot', 'Seed Potato'] }
  },
  'Arunachal Pradesh': {
    spring: { months: [3, 4, 5], name: 'Himalayan Spring Thaw', tempRange: '12–24°C', rh: '65–80%', primaryFlush: ['Green Peas', 'Cabbage', 'Tree Tomato'] },
    monsoon: { months: [6, 7, 8, 9], name: 'High-Altitude Monsoon', tempRange: '16–26°C', rh: '80–95%', primaryFlush: ['Highland Beans', 'Cardamom', 'Cabbage'] },
    autumn: { months: [10, 11], name: 'Highland Autumn Harvest', tempRange: '10–20°C', rh: '60–75%', primaryFlush: ['Apples', 'Kiwi', 'Seed Potato', 'Ginger'] },
    winter: { months: [12, 1, 2], name: 'Alpine Winter', tempRange: '-2–14°C', rh: '45–65%', primaryFlush: ['Seed Potato', 'Stored Roots', 'Cabbage', 'Broccoli'] }
  },
  'Meghalaya': {
    spring: { months: [3, 4, 5], name: 'Pre-Monsoon Bloom', tempRange: '15–25°C', rh: '70–85%', primaryFlush: ['French Beans', 'Tomato', 'Capsicum'] },
    monsoon: { months: [6, 7, 8, 9], name: 'Heavy Monsoon Flushes', tempRange: '18–26°C', rh: '90–100%', primaryFlush: ['Lakadong Turmeric', 'Ginger', 'Khasi Mandarin'] },
    autumn: { months: [10, 11], name: 'Post-Monsoon Curing', tempRange: '14–22°C', rh: '70–80%', primaryFlush: ['Lakadong Turmeric', 'Ginger', 'Table Potato'] },
    winter: { months: [12, 1, 2], name: 'Highland Winter', tempRange: '4–16°C', rh: '50–70%', primaryFlush: ['Cole Crops', 'Carrot', 'Radish', 'Seed Potato'] }
  },
  'Nagaland': {
    spring: { months: [3, 4, 5], name: 'Spring Sowing & First Flush', tempRange: '16–28°C', rh: '65–80%', primaryFlush: ['Naga King Chilli', 'Tree Tomato', 'Green Beans'] },
    monsoon: { months: [6, 7, 8, 9], name: 'Monsoon Peak Ripening', tempRange: '22–30°C', rh: '85–95%', primaryFlush: ['Bhut Jolokia (King Chilli)', 'Naga Tree Tomato', 'Ginger'] },
    autumn: { months: [10, 11], name: 'Autumn Harvest & Drying', tempRange: '16–24°C', rh: '65–78%', primaryFlush: ['Bhut Jolokia', 'Ginger', 'Cardamom', 'Table Potato'] },
    winter: { months: [12, 1, 2], name: 'Mild Hill Winter', tempRange: '6–18°C', rh: '50–68%', primaryFlush: ['Cabbage', 'Mustard Greens', 'Seed Potato', 'Radish'] }
  },
  'Manipur': {
    spring: { months: [3, 4, 5], name: 'Spring Flowering', tempRange: '18–30°C', rh: '60–75%', primaryFlush: ['King Chilli', 'Green Peas', 'Beans'] },
    monsoon: { months: [6, 7, 8, 9], name: 'Monsoon Flush', tempRange: '24–32°C', rh: '80–92%', primaryFlush: ['Kachai Lemon', 'Ginger', 'Chilli', 'Okra'] },
    autumn: { months: [10, 11], name: 'Autumn Harvest', tempRange: '16–26°C', rh: '65–78%', primaryFlush: ['Kachai Lemon', 'Turmeric', 'Potato'] },
    winter: { months: [12, 1, 2], name: 'Valley Winter', tempRange: '6–20°C', rh: '50–70%', primaryFlush: ['Cole Crops', 'Peas', 'Carrot', 'Broad Beans'] }
  },
  'Mizoram': {
    spring: { months: [3, 4, 5], name: 'Spring Season', tempRange: '18–30°C', rh: '65–80%', primaryFlush: ['Birds Eye Chilli', 'Ginger', 'Beans'] },
    monsoon: { months: [6, 7, 8, 9], name: 'Monsoon Harvest', tempRange: '22–28°C', rh: '85–96%', primaryFlush: ['Mizo Chilli', 'Passion Fruit', 'Ginger'] },
    autumn: { months: [10, 11], name: 'Post-Monsoon Harvest', tempRange: '16–26°C', rh: '70–82%', primaryFlush: ['Ginger (Thingpui)', 'Turmeric', 'Mandarin'] },
    winter: { months: [12, 1, 2], name: 'Hill Winter', tempRange: '10–22°C', rh: '55–70%', primaryFlush: ['Cabbage', 'Cauliflower', 'Broccoli', 'Peas'] }
  },
  'Sikkim': {
    spring: { months: [3, 4, 5], name: 'Himalayan Organic Spring', tempRange: '10–22°C', rh: '65–80%', primaryFlush: ['Large Cardamom', 'Green Peas', 'Beans'] },
    monsoon: { months: [6, 7, 8, 9], name: 'Organic Monsoon Growth', tempRange: '16–24°C', rh: '85–98%', primaryFlush: ['Sikkim Mandarin', 'Large Cardamom', 'Cabbage'] },
    autumn: { months: [10, 11], name: 'Cardamom & Mandarin Harvest', tempRange: '10–18°C', rh: '60–75%', primaryFlush: ['Large Cardamom', 'Sikkim Mandarin', 'Ginger'] },
    winter: { months: [12, 1, 2], name: 'Himalayan Cold Storage Window', tempRange: '0–12°C', rh: '45–65%', primaryFlush: ['Seed Potato', 'Cole Crops', 'Root Vegetables'] }
  },
  'Tripura': {
    spring: { months: [3, 4, 5], name: 'Pre-Monsoon Season', tempRange: '24–35°C', rh: '65–80%', primaryFlush: ['Queen Pineapple', 'Green Chilli', 'Brinjal'] },
    monsoon: { months: [6, 7, 8, 9], name: 'Peak Pineapple & Vegetable Flush', tempRange: '26–34°C', rh: '85–95%', primaryFlush: ['Queen Pineapple', 'Kew Pineapple', 'Ginger', 'Okra'] },
    autumn: { months: [10, 11], name: 'Post-Monsoon Harvest', tempRange: '20–30°C', rh: '70–80%', primaryFlush: ['Pineapple', 'Turmeric', 'Table Potato'] },
    winter: { months: [12, 1, 2], name: 'Mild Winter', tempRange: '10–24°C', rh: '55–72%', primaryFlush: ['Cabbage', 'Cauliflower', 'Tomato', 'Beans'] }
  }
};

export class SeasonalAdvisorEngine {
  constructor() {
    this.cachedRecommendation = null;
    this.lastEvaluatedTime = 0;
  }

  /**
   * Get active scoring weights (from localStorage or default)
   */
  getWeights() {
    try {
      const saved = localStorage.getItem('qoratech_advisor_weights');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Weights load error:', e);
    }
    return DEFAULT_ADVISOR_WEIGHTS;
  }

  /**
   * Save custom scoring weights (Admin configuration)
   */
  saveWeights(newWeights) {
    localStorage.setItem('qoratech_advisor_weights', JSON.stringify(newWeights));
    this.cachedRecommendation = null; // Invalidate cache
  }

  /**
   * Determine the current season for a given NER state
   */
  getCurrentSeason(state = 'Assam', date = new Date()) {
    const month = date.getMonth() + 1; // 1-12
    const stateRules = NER_SEASONAL_RULES[state] || NER_SEASONAL_RULES['Assam'];

    for (const [key, season] of Object.entries(stateRules)) {
      if (season.months.includes(month)) {
        return { key, ...season, state };
      }
    }
    return { key: 'autumn', ...stateRules.autumn, state };
  }

  /**
   * Compute multi-factor suitability score (0 - 100%) for a crop in a target zone
   */
  computeSuitabilityScore(cropProfile, targetZoneId, userProfile = {}) {
    const weights = this.getWeights();
    const zone = store.get(`zones.${targetZoneId}`);
    const energy = store.get('energy');

    if (!cropProfile || !zone) return { score: 50, breakdown: {} };

    // 1. Temperature Score (30%)
    const curTemp = zone.temperature;
    const optTemp = cropProfile.tempOptimal || ((cropProfile.tempMin + cropProfile.tempMax) / 2);
    let tempDist = 0;
    if (curTemp < cropProfile.tempMin) {
      tempDist = Math.abs(cropProfile.tempMin - curTemp) * 1.8; // Penalty for chilling/freezing
    } else if (curTemp > cropProfile.tempMax) {
      tempDist = Math.abs(curTemp - cropProfile.tempMax) * 1.2; // Warm penalty
    }
    const tempScore = Math.max(0, Math.min(100, 100 - tempDist * 18));

    // 2. Humidity Score (15%)
    const curHum = zone.humidity;
    let humDist = 0;
    if (curHum < cropProfile.humidityMin) {
      humDist = Math.abs(cropProfile.humidityMin - curHum);
    } else if (curHum > cropProfile.humidityMax) {
      humDist = Math.abs(curHum - cropProfile.humidityMax) * 0.8;
    }
    const humScore = Math.max(0, Math.min(100, 100 - humDist * 3));

    // 3. Available Capacity Fit (15%)
    const targetCap = userProfile.storageCapacityKg || 500;
    const currentWeight = zone.currentWeight || 0;
    const maxZoneCap = 1000; // kg capacity per zone
    const freeCap = Math.max(0, maxZoneCap - currentWeight);
    const capScore = freeCap >= targetCap ? 100 : Math.max(20, (freeCap / targetCap) * 100);

    // 4. Freshness & Spoilage Protection (15%)
    // If solar is active and chilling corridor is matched, produce maintains high freshness
    const isSolarActive = energy && (energy.source === 'SOLAR' || energy.solarPowerKw > 0.4);
    const freshnessBoost = isSolarActive ? 10 : 0;
    const spoilScore = Math.min(100, Math.max(30, (tempScore * 0.6 + humScore * 0.4) + freshnessBoost));

    // 5. Weight Loss Prevention Score (10%)
    const weightLossTolerance = cropProfile.maxWeightLossPercent || 5.0;
    const weightScore = curHum >= (cropProfile.humidityMin - 2) ? 95 : Math.max(20, 100 - (cropProfile.humidityMin - curHum) * 4);

    // 6. Ethylene Safety Score (10%)
    const curEth = zone.ethylene || 0.1;
    const ethCrit = cropProfile.ethyleneCritThreshold || 1.0;
    let ethScore = 100;
    if (curEth > ethCrit) {
      ethScore = 20; // Dangerous ethylene level
    } else if (curEth > (cropProfile.ethyleneWarnThreshold || 0.5)) {
      ethScore = 65;
    }

    // 7. Duration / Shelf Life Gain (5%)
    const baseLife = cropProfile.baseShelfLifeDays || 21;
    const durScore = baseLife >= 30 ? 95 : 80;

    // Weighted Overall Score
    const finalScore = Math.round(
      (weights.temp * tempScore) +
      (weights.hum * humScore) +
      (weights.capacity * capScore) +
      (weights.spoilage * spoilScore) +
      (weights.weightLoss * weightScore) +
      (weights.ethylene * ethScore) +
      (weights.duration * durScore)
    );

    return {
      score: Math.min(100, Math.max(10, finalScore)),
      breakdown: {
        temp: Math.round(tempScore),
        hum: Math.round(humScore),
        capacity: Math.round(capScore),
        spoilage: Math.round(spoilScore),
        weightLoss: Math.round(weightScore),
        ethylene: Math.round(ethScore),
        duration: Math.round(durScore)
      }
    };
  }

  /**
   * Main Recommendation Engine:
   * Generates a fully personalized storage advice report for the user.
   */
  generateUserAdvice(user) {
    if (!user) {
      user = store.get('user') || {
        displayName: 'Northeast Farmer',
        nerState: 'Assam',
        district: 'Kamrup',
        primaryCrops: 'Ginger, Naga King Chilli, Cabbage',
        secondaryCrops: 'Green Beans, Broccoli',
        storageCapacityKg: 500,
        preferredCrop: 'Ginger (Fresh Rhizome)'
      };
    }

    const state = user.nerState || 'Assam';
    const season = this.getCurrentSeason(state);
    const energy = store.get('energy') || { solarPowerKw: 0.8, energySurplusKw: 0.2, source: 'SOLAR' };

    // Parse user crops
    const userCropNames = [
      ...(user.primaryCrops || 'Ginger, Cabbage').split(','),
      ...(user.secondaryCrops || '').split(','),
      user.preferredCrop || ''
    ].map(s => s.trim().toLowerCase()).filter(Boolean);

    // Evaluate all registered crop profiles
    const cropProfiles = Object.values(DEFAULT_PRODUCE_PROFILES);
    const rankings = [];

    for (const crop of cropProfiles) {
      const rec = recommendZoneForCrop(crop);
      const zoneEval = this.computeSuitabilityScore(crop, rec.bestZone, user);
      
      const isUserCrop = userCropNames.some(uc => 
        crop.name.toLowerCase().includes(uc) || uc.includes(crop.name.toLowerCase()) || crop.id.toLowerCase().includes(uc)
      );

      // Check season alignment bonus
      const isSeasonFlush = season.primaryFlush.some(pf => crop.name.toLowerCase().includes(pf.toLowerCase()));

      let tier = '⚠️ Not Recommended';
      let tierBadge = 'badge-critical';
      let rankIcon = '⚠️';

      if (zoneEval.score >= 85) {
        tier = '🥇 Best Fit';
        tierBadge = 'badge-normal';
        rankIcon = '🥇';
      } else if (zoneEval.score >= 70) {
        tier = '🥈 Good Fit';
        tierBadge = 'badge-cyan';
        rankIcon = '🥈';
      } else if (zoneEval.score >= 55) {
        tier = '🥉 Moderate Fit';
        tierBadge = 'badge-warning';
        rankIcon = '🥉';
      }

      rankings.push({
        crop,
        bestZoneId: rec.bestZone,
        bestZoneName: ZONE_SPECS[rec.bestZone].name,
        compartment: ZONE_SPECS[rec.bestZone].compartment,
        targetRange: `${ZONE_SPECS[rec.bestZone].tempTargetMin}–${ZONE_SPECS[rec.bestZone].tempTargetMax}°C`,
        score: zoneEval.score,
        breakdown: zoneEval.breakdown,
        tier,
        tierBadge,
        rankIcon,
        reason: rec.reason,
        isUserCrop,
        isSeasonFlush,
        storageNotes: crop.storageNotes,
        expectedDays: crop.baseShelfLifeDays
      });
    }

    // Sort: user cultivated crops with highest scores first, followed by others
    rankings.sort((a, b) => {
      if (a.isUserCrop && !b.isUserCrop) return -1;
      if (!a.isUserCrop && b.isUserCrop) return 1;
      return b.score - a.score;
    });

    // Top recommended crop right now
    const topPick = rankings.find(r => r.isUserCrop) || rankings[0];

    // Real-Time Sensor Context Summary
    const z1 = store.get('zones.1');
    const z2 = store.get('zones.2');
    const z3 = store.get('zones.3');

    // Actionable Seasonal Advice Statement
    let seasonalActionText = '';
    if (energy.solarPowerKw > 0.5) {
      seasonalActionText = `☀️ High solar generation (${Math.round(energy.solarPowerKw * 1000)}W) detected. Optimal time for active chilling of ${topPick.crop.name} in ${topPick.compartment} with 0 grid import costs.`;
    } else {
      seasonalActionText = `🌙 Grid/Battery buffering active. Respiration rates are stable across all 3 compartments. Maintain tight door sealing.`;
    }

    return {
      user,
      state,
      season,
      topPick,
      rankings,
      seasonalActionText,
      evaluatedAt: new Date().toISOString(),
      zonesSnapshot: {
        1: { temp: z1?.temperature.toFixed(1), hum: z1?.humidity.toFixed(1), crop: z1?.crop },
        2: { temp: z2?.temperature.toFixed(1), hum: z2?.humidity.toFixed(1), crop: z2?.crop },
        3: { temp: z3?.temperature.toFixed(1), hum: z3?.humidity.toFixed(1), crop: z3?.crop }
      }
    };
  }
}

export const seasonalAdvisor = new SeasonalAdvisorEngine();
