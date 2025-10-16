const config = require('./config');
const LibrusClient = require('./librus-client');
const StateManager = require('./state-manager');
const ReportGenerator = require('./report-generator');
const ScheduleFormatter = require('./schedule-formatter');
const Notifier = require('./notifier');
const logger = require('./logger');

async function main() {
  // Check if this is the 16:00 schedule run
  const currentHour = new Date().getHours();
  const isScheduleTime = currentHour === 16;

  if (isScheduleTime) {
    // At 16:00, send both updates and tomorrow's schedule
    await checkForUpdates();
    await sendTomorrowSchedule();
  } else {
    // At other times, only check for updates
    await checkForUpdates();
  }
}

async function sendTomorrowSchedule() {
  logger.info('=== Sending tomorrow schedule ===');
  
  const notifier = new Notifier(config);
  const scheduleReports = [];

  for (const account of config.accounts) {
    try {
      const client = new LibrusClient(account.username, account.password);
      
      await client.login();
      const timetableData = await client.fetchSchedule();
      
      const scheduleReport = ScheduleFormatter.formatTomorrowSchedule(
        account.name,
        timetableData
      );
      
      scheduleReports.push(scheduleReport);
      
    } catch (error) {
      logger.error(`Error fetching schedule for ${account.name}: ${error.message}`);
      scheduleReports.push(`❌ Błąd przy pobieraniu planu dla ${account.name}`);
    }
  }

  if (scheduleReports.length > 0) {
    const fullReport = scheduleReports.join('\n');
    
    try {
      await notifier.send(fullReport);
      logger.info('Tomorrow schedule sent successfully');
    } catch (error) {
      logger.error(`Failed to send schedule: ${error.message}`);
    }
  }

  logger.info('=== Schedule send completed ===\n');
}

async function checkForUpdates() {
  logger.info('=== Starting Librus check ===');

  const stateManager = new StateManager(config);
  const notifier = new Notifier(config);
  const allUpdates = [];
  let hasBlockingErrors = false;
  const errors = [];

  for (const account of config.accounts) {
    logger.info(`Checking account: ${account.name}`);
    
    try {
      const client = new LibrusClient(account.username, account.password);
      
      // Login with retry logic
      try {
        await client.login();
      } catch (loginError) {
        errors.push(`Błąd logowania dla ${account.name}: ${loginError.message}`);
        hasBlockingErrors = true;
        continue;
      }
      
      // Fetch data
      const currentData = await client.fetchAllData();
      logger.info(`Data fetched for ${account.name}`);
      
      // Load previous state
      const previousData = stateManager.load(account.username);
      
      // Find changes
      const updates = stateManager.findChanges(previousData, currentData);
      
      if (updates.hasChanges) {
        logger.info(`Found ${updates.totalCount} new items for ${account.name}`);
        allUpdates.push({
          accountName: account.name,
          updates
        });
        
        // Save new state
        stateManager.save(account.username, currentData);
      } else {
        logger.info(`No new updates for ${account.name}`);
      }
      
    } catch (error) {
      logger.error(`Error checking ${account.name}: ${error.message}`);
      errors.push(`Błąd dla ${account.name}: ${error.message}`);
      
      // Network errors are blocking
      if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        hasBlockingErrors = true;
      }
    }
  }

  // Send update notifications
  if (allUpdates.length > 0) {
    logger.info(`Generating report for ${allUpdates.length} account(s) with updates`);
    
    const report = ReportGenerator.generate(allUpdates);
    
    try {
      await notifier.send(report);
      logger.info('Notification sent successfully');
    } catch (error) {
      logger.error(`Failed to send notification: ${error.message}`);
      errors.push(`Nie udało się wysłać powiadomienia: ${error.message}`);
      hasBlockingErrors = true;
    }
  } else {
    logger.info('No updates found - staying silent');
  }

  // Send error alerts for blocking errors only
  if (hasBlockingErrors) {
    logger.error('Blocking errors occurred, sending alert');
    const alertMessage = errors.join('\n\n');
    await notifier.sendAlert(alertMessage);
  }

  logger.info('=== Check completed ===\n');
  
  if (hasBlockingErrors) {
    process.exit(1);
  }
}

main().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});