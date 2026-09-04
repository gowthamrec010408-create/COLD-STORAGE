/**
 * QORA TECH — Web Serial API Service
 * Manages direct USB Serial communication with ESP32 at 115,200 baud.
 * Parses newline-delimited JSON telemetry packets and sends configuration commands.
 */

class SerialService {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.readableStreamClosed = null;
    this.writableStreamClosed = null;
    this.isConnected = false;
    this.baudRate = 115200;
    this.listeners = new Set();
    this.logListeners = new Set();
    this.lineBuffer = '';
    this.keepReading = false;
  }

  /**
   * Check if Web Serial API is supported in current browser
   */
  isSupported() {
    return 'serial' in navigator;
  }

  /**
   * Subscribe to parsed telemetry JSON packets
   */
  onTelemetry(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Subscribe to raw serial log lines for the terminal / console
   */
  onLog(callback) {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  emitLog(text, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { text, type, timestamp };
    this.logListeners.forEach(cb => {
      try { cb(entry); } catch (err) { console.error('Serial log listener error:', err); }
    });
  }

  emitTelemetry(data) {
    this.listeners.forEach(cb => {
      try { cb(data); } catch (err) { console.error('Serial telemetry listener error:', err); }
    });
  }

  /**
   * Request user to select ESP32 port and establish connection
   */
  async connect(baudRate = 115200) {
    if (!this.isSupported()) {
      const msg = 'Web Serial API is not supported by this browser. Use a Chromium-based browser (Chrome, Edge, Brave, Opera).';
      this.emitLog(msg, 'error');
      throw new Error(msg);
    }

    try {
      this.baudRate = baudRate;
      this.emitLog(`Requesting USB Serial Port (Baud: ${this.baudRate})...`, 'info');
      
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: this.baudRate });
      this.isConnected = true;
      this.keepReading = true;

      this.emitLog(`Connected to USB Serial port successfully at ${this.baudRate} baud.`, 'success');
      
      // Update global app state
      if (window.AppState) {
        window.AppState.setConnectionSource('usb', true);
      }

      // Start background reading loop
      this.readLoop();
      return true;
    } catch (error) {
      this.isConnected = false;
      this.emitLog(`USB Connection failed: ${error.message}`, 'error');
      if (window.AppState) {
        window.AppState.setConnectionSource('usb', false);
      }
      throw error;
    }
  }

  /**
   * Continuous reading loop parsing incoming newline-terminated JSON
   */
  async readLoop() {
    while (this.port && this.port.readable && this.keepReading) {
      const textDecoder = new TextDecoderStream();
      this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      this.reader = reader;

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            this.handleIncomingChunk(value);
          }
        }
      } catch (error) {
        if (this.keepReading) {
          this.emitLog(`Serial stream read error: ${error.message}`, 'error');
        }
      } finally {
        reader.releaseLock();
      }
    }
  }

  /**
   * Accumulate buffer and parse JSON when newline is encountered
   */
  handleIncomingChunk(chunk) {
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split(/\r?\n/);
    // Keep the incomplete trailing fragment in the buffer
    this.lineBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      this.emitLog(`[RX] ${trimmed}`, 'rx');

      // Attempt to parse JSON packet
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const packet = JSON.parse(trimmed);
          this.emitTelemetry(packet);

          // If global AppState exists, update state directly
          if (window.AppState) {
            window.AppState.applyTelemetry(packet, 'usb');
          }
        } catch (parseErr) {
          // Non-JSON debug message from ESP32
          this.emitLog(`[DBG] ${trimmed}`, 'debug');
        }
      } else {
        this.emitLog(`[DBG] ${trimmed}`, 'debug');
      }
    }
  }

  /**
   * Send JSON command to ESP32 over USB Serial
   */
  async sendCommand(commandObj) {
    if (!this.isConnected || !this.port || !this.port.writable) {
      throw new Error('USB Serial is not connected.');
    }

    try {
      const jsonString = (typeof commandObj === 'string' ? commandObj : JSON.stringify(commandObj)) + '\n';
      const textEncoder = new TextEncoderStream();
      this.writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
      const writer = textEncoder.writable.getWriter();

      await writer.write(jsonString);
      writer.releaseLock();

      this.emitLog(`[TX] ${jsonString.trim()}`, 'tx');
      return true;
    } catch (err) {
      this.emitLog(`Failed to send command: ${err.message}`, 'error');
      throw err;
    }
  }

  /**
   * Close USB Serial connection cleanly
   */
  async disconnect() {
    this.keepReading = false;

    if (this.reader) {
      try { await this.reader.cancel(); } catch (e) {}
    }

    if (this.port) {
      try {
        await this.port.close();
        this.emitLog('USB Serial port disconnected.', 'info');
      } catch (err) {
        this.emitLog(`Error closing serial port: ${err.message}`, 'warn');
      }
    }

    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isConnected = false;
    this.lineBuffer = '';

    if (window.AppState) {
      window.AppState.setConnectionSource('usb', false);
    }
  }
}

// Global Singleton
window.SerialService = new SerialService();
