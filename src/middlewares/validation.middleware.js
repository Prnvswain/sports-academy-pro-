import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/response.js';

export const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Convert errors array to structured object mapping field names to error messages
    const structuredErrors = {};
    errors.array().forEach((error) => {
      const field = error.path || error.param;
      structuredErrors[field] = error.msg;
    });

    return res.status(422).json({
      success: false,
      errors: structuredErrors,
      message: 'Validation failed',
    });
  }
  next();
};