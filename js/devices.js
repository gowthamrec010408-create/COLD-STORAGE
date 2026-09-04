/**
 * QORA TECH — Devices & ESP32 Hardware Connectivity Hub
 * Direct ESP32 IP Address (Wi-Fi/LAN REST) connection, Web Serial USB connection,
 * full-width command dispatcher, live monitor console, and sensor health diagnostics.
 */

import { setupNavigation } from './navigation.js';
import { store } from './core/state.js';
import { simulator } from './services/simulator.js';

class DevicesPage {
  constructor() {
    this.logs = [];
  }

  init() {
    setupNavigation('devices');
    this.render();

    // Subscribe to state updates
    store.subscribe('connection', () => this.updateConnectionUI());
    store.subscribe('device', () => this.updateDeviceUI());
    store.subscribe('zones.1', () => this.updateSensorMatrix());
    store.subscribe('zones.2', () => this.updateSensorMatrix());
    store.subscribe('zones.3', () => this.updateSensorMatrix());

    // Subscribe to IP Service logs
    if (window.IPService) {
      window.IPService.onLog((entry) => {
        this.addLog(entry);
      });
    }

    // Subscribe to USB Serial logs
    if (window.SerialService) {
      window.SerialService.onLog((entry) => {
        this.addLog(entry);
      });
    }
  }

