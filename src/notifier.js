const TelegramBot = require('node-telegram-bot-api');
const logger = require('./logger');

class Notifier {
  constructor(config) {
    this.config = config;
    this.bot = new TelegramBot(config.telegram.botToken);
  }

  async send(report) {
    const chunks = this.splitMessage(report, 4000);
    const maxRetries = 3;

    for (const chunk of chunks) {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await this.bot.sendMessage(
            this.config.telegram.chatId,
            chunk,
            { parse_mode: 'Markdown' }
          );
          
          logger.info('Telegram notification sent successfully');
          
          if (chunks.length > 1) {
            await this.sleep(500);
          }
          
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          logger.warn(`Telegram send attempt ${attempt} failed: ${error.message}`);
          
          if (attempt < maxRetries) {
            await this.sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
          }
        }
      }

      if (lastError) {
        throw new Error(`Failed to send Telegram notification after ${maxRetries} attempts: ${lastError.message}`);
      }
    }
  }

  async sendAlert(message) {
    try {
      await this.bot.sendMessage(
        this.config.telegram.chatId,
        `🚨 *BŁĄD SYSTEMU LIBRUS*\n\n${message}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      logger.error(`Failed to send alert: ${error.message}`);
    }
  }

  splitMessage(message, maxLength) {
    if (message.length <= maxLength) {
      return [message];
    }

    const chunks = [];
    const lines = message.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk + line + '\n').length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        if (line.length > maxLength) {
          const words = line.split(' ');
          for (const word of words) {
            if ((currentChunk + word + ' ').length > maxLength) {
              chunks.push(currentChunk.trim());
              currentChunk = word + ' ';
            } else {
              currentChunk += word + ' ';
            }
          }
        } else {
          currentChunk = line + '\n';
        }
      } else {
        currentChunk += line + '\n';
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Notifier;