/**
 * QORA TECH — Solar Smart Cold Storage
 * Northeast India Crop Database, Special Potato Storage Rules & 3-Zone Compartment Specs
 * 
 * Physical Compartment Layout:
 * - LEFT:   ZONE 1 — Cool Storage (2–8°C)
 * - CENTER: ZONE 2 — Deep Cold Storage (0–2°C) [Coldest]
 * - RIGHT:  ZONE 3 — Cool / Moderate Storage (8–15°C)
 */

export const ZONE_SPECS = {
  1: {
    id: 1,
    name: 'ZONE 1 – COOL STORAGE',
    compartment: 'LEFT COMPARTMENT',
    location: 'LEFT',
    tempTargetMin: 2.0,
    tempTargetMax: 8.0,
    tempSafeMin: 1.0,
    tempSafeMax: 9.5,
    humidityTargetMin: 88.0,
    humidityTargetMax: 96.0,
    description: 'Cool Storage compartment for temperate vegetables, root crops, and seed tubers.',
    badgeColor: '#10b981'
  },
  2: {
    id: 2,
    name: 'ZONE 2 – DEEP COLD STORAGE',
    compartment: 'CENTER COMPARTMENT',
    location: 'CENTER',
    tempTargetMin: 0.0,
    tempTargetMax: 2.0,
    tempSafeMin: -0.5,
    tempSafeMax: 3.0,
    humidityTargetMin: 90.0,
    humidityTargetMax: 98.0,
    description: 'Coldest Compartment. Deep cold storage for near-zero respiration and maximum shelf-life extension.',
    badgeColor: '#06b6d4'
  },
  3: {
    id: 3,
    name: 'ZONE 3 – COOL / MODERATE STORAGE',
    compartment: 'RIGHT COMPARTMENT',
    location: 'RIGHT',
    tempTargetMin: 8.0,
    tempTargetMax: 15.0,
    tempSafeMin: 7.0,
    tempSafeMax: 16.5,
    humidityTargetMin: 80.0,
    humidityTargetMax: 92.0,
    description: 'Cool / Moderate Storage compartment for chilling-sensitive tropical, solanaceous, and rhizome crops.',
    badgeColor: '#a855f7'
  }
};

/**
 * Northeast India & Specialty Horticultural Crops Database
 */
