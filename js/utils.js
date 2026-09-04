/**
 * QORA TECH — Math, Timestamp & Formatting Utilities
 */

export function formatTemp(celsius) {
  if (celsius === undefined || celsius === null || isNaN(celsius)) return '--';
  return `${Number(celsius).toFixed(1)}°C`;
}

export function formatHumidity(rh) {
  if (rh === undefined || rh === null || isNaN(rh)) return '--';
  return `${Number(rh).toFixed(1)}%`;
}

export function formatWeight(kg) {
  if (kg === undefined || kg === null || isNaN(kg)) return '--';
  return `${Number(kg).toFixed(1)} kg`;
}

export function formatEthylene(ppm) {
  if (ppm === undefined || ppm === null || isNaN(ppm)) return '--';
  return `${Number(ppm).toFixed(2)} ppm`;
}

export function formatPower(kw) {
  if (kw === undefined || kw === null || isNaN(kw)) return '0.00 kW';
  return `${Number(kw).toFixed(2)} kW`;
}

export function formatTimestamp(isoString) {
  if (!isoString) return new Date().toLocaleTimeString();
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
