/* ==========================================================================
   QORA TECH — Historical Telemetry Chart.js Analytics
   ========================================================================== */

let tempChartInstance = null;
let powerChartInstance = null;
let batteryChartInstance = null;
let humidityChartInstance = null;

async function loadHistoryData(range = 'today') {
  // Update button active state
  ['today', '7days', '30days'].forEach(r => {
    const btn = document.getElementById(`btnHistory${r.charAt(0).toUpperCase() + r.slice(1)}`);
    if (btn) {
      if (r === range) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  try {
    const res = await fetch(`/api/history/data?range=${range}`);
    const json = await res.json();
    if (!json.success) return;
    const { labels, datasets } = json;

    // 1. Temperature Chart
    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    if (tempChartInstance) tempChartInstance.destroy();
    tempChartInstance = new Chart(ctxTemp, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Zone 1 (2–8°C)',
            data: datasets.temp_zone1,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.3,
            fill: false
          },
          {
            label: 'Zone 2 (0–2°C)',
            data: datasets.temp_zone2,
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            tension: 0.3,
            fill: false
          },
          {
            label: 'Zone 3 (8–15°C)',
            data: datasets.temp_zone3,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.3,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          y: {
            title: { display: true, text: 'Temperature (°C)' },
            suggestedMin: 0,
            suggestedMax: 16
          }
        }
      }
    });

    // 2. Solar Power vs Load Chart
    const ctxPower = document.getElementById('powerChart').getContext('2d');
    if (powerChartInstance) powerChartInstance.destroy();
    powerChartInstance = new Chart(ctxPower, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Solar Generation (kW)',
            data: datasets.solar_power,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Cold Storage Load (kW)',
            data: datasets.solar_power.map(s => (s > 0 ? 1.6 : 0.35)),
            borderColor: '#0284c7',
            borderDash: [5, 5],
            tension: 0.1,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            title: { display: true, text: 'Power (kW)' },
            suggestedMin: 0,
            suggestedMax: 2.6
          }
        }
      }
    });

    // 3. Battery SOC & AC Runtime
    const ctxBattery = document.getElementById('batteryChart').getContext('2d');
    if (batteryChartInstance) batteryChartInstance.destroy();
    batteryChartInstance = new Chart(ctxBattery, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Battery SOC (%)',
            data: datasets.battery_soc,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            title: { display: true, text: 'State of Charge (%)' },
            suggestedMin: 40,
            suggestedMax: 100
          }
        }
      }
    });

    // 4. Humidity & Ethylene
    const ctxHum = document.getElementById('humidityChart').getContext('2d');
    if (humidityChartInstance) humidityChartInstance.destroy();
    humidityChartInstance = new Chart(ctxHum, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Relative Humidity (%)',
            data: datasets.humidity,
            borderColor: '#059669',
            yAxisID: 'y',
            tension: 0.3
          },
          {
            label: 'Ethylene Gas (ppm)',
            data: datasets.ethylene,
            borderColor: '#ea580c',
            yAxisID: 'y1',
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Humidity (%)' },
            suggestedMin: 80,
            suggestedMax: 100
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Ethylene (ppm)' },
            grid: { drawOnChartArea: false },
            suggestedMin: 0,
            suggestedMax: 0.2
          }
        }
      }
    });

  } catch (err) {
    console.error('Failed to load history analytics:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadHistoryData('today');
});
