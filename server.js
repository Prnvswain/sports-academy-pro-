import app from './src/app.js';
import { PORT, NODE_ENV } from './src/config/app.config.js';
import { verifySmtpConnection } from './src/services/mail.service.js';
import { ensureSuperAdminFromEnv } from './src/modules/super-admin/super-admin.service.js';
import logger from './src/utils/logger.js';

const startServer = async () => {
  logger.info('Server boot starting', {
    env: NODE_ENV,
    port: PORT
  });

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
};

startServer();