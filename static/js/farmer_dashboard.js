/* ==========================================================================
   QORA TECH — Farmer Dashboard Real Telemetry Poller & Interaction Logic
   ========================================================================== */

let currentStorageMode = 'THREE_ZONE';

const CROP_META_MAP = {
  'crop_french_beans': { name: 'French Beans', img: '/static/images/crops/french_beans.jpg', target: 5.0, range: '4–7.5°C' },
  'crop_capsicum': { name: 'Capsicum / Bell Pepper', img: '/static/images/crops/capsicum.jpg', target: 7.5, range: '7–9°C' },
  'crop_cabbage': { name: 'Cabbage', img: '/static/images/crops/cabbage.jpg', target: 1.0, range: '0–2°C' },
  'crop_cauliflower': { name: 'Cauliflower', img: '/static/images/crops/cauliflower.jpg', target: 1.0, range: '0–2°C' },
  'crop_carrot': { name: 'Carrot', img: '/static/images/crops/carrot.jpg', target: 0.5, range: '0–2°C' },
  'crop_leafy_veg': { name: 'Leafy Greens / Lai Saag', img: '/static/images/crops/leafy_veg.jpg', target: 0.5, range: '0–2°C' },
  'crop_tomato': { name: 'Tomato', img: '/static/images/crops/tomato.jpg', target: 10.0, range: '8–12°C' },
  'crop_green_chilli': { name: 'Green Chilli', img: '/static/images/crops/green_chilli.jpg', target: 9.5, range: '8–11°C' },
  'crop_potato': { name: 'Potato', img: '/static/images/crops/potato.jpg', target: 9.0, range: '8–12°C' },
  'crop_brinjal': { name: 'Brinjal / Eggplant', img: '/static/images/crops/brinjal.jpg', target: 10.5, range: '9–12.5°C' },
  'crop_ginger': { name: 'Ginger', img: '/static/images/crops/ginger.jpg', target: 12.5, range: '12–14°C' },
  'crop_bhut_jolokia': { name: 'Bhut Jolokia / Ghost Pepper', img: '/static/images/crops/bhut_jolokia.jpg', target: 9.0, range: '8–11°C' }
};

async function switchStorageMode(mode) {
  const btn3 = document.getElementById('btnMode3Zone');
  const btn1 = document.getElementById('btnMode1Zone');
  const grid3 = document.getElementById('threeZoneContainer');
  const grid1 = document.getElementById('singleZoneContainer');
  const kpiMode = document.getElementById('kpiStorageMode');

  if (mode === 'THREE_ZONE') {
    if (btn3) btn3.classList.add('active');
    if (btn1) btn1.classList.remove('active');
    if (grid3) grid3.style.display = 'grid';
    if (grid1) grid1.style.display = 'none';
    if (kpiMode) kpiMode.innerText = '3 ZONE';
  } else {
    if (btn1) btn1.classList.add('active');
    if (btn3) btn3.classList.remove('active');
    if (grid3) grid3.style.display = 'none';
    if (grid1) grid1.style.display = 'block';
    if (kpiMode) kpiMode.innerText = '1 ZONE';
  }
  currentStorageMode = mode;

  try {
    await fetch('/api/storage/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: mode })
    });
  } catch (err) {
    console.error('Storage mode sync error:', err);
  }
}

function selectZoneCropBtn(zoneKey, cropId) {
  // 1. Sync dropdown selection
  const selectId = zoneKey === 'zone1' ? 'z1CropSelect' : zoneKey === 'zone2' ? 'z2CropSelect' : 'z3CropSelect';
  const sel = document.getElementById(selectId);
  if (sel) sel.value = cropId;

  // 2. Sync pill button active state
  const prefix = zoneKey === 'zone1' ? 'pill_z1_' : zoneKey === 'zone2' ? 'pill_z2_' : 'pill_z3_';
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`${prefix}${cropId}`);
  if (activeBtn) activeBtn.classList.add('active');

  // 3. Immediate local preview update
  const meta = CROP_META_MAP[cropId];
  if (meta) {
    const nameEl = document.getElementById(zoneKey === 'zone1' ? 'z1CropName' : zoneKey === 'zone2' ? 'z2CropName' : 'z3CropName');
    const imgEl = document.getElementById(zoneKey === 'zone1' ? 'z1CropImg' : zoneKey === 'zone2' ? 'z2CropImg' : 'z3CropImg');
    const tempText = document.getElementById(zoneKey === 'zone1' ? 'z1OptimalTempText' : zoneKey === 'zone2' ? 'z2OptimalTempText' : 'z3OptimalTempText');
    if (nameEl) nameEl.innerText = meta.name;
    if (imgEl) imgEl.src = meta.img;
    if (tempText) tempText.innerText = `Optimal: ${meta.range}`;
  }

  // 4. Send API update
  updateZoneCrop(zoneKey, cropId);
}

