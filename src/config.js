require('dotenv').config();

function validateEnv(key) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return process.env[key];
}

const config = {
  accounts: [
    {
      name: 'Illia',
      username: validateEnv('ILLIA_USERNAME'),
      password: validateEnv('ILLIA_PASSWORD')
    },
    {
      name: 'Kostia',
      username: validateEnv('KOSTIA_USERNAME'),
      password: validateEnv('KOSTIA_PASSWORD')
    }
  ],
  
  telegram: {
    botToken: validateEnv('TELEGRAM_BOT_TOKEN'),
    chatId: validateEnv('TELEGRAM_CHAT_ID')
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;