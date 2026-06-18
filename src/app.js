import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config.js';
import routes from './routes/index.route.js';
import errorMiddleware from './middlewares/error.middleware.js';
import { apiRateLimiter } from './middlewares/rateLimit.middleware.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

const morganStream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

app.use(
  morgan(':method :url :status :response-time ms - :res[content-length]', {
    stream: morganStream
  })
);

app.use('/api/v1', apiRateLimiter, routes);

app.get(/^(?!\/api\/).*/, (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) {
      next(err);
    }
  });
});

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    logger.warn('API route not found', {
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      ip: req.ip
    });
    return res.status(404).json({
      success: false,
      message: 'Route not found',
      requestedUrl: req.originalUrl,
      method: req.method
    });
  }

  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    ip: req.ip
  });

  return res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorMiddleware);

export default app;