const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  sanitize(message) {
    // Remove passwords from error messages
    return message
      .replace(/password[:\s]+[^\s,}]*/gi, 'password: [REDACTED]')
      .replace(/pass[:\s]+[^\s,}]*/gi, 'pass: [REDACTED]');
  }

  format(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${this.sanitize(message)}`;
  }

  write(level, message) {
    const formatted = this.format(level, message);
    
    // Console output
    console.log(formatted);
    
    // File output
    const logFile = path.join(this.logDir, `${level}.log`);
    fs.appendFileSync(logFile, formatted + '\n');
  }

  info(message) {
    this.write('info', message);
  }

  warn(message) {
    this.write('warn', message);
  }

  error(message) {
    this.write('error', message);
  }
}

module.exports = new Logger();