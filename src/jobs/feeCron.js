import cron from 'node-cron';
import { checkOverdueFees, sendOverdueFeeReminders } from '../modules/fees/fees.service.js';
import logger from '../utils/logger.js';

export const startFeeCronJobs = () => {
  // Run overdue fee check daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('Starting daily overdue fee check');
      await checkOverdueFees();
      logger.info('Daily overdue fee check completed');
    } catch (error) {
      logger.error('Error in daily overdue fee check', { error: error.message });
    }
  });

  // Run overdue fee reminders daily at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    try {
      logger.info('Starting daily overdue fee reminders');
      await sendOverdueFeeReminders();
      logger.info('Daily overdue fee reminders completed');
    } catch (error) {
      logger.error('Error in daily overdue fee reminders', { error: error.message });
    }
  });

  logger.info('Fee cron jobs scheduled successfully');
};
