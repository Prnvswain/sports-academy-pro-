import logger from '../utils/logger.js';
import { errorResponse } from '../utils/response.js';

const errorMiddleware = (err, req, res, next) => {
  logger.error('Unhandled application error', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    body: req.body,
    params: req.params,
    query: req.query,
    error_message: err.message,
    stack: err.stack
  });

  return res.status(err.statusCode || 500).json(
    errorResponse(err.message || 'Internal Server Error')
  );
};

export default errorMiddleware;