export const DEFAULT_PRODUCE_PROFILES = {
  // --- NORTHEAST INDIA SPECIALTIES & TROPICAL / SOLANACEOUS (ZONE 3: 8–15°C) ---
  naga_tree_tomato: {
    id: 'naga_tree_tomato',
    name: 'Naga Tree Tomato (Tamarillo)',
    scientificName: 'Solanum betaceum',
    category: 'Northeast Specialty',
    recommendedZone: 3, // Zone 3 (Right: 8-15°C)
    tempMin: 8.0,
    tempMax: 12.0,
    tempOptimal: 10.0,
    humidityMin: 85.0,
    humidityMax: 90.0,
    humidityOptimal: 88.0,
    ethyleneSensitivity: 'HIGH',
    ethyleneProduction: 'HIGH',
    ethyleneWarnThreshold: 0.45,
    ethyleneCritThreshold: 1.00,
    maxWeightLossPercent: 5.0,
    baseShelfLifeDays: 28,
    chillingSensitivity: 'HIGH',
    varieties: ['Red Tamarillo', 'Yellow Amber', 'Ruby Red'],
    storageNotes: 'Indigenous to Eastern Himalayas. Sensitive to chilling injury below 6°C (skin pitting and core browning).'
  },
  naga_chilli: {
    id: 'naga_chilli',
    name: 'Naga King Chilli (Bhut Jolokia)',
    scientificName: 'Capsicum chinense',
    category: 'Northeast Specialty',
    recommendedZone: 3, // Zone 3 (Right: 8-15°C)
    tempMin: 9.0,
    tempMax: 13.0,
    tempOptimal: 11.0,
    humidityMin: 85.0,
    humidityMax: 92.0,
    humidityOptimal: 90.0,
    ethyleneSensitivity: 'MEDIUM',
    ethyleneProduction: 'MEDIUM',
    ethyleneWarnThreshold: 0.50,
    ethyleneCritThreshold: 1.10,
    maxWeightLossPercent: 6.0,
    baseShelfLifeDays: 24,
    chillingSensitivity: 'VERY_HIGH',
    varieties: ['Bhut Jolokia GI', 'Tezpur Hot', 'Bih Jolokia'],
    storageNotes: 'Preserve capsaicin potency and calyx greenness. Never store below 8°C to prevent calyx mold and calyx softening.'
  },
  green_chilli: {
    id: 'green_chilli',
    name: 'Green Chilli',
    scientificName: 'Capsicum annuum',
    category: 'Spices & Condiments',
    recommendedZone: 3, // Zone 3 (Right: 8-15°C)
    tempMin: 8.0,
    tempMax: 12.0,
    tempOptimal: 10.0,
    humidityMin: 90.0,
    humidityMax: 95.0,
    humidityOptimal: 92.0,
    ethyleneSensitivity: 'MEDIUM',
    ethyleneProduction: 'LOW',
    ethyleneWarnThreshold: 0.45,
    ethyleneCritThreshold: 1.00,
    maxWeightLossPercent: 5.5,
    baseShelfLifeDays: 21,
    chillingSensitivity: 'HIGH',
    varieties: ['Pusa Jwala', 'Guntur', 'Kanthari'],
    storageNotes: 'High moisture retention avoids shriveling. Chilling injury manifests below 7°C.'
  },
  ginger: {
    id: 'ginger',
    name: 'Ginger (Fresh Rhizome)',
    scientificName: 'Zingiber officinale',
    category: 'Rhizomes & Spices',
    recommendedZone: 3, // Zone 3 (Right: 8-15°C)
    tempMin: 11.0,
    tempMax: 14.0,
    tempOptimal: 12.5,
    humidityMin: 85.0,
    humidityMax: 90.0,
    humidityOptimal: 88.0,
    ethyleneSensitivity: 'LOW',
    ethyleneProduction: 'VERY_LOW',
    ethyleneWarnThreshold: 0.80,
    ethyleneCritThreshold: 1.80,
    maxWeightLossPercent: 7.0,
    baseShelfLifeDays: 60,
    chillingSensitivity: 'VERY_HIGH',
    varieties: ['Nadia', 'Maran', 'Rio de Janeiro'],
    storageNotes: 'Extremely susceptible to chilling injury below 10°C (internal breakdown). Needs cured skin.'
  },
  turmeric: {
    id: 'turmeric',
    name: 'Turmeric (Fresh Rhizome)',
    scientificName: 'Curcuma longa',
    category: 'Rhizomes & Spices',
    recommendedZone: 3, // Zone 3 (Right: 8-15°C)
    tempMin: 11.0,
    tempMax: 14.5,
    tempOptimal: 12.5,
    humidityMin: 85.0,
    humidityMax: 90.0,
    humidityOptimal: 88.0,
    ethyleneSensitivity: 'LOW',
    ethyleneProduction: 'VERY_LOW',
    ethyleneWarnThreshold: 0.80,
    ethyleneCritThreshold: 1.80,
    maxWeightLossPercent: 7.0,
    baseShelfLifeDays: 75,
    chillingSensitivity: 'VERY_HIGH',
    varieties: ['Lakadong (High Curcumin)', 'Megha Turmeric 1', 'Prathiba'],
    storageNotes: 'Famous Meghalaya Lakadong cultivar. Maintain moderate cool humidity to prevent dehydration without sprouting.'
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    scientificName: 'Solanum lycopersicum',
    category: 'Solanaceous Vegetables',
    recommendedZone: 3, // Zone 3 (Right: 8-15°C)
    tempMin: 10.0,
    tempMax: 13.5,
    tempOptimal: 12.0,
    humidityMin: 85.0,
    humidityMax: 95.0,
    humidityOptimal: 90.0,
    ethyleneSensitivity: 'HIGH',
    ethyleneProduction: 'HIGH',
    ethyleneWarnThreshold: 0.50,
    ethyleneCritThreshold: 1.20,
    maxWeightLossPercent: 5.0,
    baseShelfLifeDays: 14,
    chillingSensitivity: 'HIGH',
    varieties: ['Roma', 'Pusa Ruby', 'Arka Rakshak', 'Heirloom'],
    storageNotes: 'Store in Zone 3 (8–15°C). Chilling injury occurs below 10°C (uneven color, water-soaked pits).'
  },
  brinjal: {
    id: 'brinjal',
    name: 'Brinjal / Eggplant',
    scientificName: 'Solanum melongena',
    category: 'Solanaceous Vegetables',
    recommendedZone: 3, // Zone 3 (Right: 8-15°C)
    tempMin: 9.0,
    tempMax: 12.0,
    tempOptimal: 10.5,
    humidityMin: 90.0,
    humidityMax: 95.0,
    humidityOptimal: 92.0,
    ethyleneSensitivity: 'HIGH',
    ethyleneProduction: 'LOW',
    ethyleneWarnThreshold: 0.40,
    ethyleneCritThreshold: 0.90,
    maxWeightLossPercent: 5.0,
    baseShelfLifeDays: 14,
    chillingSensitivity: 'HIGH',
    varieties: ['Pusa Purple Long', 'Pusa Kranti', 'Green Round'],
    storageNotes: 'Chilling injury below 8°C leads to surface pitting, bronzing, and seed browning.'
  },
  okra: {
    id: 'okra',
    name: 'Okra (Lady Finger)',
    scientificName: 'Abelmoschus esculentus',
    category: 'Fruit Vegetables',
    recommendedZone: 3, // Zone 3 (Right: 8-15°C)
    tempMin: 8.0,
    tempMax: 12.0,
    tempOptimal: 10.0,
    humidityMin: 90.0,
    humidityMax: 95.0,
    humidityOptimal: 93.0,
    ethyleneSensitivity: 'VERY_HIGH',
    ethyleneProduction: 'LOW',
    ethyleneWarnThreshold: 0.30,
    ethyleneCritThreshold: 0.70,
    maxWeightLossPercent: 5.0,
    baseShelfLifeDays: 10,
    chillingSensitivity: 'HIGH',
    varieties: ['Pusa Sawani', 'Arka Anamika', 'Parbhani Kranti'],
    storageNotes: 'Extremely sensitive to ethylene (yellowing) and chilling injury below 7°C (bleaching and discoloration).'
  },

  // --- SPECIAL POTATO PROFILES (RULE: Distinguish Table, Seed, Processing) ---
  table_potato: {
    id: 'table_potato',
    name: 'Table Potato (Fresh Ware)',
    scientificName: 'Solanum tuberosum',
    category: 'Tubers (Ware / Culinary)',
    recommendedZone: 3, // Zone 3 (8-15°C ~ 10-12°C Optimal)
    tempMin: 10.0,
    tempMax: 13.0,
    tempOptimal: 11.0,
    humidityMin: 90.0,
    humidityMax: 95.0,
    humidityOptimal: 92.0,
    ethyleneSensitivity: 'LOW',
    ethyleneProduction: 'LOW',
    ethyleneWarnThreshold: 0.80,
    ethyleneCritThreshold: 1.80,
    maxWeightLossPercent: 6.0,
    baseShelfLifeDays: 75,
    chillingSensitivity: 'HIGH',
    varieties: ['Kufri Jyoti', 'Kufri Chandramukhi', 'Kufri Pukhraj'],
    storageNotes: 'DO NOT store table potato at 0-2°C! Low temps induce Cold Sweetening (reducing sugars accumulation, bad taste). Best in Zone 3 (10-12°C).'
  },
  seed_potato: {
    id: 'seed_potato',
    name: 'Seed Potato (Tubers for Planting)',
    scientificName: 'Solanum tuberosum',
    category: 'Seed Tubers',
    recommendedZone: 1, // Zone 1 (2-8°C ~ 3-4°C Optimal)
    tempMin: 2.5,
    tempMax: 4.5,
    tempOptimal: 3.5,
    humidityMin: 90.0,
    humidityMax: 95.0,
    humidityOptimal: 93.0,
    ethyleneSensitivity: 'LOW',
    ethyleneProduction: 'LOW',
    ethyleneWarnThreshold: 0.70,
    ethyleneCritThreshold: 1.50,
    maxWeightLossPercent: 4.0,
    baseShelfLifeDays: 180,
    chillingSensitivity: 'LOW',
    varieties: ['Kufri Himalini', 'Kufri Giriraj', 'Certified Breeder Seed'],
    storageNotes: 'Seed potatoes require cold 3–4°C in Zone 1 to suppress apical sprout emergence and preserve vigor for next season.'
  },
  processing_potato: {
    id: 'processing_potato',
    name: 'Processing Potato (Chips / Fries)',
    scientificName: 'Solanum tuberosum',
    category: 'Tubers (Industrial Processing)',
    recommendedZone: 3, // Zone 3 (8-15°C ~ 8-10°C Optimal)
    tempMin: 8.0,
    tempMax: 11.0,
    tempOptimal: 9.5,
    humidityMin: 90.0,
    humidityMax: 95.0,
    humidityOptimal: 92.0,
    ethyleneSensitivity: 'MEDIUM',
    ethyleneProduction: 'LOW',
    ethyleneWarnThreshold: 0.60,
    ethyleneCritThreshold: 1.40,
    maxWeightLossPercent: 5.0,
    baseShelfLifeDays: 90,
    chillingSensitivity: 'HIGH',
    varieties: ['Kufri Chipsona 1', 'Kufri Chipsona 3', 'Kufri Frysona'],
    storageNotes: 'Requires 8–10°C in Zone 3. Storing below 8°C causes dark browning during high-temperature frying (acrylamide formation).'
  },

  // --- TEMPERATE & ROOT CROPS (ZONE 1: 2–8°C) ---
  green_beans: {
    id: 'green_beans',
    name: 'Green Beans (French Beans)',
    scientificName: 'Phaseolus vulgaris',
    category: 'Legumes',
    recommendedZone: 1, // Zone 1 (2-8°C ~ 4-7°C Optimal)
    tempMin: 3.5,
    tempMax: 7.5,
    tempOptimal: 5.5,
    humidityMin: 90.0,
    humidityMax: 95.0,
    humidityOptimal: 93.0,
    ethyleneSensitivity: 'HIGH',
    ethyleneProduction: 'LOW',
    ethyleneWarnThreshold: 0.35,
    ethyleneCritThreshold: 0.75,
    maxWeightLossPercent: 5.0,
    baseShelfLifeDays: 12,
    chillingSensitivity: 'MEDIUM',
    varieties: ['Contender', 'Pusa Parvati', 'Arka Komal'],
    storageNotes: 'Chilling injury occurs below 3°C (russeting/browning). Zone 1 maintain crispness without freezing.'
  },
  peas: {
    id: 'peas',
    name: 'Green Peas (Fresh Pods)',
    scientificName: 'Pisum sativum',
    category: 'Legumes',
    recommendedZone: 1, // Zone 1 (2-8°C) or Zone 2 (0-2°C for shelled)
    tempMin: 1.0,
    tempMax: 4.0,
    tempOptimal: 2.0,
    humidityMin: 92.0,
    humidityMax: 98.0,
    humidityOptimal: 95.0,
    ethyleneSensitivity: 'HIGH',
    ethyleneProduction: 'LOW',
    ethyleneWarnThreshold: 0.30,
    ethyleneCritThreshold: 0.70,
    maxWeightLossPercent: 4.0,
    baseShelfLifeDays: 14,
    chillingSensitivity: 'LOW',
    varieties: ['Arkel', 'Azad P-1', 'Kashi Nandini'],
    storageNotes: 'Rapid conversion of sugar to starch occurs at high temperatures. Cool immediately to 2°C.'
  },

  // --- DEEP COLD STORAGE & BRASSICAS (ZONE 2: 0–2°C [Coldest]) ---
  cabbage: {
    id: 'cabbage',
    name: 'Cabbage',
    scientificName: 'Brassica oleracea var. capitata',
    category: 'Cole Crops',
    recommendedZone: 2, // Zone 2 (0-2°C)
    tempMin: 0.0,
    tempMax: 2.0,
    tempOptimal: 0.5,
    humidityMin: 95.0,
    humidityMax: 98.0,
    humidityOptimal: 97.0,
    ethyleneSensitivity: 'HIGH',
    ethyleneProduction: 'VERY_LOW',
    ethyleneWarnThreshold: 0.25,
    ethyleneCritThreshold: 0.60,
    maxWeightLossPercent: 6.0,
    baseShelfLifeDays: 60,
    chillingSensitivity: 'NONE',
    varieties: ['Golden Acre', 'Pride of India', 'Pusa Mukta'],
    storageNotes: 'Store in Zone 2 near 0°C. Respiration is virtually halted. Keep isolated from ethylene producers.'
  },
  cauliflower: {
    id: 'cauliflower',
    name: 'Cauliflower',
    scientificName: 'Brassica oleracea var. botrytis',
    category: 'Cole Crops',
    recommendedZone: 2, // Zone 2 (0-2°C)
    tempMin: 0.0,
    tempMax: 2.0,
    tempOptimal: 0.5,
    humidityMin: 92.0,
    humidityMax: 98.0,
    humidityOptimal: 95.0,
    ethyleneSensitivity: 'HIGH',
    ethyleneProduction: 'VERY_LOW',
    ethyleneWarnThreshold: 0.25,
    ethyleneCritThreshold: 0.60,
    maxWeightLossPercent: 5.0,
    baseShelfLifeDays: 24,
    chillingSensitivity: 'NONE',
    varieties: ['Pusa Snowball', 'Pusa Deepali', 'Pusa Meghna'],
    storageNotes: 'Curd browning occurs at warm temps. High humidity prevents curd wilting.'
  },
  broccoli: {
    id: 'broccoli',
    name: 'Broccoli',
    scientificName: 'Brassica oleracea var. italica',
    category: 'Cole Crops',
    recommendedZone: 2, // Zone 2 (0-2°C)
    tempMin: 0.0,
    tempMax: 2.0,
    tempOptimal: 0.0,
    humidityMin: 95.0,
    humidityMax: 100.0,
    humidityOptimal: 98.0,
    ethyleneSensitivity: 'VERY_HIGH',
    ethyleneProduction: 'LOW',
    ethyleneWarnThreshold: 0.20,
    ethyleneCritThreshold: 0.50,
    maxWeightLossPercent: 4.0,
    baseShelfLifeDays: 21,
    chillingSensitivity: 'NONE',
    varieties: ['Pusa KTS-1', 'Green Magic', 'Calabrese'],
    storageNotes: 'Extremely perishable. Rapid florets yellowing occurs in presence of ethylene or temps > 3°C.'
  },
  carrot: {
    id: 'carrot',
    name: 'Carrot',
    scientificName: 'Daucus carota',
    category: 'Root Vegetables',
    recommendedZone: 2, // Zone 2 (0-2°C)
    tempMin: 0.0,
    tempMax: 2.0,
    tempOptimal: 0.5,
    humidityMin: 95.0,
    humidityMax: 98.0,
    humidityOptimal: 96.0,
    ethyleneSensitivity: 'VERY_HIGH', // Bitter isocoumarin development
    ethyleneProduction: 'VERY_LOW',
    ethyleneWarnThreshold: 0.20,
    ethyleneCritThreshold: 0.50,
    maxWeightLossPercent: 5.0,
    baseShelfLifeDays: 60,
    chillingSensitivity: 'NONE',
    varieties: ['Pusa Kesar', 'Nantes', 'Chantenay'],
    storageNotes: 'Store in Zone 2 near 0°C. Never store with ethylene-producing apples or tomatoes; causes intense bitterness.'
  },
  radish: {
    id: 'radish',
    name: 'Radish (Mooli)',
    scientificName: 'Raphanus sativus',
    category: 'Root Vegetables',
    recommendedZone: 2, // Zone 2 (0-2°C)
    tempMin: 0.0,
    tempMax: 2.5,
    tempOptimal: 0.5,
    humidityMin: 95.0,
    humidityMax: 98.0,
    humidityOptimal: 96.0,
    ethyleneSensitivity: 'MEDIUM',
    ethyleneProduction: 'VERY_LOW',
    ethyleneWarnThreshold: 0.35,
    ethyleneCritThreshold: 0.80,
    maxWeightLossPercent: 5.5,
    baseShelfLifeDays: 30,
    chillingSensitivity: 'NONE',
    varieties: ['Pusa Chetki', 'Japanese White', 'Pusa Himani'],
    storageNotes: 'Retains crisp pungency at 0–2°C. Prevent root hollow heart and sponginess.'
  },
  turnip: {
    id: 'turnip',
    name: 'Turnip (Shalgam)',
    scientificName: 'Brassica rapa subsp. rapa',
    category: 'Root Vegetables',
    recommendedZone: 2, // Zone 2 (0-2°C)
    tempMin: 0.0,
    tempMax: 2.5,
    tempOptimal: 0.5,
    humidityMin: 95.0,
    humidityMax: 98.0,
    humidityOptimal: 96.0,
    ethyleneSensitivity: 'MEDIUM',
    ethyleneProduction: 'VERY_LOW',
    ethyleneWarnThreshold: 0.35,
    ethyleneCritThreshold: 0.80,
    maxWeightLossPercent: 6.0,
    baseShelfLifeDays: 45,
    chillingSensitivity: 'NONE',
    varieties: ['Pusa Sweti', 'Purple Top White Globe', 'Golden Ball'],
    storageNotes: 'Cold saturation prevents lignification and root shrivel.'
  },
  leafy_vegetables: {
    id: 'leafy_vegetables',
    name: 'Leafy Vegetables (Spinach / Mustard / Lai Xaak)',
    scientificName: 'Spinacia oleracea / Brassica juncea',
    category: 'Leafy Greens',
    recommendedZone: 2, // Zone 2 (0-2°C)
    tempMin: 0.0,
    tempMax: 2.0,
    tempOptimal: 0.5,
    humidityMin: 95.0,
    humidityMax: 100.0,
    humidityOptimal: 98.0,
    ethyleneSensitivity: 'VERY_HIGH',
    ethyleneProduction: 'VERY_LOW',
    ethyleneWarnThreshold: 0.20,
    ethyleneCritThreshold: 0.45,
    maxWeightLossPercent: 3.5,
    baseShelfLifeDays: 14,
    chillingSensitivity: 'NONE',
    varieties: ['Assam Lai Xaak', 'Palak All Green', 'Meghalaya Mustard Greens'],
    storageNotes: 'Extremely high transpiration rate. Requires near-saturation 98% RH and 0°C to halt chlorophyll loss.'
  }
};

