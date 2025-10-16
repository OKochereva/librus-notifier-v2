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
  },

  gradeNotifications: {
    // Only notify about grades from the last N days (set to 0 to disable filtering)
    maxGradeAgeDays: parseInt(process.env.MAX_GRADE_AGE_DAYS || '7'),

    // Whether to log detailed information about notification decisions
    detailedLogging: process.env.DETAILED_GRADE_LOGGING === 'true'
  }
};

module.exports = config;