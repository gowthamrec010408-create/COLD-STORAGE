/* ==========================================================================
   QORA TECH — Admin Portal & Engineering Diagnostics Script
   ========================================================================== */

// Admin Storage Mode Changer
async function adminUpdateStorageMode(mode) {
  try {
    const res = await fetch('/api/storage/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: mode })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Firebase storage configuration updated to ${mode}. Synced with ESP32.`);
    }
  } catch (err) {
    console.error('Failed to update storage mode:', err);
  }
}

// Autofill crop fields when admin selects a crop
function onAdminCropSelect(cropId) {
  const select = document.getElementById('recCrop');
  const opt = select.options[select.selectedIndex];
  
  const zone = opt.getAttribute('data-zone') || 'ZONE 2';
  const temp = opt.getAttribute('data-temp') || '0–2°C';
  const humidity = opt.getAttribute('data-humidity') || '95–98%';

  document.getElementById('recZone').value = zone;
  document.getElementById('recTemp').value = temp;
  document.getElementById('recHumidity').value = humidity;
}

// Send tailored recommendation to a specific farmer
async function handleSendRecommendation(e) {
  e.preventDefault();
  const farmer_id = document.getElementById('recFarmer').value;
  const season = document.getElementById('recSeason').value;
  const crop_id = document.getElementById('recCrop').value;
  const recommended_zone = document.getElementById('recZone').value;
  const target_temp = document.getElementById('recTemp').value;
  const target_humidity = document.getElementById('recHumidity').value;
  const message = document.getElementById('recMessage').value;

  try {
    const res = await fetch('/api/recommendations/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmer_id, season, crop_id, recommended_zone, target_temp, target_humidity, message
      })
    });
    const data = await res.json();
    if (data.success) {
      alert('✓ Recommendation dispatched! The selected farmer will see this advice on their dashboard.');
      document.getElementById('recMessage').value = '';
    }
  } catch (err) {
    console.error('Error dispatching recommendation:', err);
  }
}

// Trigger simulation anomaly
async function triggerAnomaly(type) {
  try {
    const res = await fetch('/api/demo/anomaly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Demo Anomaly State: ${type.toUpperCase()}`);
    }
  } catch (err) {
    console.error('Failed to trigger anomaly:', err);
  }
}

// Admin Telemetry Poller
async function pollAdminTelemetry() {
  try {
    const res = await fetch('/api/system/status');
    const json = await res.json();
    if (!json.success || !json.data) return;
    const d = json.data;

    // AC
    const acPill = document.getElementById('adminAcPill');
    if (acPill) {
      acPill.innerText = d.actuators.ac_status;
      acPill.className = d.actuators.ac_status === 'ON' ? 'badge-safe' : 'badge-warning';
      document.getElementById('adminAcLoad').innerText = `${d.power.current_load_kw.toFixed(2)} kW`;
    }

    // Solenoid 1
    const sol1Pill = document.getElementById('adminSol1Pill');
    if (sol1Pill) {
      sol1Pill.innerText = d.actuators.solenoid_1;
      sol1Pill.className = d.actuators.solenoid_1 === 'OPEN' ? 'badge-safe' : 'badge-warning';
      document.getElementById('adminSol1State').innerText = d.actuators.solenoid_1;
    }

    // Solenoid 2
    const sol2Pill = document.getElementById('adminSol2Pill');
    if (sol2Pill) {
      sol2Pill.innerText = d.actuators.solenoid_2;
      sol2Pill.className = d.actuators.solenoid_2 === 'OPEN' ? 'badge-safe' : 'badge-warning';
      document.getElementById('adminSol2State').innerText = d.actuators.solenoid_2;
    }

  } catch (err) {
    console.error('Admin telemetry poll error:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  pollAdminTelemetry();
  setInterval(pollAdminTelemetry, 2500);
});