/**
 * Intelligent Zone Selection Algorithm
 * Analyzes crop thermal corridor, chilling sensitivity, and compartment availability.
 * @param {Object|string} cropOrId - Crop profile object or crop ID string
 * @returns {Object} { bestZone: number, alternativeZone: number, reason: string }
 */
export function recommendZoneForCrop(cropOrId) {
  let profile = typeof cropOrId === 'string' 
    ? DEFAULT_PRODUCE_PROFILES[cropOrId.toLowerCase()] 
    : cropOrId;

  if (!profile) {
    profile = Object.values(DEFAULT_PRODUCE_PROFILES).find(p => 
      p.name.toLowerCase().includes((cropOrId || '').toString().toLowerCase())
    ) || DEFAULT_PRODUCE_PROFILES['tomato'];
  }

  const optimalTemp = profile.tempOptimal || ((profile.tempMin + profile.tempMax) / 2);
  const isChillingSensitive = profile.chillingSensitivity === 'HIGH' || profile.chillingSensitivity === 'VERY_HIGH';

  // Specific Potato Rules Check
  if (profile.id === 'table_potato') {
    return {
      bestZone: 3,
      alternativeZone: 1,
      reason: 'Table potato requires 10–12°C in Zone 3 (Right) to avoid Cold Sweetening (sugar accumulation).'
    };
  }
  if (profile.id === 'seed_potato') {
    return {
      bestZone: 1,
      alternativeZone: 2,
      reason: 'Seed potato requires 3–4°C in Zone 1 (Left) to suppress sprout growth and maintain vigor.'
    };
  }
  if (profile.id === 'processing_potato') {
    return {
      bestZone: 3,
      alternativeZone: 1,
      reason: 'Processing potato requires 8–10°C in Zone 3 (Right) to prevent frying discoloration.'
    };
  }

  // General Temperature & Chilling Sensitivity Matching
  if (isChillingSensitive || optimalTemp >= 8.0) {
    return {
      bestZone: 3,
      alternativeZone: 1,
      reason: `${profile.name} is chilling-sensitive (Target: ${profile.tempMin}–${profile.tempMax}°C). Zone 3 (8–15°C, Right) prevents chilling injury.`
    };
  } else if (optimalTemp <= 2.0 && !isChillingSensitive) {
    return {
      bestZone: 2,
      alternativeZone: 1,
      reason: `${profile.name} thrives in Deep Cold (Target: 0–2°C). Zone 2 (Center, Coldest) halts respiration and decay.`
    };
  } else {
    return {
      bestZone: 1,
      alternativeZone: (optimalTemp < 4.0 ? 2 : 3),
      reason: `${profile.name} is best stored in Cool Storage (Target: ${profile.tempMin}–${profile.tempMax}°C). Zone 1 (2–8°C, Left) is optimal.`
    };
  }
}
