/**
 * QORA TECH — Direct ESP32 IP Address Network Service
 * Connects directly to the ESP32 via its local IP address over Wi-Fi/LAN (HTTP REST API / WebSocket).
 * Continuously polls /api/telemetry and dispatches JSON commands to /api/command with CORS support.
 */

class IPService {
  constructor() {
    this.ip = localStorage.getItem('qora_esp32_ip') || '192.168.1.45';
    this.port = parseInt(localStorage.getItem('qora_esp32_port') || '80', 10);
    this.isConnected = false;
    this.pollIntervalMs = 2000;
    this.pollTimer = null;
    this.listeners = new Set();
    this.logListeners = new Set();
    this.lastLatencyMs = 0;
  }

  onTelemetry(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onLog(callback) {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  emitLog(text, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { text, type, timestamp };
    this.logListeners.forEach(cb => {
      try { cb(entry); } catch (err) {}
    });
  }

  emitTelemetry(data) {
    this.listeners.forEach(cb => {
      try { cb(data); } catch (err) {}
    });
  }

  /**
   * Connect to ESP32 using IP Address
   */
  async connect(ip = this.ip, port = this.port) {
    this.ip = ip.trim();
    this.port = port;
    localStorage.setItem('qora_esp32_ip', this.ip);
    localStorage.setItem('qora_esp32_port', this.port.toString());

    this.emitLog(`Testing connection to ESP32 at http://${this.ip}:${this.port}/api/telemetry ...`, 'info');

    try {
      const startTime = performance.now();
      const response = await fetch(`http://${this.ip}:${this.port}/api/telemetry`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const packet = await response.json();
      this.lastLatencyMs = Math.round(performance.now() - startTime);
      this.isConnected = true;

      this.emitLog(`Connected to ESP32 at ${this.ip}:${this.port} (Latency: ${this.lastLatencyMs}ms)`, 'success');
      this.emitTelemetry(packet);

      if (window.AppState) {
        window.AppState.applyTelemetry(packet, 'wifi');
        window.AppState.setConnectionSource('wifi', true);
      }

      // Start periodic polling
      this.startPolling();
      return true;
    } catch (error) {
      this.isConnected = false;
      this.emitLog(`Could not reach ESP32 at ${this.ip}:${this.port} (${error.message}). Checking simulator / offline fallback.`, 'warn');
      
      // If hardware is not yet flashed or on different subnet, provide clean notification
      throw error;
    }
  }

  startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      if (!this.isConnected) return;
      try {
        const startTime = performance.now();
        const response = await fetch(`http://${this.ip}:${this.port}/api/telemetry`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          const packet = await response.json();
          this.lastLatencyMs = Math.round(performance.now() - startTime);
          this.emitTelemetry(packet);

          if (window.AppState) {
            window.AppState.applyTelemetry(packet, 'wifi');
          }
        }
      } catch (err) {
        // Handled gracefully without crash
      }
    }, this.pollIntervalMs);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  disconnect() {
    this.stopPolling();
    this.isConnected = false;
    this.emitLog(`Disconnected from ESP32 IP: ${this.ip}`, 'info');
    if (window.AppState) {
      window.AppState.setConnectionSource('wifi', false);
    }
  }

  /**
   * Send JSON command directly to ESP32 via HTTP POST
   */
  async sendCommand(commandObj) {
    const payload = typeof commandObj === 'string' ? commandObj : JSON.stringify(commandObj);
    this.emitLog(`[HTTP TX] ${payload} -> http://${this.ip}:${this.port}/api/command`, 'tx');

    try {
      const response = await fetch(`http://${this.ip}:${this.port}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(3000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      this.emitLog(`[HTTP RX] ${JSON.stringify(result)}`, 'rx');
      return result;
    } catch (err) {
      this.emitLog(`Command dispatch error: ${err.message}`, 'error');
      throw err;
    }
  }
}

// Global Singleton
window.IPService = new IPService();
