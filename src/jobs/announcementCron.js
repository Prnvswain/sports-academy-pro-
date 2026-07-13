import cron from 'node-cron';
import { publishScheduledAnnouncements, expireAnnouncements } from '../modules/announcements/announcements.service.js';
import logger from '../utils/logger.js';

export const startAnnouncementCronJobs = () => {
  // Run every 5 minutes to publish scheduled announcements
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info('Starting scheduled announcement check');
      const result = await publishScheduledAnnouncements();
      logger.info('Scheduled announcements published', { published: result.published });
    } catch (error) {
      logger.error('Error in scheduled announcement check', { error: error.message });
    }
  });

  // Run every hour to expire announcements
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Starting announcement expiry check');
      const result = await expireAnnouncements();
      logger.info('Expired announcements processed', { expired: result.expired });
    } catch (error) {
      logger.error('Error in announcement expiry check', { error: error.message });
    }
  });

  logger.info('Announcement cron jobs scheduled successfully');
};
