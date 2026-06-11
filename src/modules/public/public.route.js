import express from 'express';
import { body } from 'express-validator';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { successResponse } from '../../utils/response.js';
import logger from '../../utils/logger.js';

const router = express.Router();

router.post(
  '/contact',
  [
    body('name').trim().notEmpty(),
    body('email').isEmail(),
    body('message').trim().notEmpty().isLength({ min: 10 })
  ],
  validationErrorHandler,
  (req, res) => {
    logger.info('Public contact form submission', {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone
    });
    res.json(
      successResponse('Thank you for contacting us. We will respond shortly.', {
        received_at: new Date().toISOString()
      })
    );
  }
);

export default router;