function selectSingleZoneCropBtn(cropName, cropId, cropImg, targetTemp, rangeText) {
  // Sync single crop select
  const select = document.getElementById('singleCropSelect');
  if (select) {
    for (let opt of select.options) {
      if (opt.value === cropName || opt.getAttribute('data-id') === cropId) {
        select.value = opt.value;
        break;
      }
    }
  }

  // Sync quick allocate pill buttons
  document.querySelectorAll('[id^="single_pill_"]').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`single_pill_${cropId}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Update UI Elements
  const nameEl = document.getElementById('singleCropName');
  const imgEl = document.getElementById('singleCropImg');
  const tempValEl = document.getElementById('singleTargetVal');
  const optTempEl = document.getElementById('singleOptimalTemp');

  if (nameEl) nameEl.innerText = cropName;
  if (imgEl) imgEl.src = cropImg;
  if (tempValEl) tempValEl.innerText = `${targetTemp}°C`;
  if (optTempEl) optTempEl.innerText = `Recommended: ${rangeText}`;

  updateZoneCrop('single_zone', cropName);
}

async function updateZoneCrop(zoneKey, cropId) {
  try {
    const res = await fetch('/api/zone/crop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone: zoneKey, crop: cropId })
    });
    const json = await res.json();
    if (json.success) {
      await fetchTelemetry();
    }
  } catch (err) {
    console.error('Failed to update zone crop:', err);
  }
}

function updateSingleZoneCrop(cropName) {
  const select = document.getElementById('singleCropSelect');
  if (!select) return;
  const selectedOpt = select.options[select.selectedIndex];
  if (!selectedOpt) return;
  const cropImg = selectedOpt.getAttribute('data-img');
  const targetTemp = selectedOpt.getAttribute('data-temp');
  const cropId = selectedOpt.getAttribute('data-id');
  const rangeText = selectedOpt.getAttribute('data-range') || '';

  selectSingleZoneCropBtn(cropName, cropId, cropImg, targetTemp, rangeText);
}

async function triggerAnomaly(type) {
  try {
    const res = await fetch('/api/demo/anomaly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type })
    });
    const json = await res.json();
    if (json.success) {
      await fetchTelemetry();
    }
  } catch (err) {
    console.error('Failed to trigger anomaly:', err);
  }
}

// Fetch Real Telemetry from Firebase / Flask Endpoint
async function fetchTelemetry() {
  try {
    const res = await fetch('/api/system/status');
    const json = await res.json();
    if (!json.success) return;
    
    if (!json.has_data) {
      document.getElementById('kpiSystemSubtext').innerText = 'Waiting for sensor data';
      return;
    }

    const d = json.data;

    // 1. Sync Storage Mode if changed
    if (d.storage_mode !== currentStorageMode) {
      switchStorageMode(d.storage_mode);
    }

    // 2. Top KPI Cards
    document.getElementById('kpiSolarPower').innerHTML = `${d.power.solar_power_kw.toFixed(1)} <span style="font-size: 1.2rem; font-weight: 500;">kW</span>`;
    document.getElementById('kpiSolarSubtext').innerText = `Voltage: ${d.power.solar_voltage} V • ${d.power.solar_current} A`;
    
    document.getElementById('kpiBatterySOC').innerHTML = `${Math.round(d.power.battery_soc)} <span style="font-size: 1.2rem; font-weight: 500;">%</span>`;
    document.getElementById('kpiBatterySubtext').innerText = `Backup: ${d.power.estimated_runtime}`;
    
    const sysStatusEl = document.getElementById('kpiSystemStatus');
    sysStatusEl.innerText = d.power.power_status;
    if (d.power.power_status === 'NORMAL') {
      sysStatusEl.style.color = '#059669';
      document.getElementById('kpiSystemSubtext').innerText = 'All Sensors Online';
    } else {
      sysStatusEl.style.color = '#dc2626';
      document.getElementById('kpiSystemSubtext').innerText = 'Power Failure Active';
    }

    // 3. Zone 1 Telemetry
    document.getElementById('z1Temp').innerText = `${d.zone1.temp.toFixed(1)}°C`;
    document.getElementById('z1Humidity').innerText = `${d.zone1.humidity.toFixed(1)}%`;
    document.getElementById('z1Weight').innerText = `${d.zone1.weight.toFixed(1)} kg`;
    document.getElementById('z1Ethylene').innerText = d.zone1.ethylene;
    if (d.zone1.crop_name) {
      const z1Name = document.getElementById('z1CropName');
      if (z1Name) z1Name.innerText = d.zone1.crop_name;
      const z1Img = document.getElementById('z1CropImg');
      if (z1Img && d.zone1.crop_image) z1Img.src = d.zone1.crop_image.startsWith('/') ? d.zone1.crop_image : '/' + d.zone1.crop_image;
    }
    
    const z1Sol = document.getElementById('z1Solenoid');
    z1Sol.innerText = d.actuators.solenoid_1;
    z1Sol.className = `actuator-val ${d.actuators.solenoid_1 === 'OPEN' ? 'val-open' : 'val-closed'}`;
    
    const z1Cool = document.getElementById('z1Cooling');
    z1Cool.innerText = (d.actuators.ac_status === 'ON' && d.actuators.solenoid_1 === 'OPEN') ? 'ACTIVE' : 'STOPPED';
    z1Cool.className = `actuator-val ${(d.actuators.ac_status === 'ON' && d.actuators.solenoid_1 === 'OPEN') ? 'val-on' : 'val-off'}`;

    // 4. Zone 2 (Center) Telemetry
    document.getElementById('z2Temp').innerText = `${d.zone2.temp.toFixed(1)}°C`;
    document.getElementById('z2Humidity').innerText = `${d.zone2.humidity.toFixed(1)}%`;
    document.getElementById('z2Weight').innerText = `${d.zone2.weight.toFixed(1)} kg`;
    document.getElementById('z2Ethylene').innerText = d.zone2.ethylene;
    if (d.zone2.crop_name) {
      const z2Name = document.getElementById('z2CropName');
      if (z2Name) z2Name.innerText = d.zone2.crop_name;
      const z2Img = document.getElementById('z2CropImg');
      if (z2Img && d.zone2.crop_image) z2Img.src = d.zone2.crop_image.startsWith('/') ? d.zone2.crop_image : '/' + d.zone2.crop_image;
    }
    
    const z2Ac = document.getElementById('z2AcStatus');
    z2Ac.innerText = d.actuators.ac_status;
    z2Ac.className = `actuator-val ${d.actuators.ac_status === 'ON' ? 'val-on' : 'val-off'}`;

    // 5. Zone 3 Telemetry
    document.getElementById('z3Temp').innerText = `${d.zone3.temp.toFixed(1)}°C`;
    document.getElementById('z3Humidity').innerText = `${d.zone3.humidity.toFixed(1)}%`;
    document.getElementById('z3Weight').innerText = `${d.zone3.weight.toFixed(1)} kg`;
    document.getElementById('z3Ethylene').innerText = d.zone3.ethylene;
    if (d.zone3.crop_name) {
      const z3Name = document.getElementById('z3CropName');
      if (z3Name) z3Name.innerText = d.zone3.crop_name;
      const z3Img = document.getElementById('z3CropImg');
      if (z3Img && d.zone3.crop_image) z3Img.src = d.zone3.crop_image.startsWith('/') ? d.zone3.crop_image : '/' + d.zone3.crop_image;
    }
    
    const z3Sol = document.getElementById('z3Solenoid');
    z3Sol.innerText = d.actuators.solenoid_2;
    z3Sol.className = `actuator-val ${d.actuators.solenoid_2 === 'OPEN' ? 'val-open' : 'val-closed'}`;
    
    const z3Cool = document.getElementById('z3Cooling');
    z3Cool.innerText = (d.actuators.ac_status === 'ON' && d.actuators.solenoid_2 === 'OPEN') ? 'ACTIVE' : 'STOPPED';
    z3Cool.className = `actuator-val ${(d.actuators.ac_status === 'ON' && d.actuators.solenoid_2 === 'OPEN') ? 'val-on' : 'val-off'}`;

    // 6. Single Zone Mode Telemetry
    document.getElementById('singleTemp').innerText = `${d.single_zone.temp.toFixed(1)}°C`;
    document.getElementById('singleHumidity').innerText = `${d.single_zone.humidity.toFixed(1)}%`;
    document.getElementById('singleWeight').innerText = `${d.single_zone.weight.toFixed(1)} kg`;
    document.getElementById('singleAcStatus').innerText = d.actuators.ac_status === 'ON' ? 'COOLING (Compressor ON)' : 'STOPPED';
    if (d.single_zone.crop_name) {
      const szName = document.getElementById('singleCropName');
      if (szName) szName.innerText = d.single_zone.crop_name;
      const szImg = document.getElementById('singleCropImg');
      if (szImg && d.single_zone.crop_image) szImg.src = d.single_zone.crop_image.startsWith('/') ? d.single_zone.crop_image : '/' + d.single_zone.crop_image;
    }

    // 7. Cooling Flow Diagram
    document.getElementById('coolingFlowBadge').innerText = `Cooling Destination: ${d.actuators.cooling_flow_direction}`;
    document.getElementById('diagAcStatus').innerText = `Status: ${d.actuators.ac_status} (${d.power.current_load_kw} kW Load)`;
    document.getElementById('diagZ1Temp').innerText = `${d.zone1.temp.toFixed(1)}°C`;
    document.getElementById('diagZ2Temp').innerText = `${d.zone2.temp.toFixed(1)}°C`;
    document.getElementById('diagZ3Temp').innerText = `${d.zone3.temp.toFixed(1)}°C`;

    const diagV1 = document.getElementById('diagValve1');
    if (d.actuators.solenoid_1 === 'OPEN') {
      diagV1.className = 'valve-node open';
      diagV1.innerText = 'SOLENOID 1: OPEN';
      document.getElementById('pipeValve1').className = 'cooling-pipe-vertical active';
    } else {
      diagV1.className = 'valve-node';
      diagV1.innerText = 'SOLENOID 1: CLOSED';
      document.getElementById('pipeValve1').className = 'cooling-pipe-vertical';
    }

    const diagV2 = document.getElementById('diagValve2');
    if (d.actuators.solenoid_2 === 'OPEN') {
      diagV2.className = 'valve-node open';
      diagV2.innerText = 'SOLENOID 2: OPEN';
      document.getElementById('pipeValve2').className = 'cooling-pipe-vertical active';
    } else {
      diagV2.className = 'valve-node';
      diagV2.innerText = 'SOLENOID 2: CLOSED';
      document.getElementById('pipeValve2').className = 'cooling-pipe-vertical';
    }

    // 8. Solar & Battery Dashboard
    document.getElementById('solarKwpDisplay').innerHTML = `${d.power.solar_power_kw.toFixed(2)} <span style="font-size: 1.1rem;">kW</span>`;
    document.getElementById('solarVoltageVal').innerText = `${d.power.solar_voltage} V`;
    document.getElementById('solarCurrentVal').innerText = `${d.power.solar_current} A`;
    document.getElementById('chargingTimeText').innerText = d.power.estimated_charging;

    document.getElementById('estimatedBackupTime').innerText = d.power.estimated_runtime;
    document.getElementById('batterySocSmall').innerText = `${Math.round(d.power.battery_soc)}%`;
    document.getElementById('batteryAvailableKwh').innerText = `${d.power.available_kwh.toFixed(1)} kWh`;
    document.getElementById('batteryVoltageVal').innerText = `${d.power.battery_voltage} V`;

    document.getElementById('currentLoadVal').innerHTML = `${d.power.current_load_kw.toFixed(2)} <span style="font-size: 1.1rem;">kW</span>`;
    document.getElementById('powerDirectionText').innerText = d.power.power_direction;
    document.getElementById('powerSourceVal').innerText = d.power.power_source;

    // 9. UV-C Status
    document.getElementById('uvcTextStatus').innerText = d.actuators.uvc_treatment;
    document.getElementById('uvcLastTreatment').innerText = d.actuators.uvc_last_treatment;

  } catch (err) {
    console.error('Error fetching live telemetry:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchTelemetry();
  setInterval(fetchTelemetry, 3000);
});
