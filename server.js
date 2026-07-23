import app from './src/app.js';
import { PORT, NODE_ENV } from './src/config/app.config.js';
import { verifySmtpConnection } from './src/services/mail.service.js';
import { ensureSuperAdminFromEnv } from './src/modules/super-admin/super-admin.service.js';
import { startFeeCronJobs } from './src/jobs/feeCron.js';
import { startAnnouncementCronJobs } from './src/jobs/announcementCron.js';
import logger from './src/utils/logger.js';

import prisma from './src/config/prisma.js';
import { setCachedPlans } from './src/config/subscription.config.js';

const startServer = async () => {
  logger.info('Server boot starting', {
    env: NODE_ENV,
    port: PORT
  });

  // Add global uncaught exception handler
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack
    });
    // Don't exit immediately, give time for logs to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Add global unhandled rejection handler
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason,
      promise: promise
    });
  });

  // Load dynamic plans into cache on startup
  try {
    const setting = await prisma.globalSetting.findUnique({
      where: { setting_key: 'platform_subscription_plans' }
    });
    if (setting) {
      setCachedPlans(JSON.parse(setting.setting_value));
      logger.info('Dynamic subscription plans loaded into cache on startup');
    }
  } catch (error) {
    logger.error('Failed to load dynamic subscription plans into cache on startup', {
      message: error.message
    });
  }

  const server = app.listen(PORT, () => {
    logger.info('Server started successfully', {
      env: NODE_ENV,
      port: PORT
    });
  });

  process.on('SIGINT', () => {
    logger.warn('SIGINT received, shutting down server');
    server.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    logger.warn('SIGTERM received, shutting down server');
    server.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });
  });

  try {
    await ensureSuperAdminFromEnv();
  } catch (error) {
    logger.error('Super admin initialization failed', {
      message: error.message,
      stack: error.stack
    });
  }

  try {
    await verifySmtpConnection();
  } catch (error) {
    logger.error('SMTP connection check failed', {
      message: error.message,
      stack: error.stack
    });
  }

  // Start cron jobs
  try {
    startFeeCronJobs();
    startAnnouncementCronJobs();
    logger.info('All cron jobs started successfully');
  } catch (error) {
    logger.error('Cron jobs initialization failed', {
      message: error.message,
      stack: error.stack
    });
  }
};

startServer();