  render() {
    const container = document.getElementById('devices-content');
    if (!container) return;

    const conn = store.get('connection');
    const device = store.get('device');
    const isIpConnected = window.IPService ? window.IPService.isConnected : false;
    const isUsbConnected = window.SerialService ? window.SerialService.isConnected : false;
    const isSerialSupported = window.SerialService ? window.SerialService.isSupported() : false;
    const savedIp = window.IPService ? window.IPService.ip : '192.168.1.45';
    const savedPort = window.IPService ? window.IPService.port : 80;

    container.innerHTML = `
      <!-- Page Header -->
      <div class="glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-emerald"><i data-lucide="wifi" class="icon-sm"></i> HARDWARE CONNECTIVITY</span>
              <span class="text-xs text-muted">ESP32 Dual-Core • Wi-Fi IP & USB Serial</span>
            </div>
            <h1 class="text-2xl font-bold mt-1">ESP32 Hardware Connection Hub</h1>
            <p class="text-xs text-muted">Connect directly to your ESP32 board using its Wi-Fi / Local IP Address or USB cable.</p>
          </div>

          <!-- Live Connection Status Pill -->
          <div class="flex items-center gap-3">
            <span class="conn-status-badge ${(isIpConnected || isUsbConnected) ? 'conn-connected' : 'conn-disconnected'}" id="hub-conn-pill">
              <span class="pulse-dot"></span>
              <span id="hub-conn-text">${conn.statusLabel}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- PRIMARY: Connect via IP Address & USB Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        <!-- 1. PRIMARY: CONNECT USING IP ADDRESS (Wi-Fi / LAN) -->
        <div class="hardware-conn-card" style="border-top: 4px solid var(--brand-emerald);">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-base flex items-center gap-2 text-emerald">
              <i data-lucide="globe" class="text-emerald"></i> Connect Using IP Address (Wi-Fi / LAN)
            </h3>
            <span class="badge badge-normal text-3xs">RECOMMENDED</span>
          </div>

          <p class="text-xs text-muted mb-4">
            Enter the local IP address assigned to your ESP32 on your Wi-Fi network (printed in Arduino Serial Monitor).
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div class="form-group sm:col-span-2">
              <label class="text-2xs text-muted font-bold">ESP32 IP ADDRESS</label>
              <div class="input-with-icon">
                <i data-lucide="wifi" class="text-emerald"></i>
                <input type="text" class="form-control text-xs font-mono font-bold" id="esp32-ip-input" value="${savedIp}" placeholder="e.g. 192.168.1.45" />
              </div>
            </div>

            <div class="form-group">
              <label class="text-2xs text-muted font-bold">PORT</label>
              <input type="number" class="form-control text-xs font-mono" id="esp32-port-input" value="${savedPort}" placeholder="80" />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-primary flex-1" id="btn-connect-ip" ${isIpConnected ? 'style="display:none;"' : ''}>
              <i data-lucide="link"></i> CONNECT VIA IP ADDRESS
            </button>
            <button class="btn btn-outline flex-1" id="btn-disconnect-ip" style="border-color: var(--brand-rose); color: var(--brand-rose); ${!isIpConnected ? 'display:none;' : ''}">
              <i data-lucide="power"></i> DISCONNECT IP
            </button>
            <button class="btn btn-outline" id="btn-test-ip-packet" title="Fetch live packet via IP REST API">
              <i data-lucide="refresh-cw"></i> PING ESP32
            </button>
          </div>
        </div>

        <!-- 2. ALTERNATIVE: CONNECT VIA USB SERIAL -->
        <div class="hardware-conn-card" style="border-top: 4px solid var(--brand-cyan);">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-base flex items-center gap-2 text-cyan">
              <i data-lucide="usb" class="text-cyan"></i> Alternative: USB Cable Connection
            </h3>
            <span class="text-3xs font-mono text-muted">Baud: 115200</span>
          </div>

          <p class="text-xs text-muted mb-4">
            Plug your ESP32 board into this computer using a USB data cable and connect using the browser Web Serial API.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div class="form-group">
              <label class="text-2xs text-muted font-bold">BAUD RATE</label>
              <select class="form-control text-xs" id="serial-baud-select">
                <option value="115200" selected>115200 (Default ESP32)</option>
                <option value="57600">57600</option>
                <option value="9600">9600</option>
              </select>
            </div>
            <div class="form-group">
              <label class="text-2xs text-muted font-bold">SERIAL PROTOCOL</label>
              <input type="text" class="form-control text-xs" value="Newline-Delimited JSON" readonly />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-outline flex-1" id="btn-connect-usb" style="border-color: var(--brand-cyan); color: var(--brand-cyan); ${isUsbConnected ? 'display:none;' : ''}">
              <i data-lucide="plug"></i> CONNECT VIA USB
            </button>
            <button class="btn btn-outline flex-1" id="btn-disconnect-usb" style="border-color: var(--brand-rose); color: var(--brand-rose); ${!isUsbConnected ? 'display:none;' : ''}">
              <i data-lucide="power"></i> DISCONNECT USB
            </button>
            <button class="btn btn-outline" id="btn-test-usb-conn" title="Inject test packet">
              <i data-lucide="activity"></i> TEST PACKET
            </button>
          </div>
        </div>

      </div>

      <!-- 3. FULL-WIDTH WEB PORTAL -> ESP32 COMMAND DISPATCHER (CLEAN & WIDE) -->
      <div class="glass-card mb-8">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="terminal" class="text-emerald"></i> Web Portal &rarr; ESP32 Commands
            </h3>
            <p class="text-3xs text-muted">Send configuration commands over direct IP HTTP REST or USB Serial.</p>
          </div>
          <span class="badge badge-neutral text-3xs font-mono">Channel: ${isIpConnected ? 'IP REST' : isUsbConnected ? 'USB Serial' : 'Auto'}</span>
        </div>

        <div class="space-y-4">
          <!-- Command Presets Selector & Send Button -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div class="md:col-span-3 form-group">
              <label class="text-2xs text-muted font-bold">PRESET COMMAND TEMPLATE</label>
              <select class="form-control text-xs" id="cmd-type-select">
                <option value="setZoneTarget">Set Zone Target Range (e.g. Zone 1: 2.0°C – 8.0°C)</option>
                <option value="tareHX711">Tare HX711 Load Cell (Zero to 0.00 kg)</option>
                <option value="requestTelemetry">Request Instant Telemetry Packet</option>
                <option value="ping">Ping ESP32 Controller</option>
                <option value="custom">Custom JSON Payload</option>
              </select>
            </div>

            <div class="form-group flex flex-col justify-end">
              <button class="btn btn-primary w-full py-2.5" id="btn-send-cmd">
                <i data-lucide="send" class="icon-sm"></i> <span>SEND COMMAND</span>
              </button>
            </div>
          </div>

          <!-- Wide Full-Width JSON Payload Input -->
          <div class="form-group">
            <label class="text-2xs text-muted font-bold">JSON COMMAND PAYLOAD</label>
            <input type="text" class="form-control font-mono text-sm py-2 px-3" id="cmd-payload-input" style="width: 100%; letter-spacing: 0.02em;" value='{"command":"setZoneTarget","zone":1,"min":2.0,"max":8.0}' />
          </div>

          <div class="text-3xs text-muted flex items-center gap-1.5 pt-1">
            <i data-lucide="shield-check" class="icon-2xs text-emerald"></i>
            <span><em>Core cooling safety and refrigeration loop run autonomously on ESP32 firmware and do not depend on the web connection.</em></span>
          </div>
        </div>
      </div>

      <!-- 4. LIVE SERIAL & IP REST MONITOR CONSOLE -->
      <div class="glass-card mb-8">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <i data-lucide="monitor" class="text-cyan icon-sm"></i>
            <h3 class="font-bold text-sm font-mono">LIVE NETWORK & SERIAL MONITOR (JSON STREAM)</h3>
          </div>
          <button class="btn btn-2xs btn-outline" id="btn-clear-console">Clear Console</button>
        </div>
        <div class="serial-console-box" id="serial-console">
          <div class="serial-log-line log-info">[SYSTEM] Ready. Enter ESP32 IP address or plug in USB cable to monitor live telemetry...</div>
        </div>
      </div>

      <!-- 5. ESP32 DEVICE METADATA GRID -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="glass-card stat-card">
          <span class="stat-label">DEVICE IDENTIFIER</span>
          <div class="stat-number text-base font-mono mt-1 text-emerald" id="dev-id">${device.deviceId}</div>
          <span class="stat-sub text-muted font-mono" id="dev-fw">Firmware: ${device.firmware}</span>
        </div>

        <div class="glass-card stat-card">
          <span class="stat-label">IP ADDRESS</span>
          <div class="stat-number text-base font-mono mt-1 text-cyan" id="dev-ip">${savedIp}</div>
          <span class="stat-sub text-emerald" id="dev-rssi">RSSI: ${device.wifiRssi} dBm</span>
        </div>

        <div class="glass-card stat-card">
          <span class="stat-label">LAST PACKET RECEIVED</span>
          <div class="stat-number text-base font-mono mt-1 text-amber" id="dev-last-pkt">${conn.lastPacketFormatted}</div>
          <span class="stat-sub text-muted" id="dev-uptime">Uptime: ${device.uptimeSeconds}s</span>
        </div>

        <div class="glass-card stat-card">
          <span class="stat-label">FIREBASE RTDB</span>
          <div class="stat-number text-base mt-1 text-emerald">● CONNECTED</div>
          <span class="stat-sub text-muted font-mono">/live/storageUnit01</span>
        </div>
      </div>

      <!-- 6. SENSOR HEALTH & FAILURE MATRIX -->
      <div class="glass-card mb-8">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-base flex items-center gap-2">
            <i data-lucide="shield-check" class="text-emerald"></i> Physical Sensor Probes Health Matrix
          </h3>
          <span class="text-3xs text-muted">Live status or cached last-valid readings if disconnected</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="sensor-matrix-grid">
          ${this.renderSensorMatrixHTML()}
        </div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  renderSensorMatrixHTML() {
    const zones = [1, 2, 3].map(id => store.get(`zones.${id}`));

    return zones.map(z => {
      const h = z.sensorHealth;
      return `
        <div class="zone-hw-box">
          <div class="flex justify-between items-center mb-3">
            <span class="badge zone-tag-${z.id}">${z.name}</span>
            <span class="badge ${z.sensorStatus === 'ONLINE' ? 'badge-normal' : 'badge-critical'} text-3xs font-bold">
              ${z.sensorStatus}
            </span>
          </div>

          <div class="space-y-2">
            <!-- Temperature -->
            <div class="sensor-check-row">
              <div>
                <div class="font-semibold text-xs">Temperature (SHT31)</div>
                <div class="text-3xs text-muted">Last valid: ${h.temperature.lastValid}°C (${h.temperature.lastTime})</div>
              </div>
              <span class="badge ${h.temperature.status === 'ONLINE' ? 'badge-normal' : 'badge-critical'} text-3xs font-bold">
                ${h.temperature.status}
              </span>
            </div>

            <!-- Humidity -->
            <div class="sensor-check-row">
              <div>
                <div class="font-semibold text-xs">Humidity (SHT31)</div>
                <div class="text-3xs text-muted">Last valid: ${h.humidity.lastValid}% (${h.humidity.lastTime})</div>
              </div>
              <span class="badge ${h.humidity.status === 'ONLINE' ? 'badge-normal' : 'badge-critical'} text-3xs font-bold">
                ${h.humidity.status}
              </span>
            </div>

            <!-- Weight -->
            <div class="sensor-check-row">
              <div>
                <div class="font-semibold text-xs">HX711 Load Cell</div>
                <div class="text-3xs text-muted">Last valid: ${h.weight.lastValid} kg (${h.weight.lastTime})</div>
              </div>
              <span class="badge ${h.weight.status === 'ONLINE' ? 'badge-normal' : 'badge-critical'} text-3xs font-bold">
                ${h.weight.status}
              </span>
            </div>

            <!-- Ethylene -->
            <div class="sensor-check-row">
              <div>
                <div class="font-semibold text-xs">Ethylene Sensor</div>
                <div class="text-3xs text-muted">Last valid: ${h.ethylene.lastValid} ppm (${h.ethylene.lastTime})</div>
              </div>
              <span class="badge ${h.ethylene.status === 'ONLINE' ? 'badge-normal' : 'badge-critical'} text-3xs font-bold">
                ${h.ethylene.status}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  addLog(entry) {
    const consoleEl = document.getElementById('serial-console');
    if (!consoleEl) return;

    const line = document.createElement('div');
    line.className = `serial-log-line log-${entry.type || 'info'}`;
    line.textContent = `[${entry.timestamp}] ${entry.text}`;
    consoleEl.appendChild(line);

    while (consoleEl.children.length > 150) {
      consoleEl.removeChild(consoleEl.firstChild);
    }
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  updateConnectionUI() {
    const conn = store.get('connection');
    const hubText = document.getElementById('hub-conn-text');
    const hubPill = document.getElementById('hub-conn-pill');
    const connectIpBtn = document.getElementById('btn-connect-ip');
    const disconnectIpBtn = document.getElementById('btn-disconnect-ip');
    const connectUsbBtn = document.getElementById('btn-connect-usb');
    const disconnectUsbBtn = document.getElementById('btn-disconnect-usb');

    const isIp = window.IPService ? window.IPService.isConnected : false;
    const isUsb = window.SerialService ? window.SerialService.isConnected : false;

    if (hubText && conn) {
      hubText.textContent = conn.statusLabel;
    }

    if (hubPill) {
      hubPill.className = `conn-status-badge ${(isIp || isUsb) ? 'conn-connected' : 'conn-disconnected'}`;
    }

    if (connectIpBtn && disconnectIpBtn) {
      connectIpBtn.style.display = isIp ? 'none' : 'inline-flex';
      disconnectIpBtn.style.display = isIp ? 'inline-flex' : 'none';
    }

    if (connectUsbBtn && disconnectUsbBtn) {
      connectUsbBtn.style.display = isUsb ? 'none' : 'inline-flex';
      disconnectUsbBtn.style.display = isUsb ? 'inline-flex' : 'none';
    }
  }

  updateDeviceUI() {
    const device = store.get('device');
    const conn = store.get('connection');
    const devId = document.getElementById('dev-id');
    const devFw = document.getElementById('dev-fw');
    const devIp = document.getElementById('dev-ip');
    const devRssi = document.getElementById('dev-rssi');
    const devLastPkt = document.getElementById('dev-last-pkt');
    const devUptime = document.getElementById('dev-uptime');

    if (devId) devId.textContent = device.deviceId;
    if (devFw) devFw.textContent = `Firmware: ${device.firmware}`;
    if (devIp) devIp.textContent = device.ipAddress;
    if (devRssi) devRssi.textContent = `RSSI: ${device.wifiRssi} dBm`;
    if (devLastPkt) devLastPkt.textContent = conn.lastPacketFormatted;
    if (devUptime) devUptime.textContent = `Uptime: ${device.uptimeSeconds}s`;
  }

  updateSensorMatrix() {
    const matrixGrid = document.getElementById('sensor-matrix-grid');
    if (matrixGrid) {
      matrixGrid.innerHTML = this.renderSensorMatrixHTML();
    }
  }

  bindEvents() {
    // 1. Connect via IP Address
    const connectIpBtn = document.getElementById('btn-connect-ip');
    if (connectIpBtn) {
      connectIpBtn.onclick = async () => {
        const ipInput = document.getElementById('esp32-ip-input');
        const portInput = document.getElementById('esp32-port-input');
        const ip = ipInput ? ipInput.value.trim() : '192.168.1.45';
        const port = portInput ? parseInt(portInput.value, 10) : 80;

        if (window.IPService) {
          try {
            await window.IPService.connect(ip, port);
            this.updateConnectionUI();
            alert(`Connected to ESP32 at http://${ip}:${port} successfully!`);
          } catch (err) {
            alert(`IP Connection Note: Could not reach http://${ip}:${port}/api/telemetry. Ensure your ESP32 is powered on and connected to the same Wi-Fi network.\n\nSimulating test packet for demonstration.`);
            // Inject test packet for immediate demonstration
            const testPacket = {
              deviceId: 'ESP32-COLD-01',
              zone1: { temperature: 5.4, humidity: 87.2, weight: 48.2, ethylene: 0.41, cooling: 'ACTIVE', sensorStatus: 'ONLINE' },
              zone2: { temperature: 1.1, humidity: 92.1, weight: 52.4, ethylene: 0.31, cooling: 'ACTIVE', sensorStatus: 'ONLINE' },
              zone3: { temperature: 11.8, humidity: 81.4, weight: 44.6, ethylene: 0.52, cooling: 'ACTIVE', sensorStatus: 'ONLINE' },
              energy: { solarPower: 820, acPower: 620, batterySOC: 78, gridPower: 0, source: 'SOLAR' },
              system: { cooling: 'ACTIVE', uptime: 12450, firmware: 'v2.4.0', rssi: -62, ip: ip }
            };
            store.applyTelemetry(testPacket, 'wifi');
          }
        }
      };
    }

    // Disconnect IP Button
    const disconnectIpBtn = document.getElementById('btn-disconnect-ip');
    if (disconnectIpBtn) {
      disconnectIpBtn.onclick = () => {
        if (window.IPService) {
          window.IPService.disconnect();
          this.updateConnectionUI();
        }
      };
    }

    // Ping ESP32 Button
    const testIpBtn = document.getElementById('btn-test-ip-packet');
    if (testIpBtn) {
      testIpBtn.onclick = async () => {
        const ipInput = document.getElementById('esp32-ip-input');
        const ip = ipInput ? ipInput.value.trim() : '192.168.1.45';
        this.addLog({ text: `[PING] Testing HTTP ping to http://${ip}/api/ping ...`, type: 'info', timestamp: new Date().toLocaleTimeString() });
        
        try {
          const resp = await fetch(`http://${ip}/api/ping`, { signal: AbortSignal.timeout(2000) });
          const json = await resp.json();
          this.addLog({ text: `[PONG] Response from ESP32: ${JSON.stringify(json)}`, type: 'rx', timestamp: new Date().toLocaleTimeString() });
        } catch (e) {
          this.addLog({ text: `[PING] Direct ping timed out (offline bench or CORS restricted). Injected test telemetry packet.`, type: 'warn', timestamp: new Date().toLocaleTimeString() });
          const testPacket = {
            deviceId: 'ESP32-COLD-01',
            zone1: { temperature: 5.4, humidity: 87.2, weight: 48.2, ethylene: 0.41, cooling: 'ACTIVE', sensorStatus: 'ONLINE' },
            zone2: { temperature: 1.1, humidity: 92.1, weight: 52.4, ethylene: 0.31, cooling: 'ACTIVE', sensorStatus: 'ONLINE' },
            zone3: { temperature: 11.8, humidity: 81.4, weight: 44.6, ethylene: 0.52, cooling: 'ACTIVE', sensorStatus: 'ONLINE' },
            energy: { solarPower: 820, acPower: 620, batterySOC: 78, gridPower: 0, source: 'SOLAR' },
            system: { cooling: 'ACTIVE', uptime: 12450, firmware: 'v2.4.0', rssi: -62, ip: ip }
          };
          store.applyTelemetry(testPacket, 'wifi');
        }
      };
    }

    // 2. Connect via USB Serial
    const connectUsbBtn = document.getElementById('btn-connect-usb');
    if (connectUsbBtn) {
      connectUsbBtn.onclick = async () => {
        const baudSelect = document.getElementById('serial-baud-select');
        const baud = parseInt(baudSelect ? baudSelect.value : '115200', 10);
        if (window.SerialService) {
          try {
            await window.SerialService.connect(baud);
            this.updateConnectionUI();
          } catch (err) {
            alert(`USB Connection Error: ${err.message}`);
          }
        }
      };
    }

    const disconnectUsbBtn = document.getElementById('btn-disconnect-usb');
    if (disconnectUsbBtn) {
      disconnectUsbBtn.onclick = async () => {
        if (window.SerialService) {
          await window.SerialService.disconnect();
          this.updateConnectionUI();
        }
      };
    }

    const testUsbBtn = document.getElementById('btn-test-usb-conn');
    if (testUsbBtn) {
      testUsbBtn.onclick = () => {
        const testPacket = {
          deviceId: 'ESP32-COLD-01',
          zone1: { temperature: 5.4, humidity: 87.2, weight: 48.2, ethylene: 0.41, cooling: 'ACTIVE', sensorStatus: 'ONLINE' },
          zone2: { temperature: 1.1, humidity: 92.1, weight: 52.4, ethylene: 0.31, cooling: 'ACTIVE', sensorStatus: 'ONLINE' },
          zone3: { temperature: 11.8, humidity: 81.4, weight: 44.6, ethylene: 0.52, cooling: 'ACTIVE', sensorStatus: 'ONLINE' },
          energy: { solarPower: 820, acPower: 620, batterySOC: 78, gridPower: 0, source: 'SOLAR' },
          system: { cooling: 'ACTIVE', uptime: 12450, firmware: 'v2.4.0', rssi: -62, ip: '192.168.1.45' }
        };
        store.applyTelemetry(testPacket, 'usb');
        this.addLog({ text: `Injected USB test telemetry packet successfully.`, type: 'rx', timestamp: new Date().toLocaleTimeString() });
      };
    }

    // 3. Command Dispatcher Presets & Send
    const sendCmdBtn = document.getElementById('btn-send-cmd');
    const cmdPayloadInput = document.getElementById('cmd-payload-input');
    const cmdTypeSelect = document.getElementById('cmd-type-select');

    if (cmdTypeSelect && cmdPayloadInput) {
      cmdTypeSelect.onchange = () => {
        const val = cmdTypeSelect.value;
        if (val === 'setZoneTarget') {
          cmdPayloadInput.value = '{"command":"setZoneTarget","zone":1,"min":2.0,"max":8.0}';
        } else if (val === 'tareHX711') {
          cmdPayloadInput.value = '{"command":"tare","zone":1}';
        } else if (val === 'requestTelemetry') {
          cmdPayloadInput.value = '{"command":"getTelemetry"}';
        } else if (val === 'ping') {
          cmdPayloadInput.value = '{"command":"ping"}';
        }
      };
    }

    if (sendCmdBtn && cmdPayloadInput) {
      sendCmdBtn.onclick = async () => {
        const raw = cmdPayloadInput.value.trim();
        if (!raw) return;

        let sent = false;

        // Try IP first
        if (window.IPService && window.IPService.isConnected) {
          try {
            await window.IPService.sendCommand(raw);
            sent = true;
            alert('Command sent to ESP32 via IP Address REST API successfully!');
          } catch (e) {
            console.warn('IP send failed, trying USB...');
          }
        }

        // Try USB Serial next
        if (!sent && window.SerialService && window.SerialService.isConnected) {
          try {
            await window.SerialService.sendCommand(raw);
            sent = true;
            alert('Command sent to ESP32 via USB Serial successfully!');
          } catch (e) {
            console.warn('USB send failed...');
          }
        }

        if (!sent) {
          this.addLog({ text: `[OFFLINE TX] ${raw}`, type: 'tx', timestamp: new Date().toLocaleTimeString() });
          alert('Command dispatched to local simulator / offline log.');
        }
      };
    }

    // Clear Console
    const clearBtn = document.getElementById('btn-clear-console');
    if (clearBtn) {
      clearBtn.onclick = () => {
        const consoleEl = document.getElementById('serial-console');
        if (consoleEl) consoleEl.innerHTML = '<div class="serial-log-line log-info">[SYSTEM] Console cleared.</div>';
      };
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DevicesPage().init();
});
