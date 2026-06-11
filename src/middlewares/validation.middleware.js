import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/response.js';

export const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json(errorResponse(errors.array()[0].msg, {}));
  }
  next();
};