import fs from 'fs';
import path from 'path';
import winston from 'winston';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const { combine, timestamp, printf, errors, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    stack: stack || null,
    ...meta
  });
});

const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  defaultMeta: {
    service: 'sports-academy-sas'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'app.log')
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        winston.format.colorize(),
        printf(({ level, message, timestamp, stack, ...meta }) => {
          return `${timestamp} ${level}: ${stack || message} ${
            Object.keys(meta).length ? JSON.stringify(meta) : ''
          }`;
        })
      )
    })
  );
}

export default logger;