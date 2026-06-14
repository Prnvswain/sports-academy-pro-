import express from 'express';
import { body } from 'express-validator';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { successResponse } from '../../utils/response.js';
import logger from '../../utils/logger.js';
import prisma from '../../config/prisma.js';

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

router.post(
  '/enquiry',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required')
  ],
  validationErrorHandler,
  async (req, res, next) => {
    try {
      const { name, email, phone, message } = req.body;

      const enquiry = await prisma.enquiry.create({
        data: {
          name,
          email,
          phone: phone || null,
          subject: 'Public Intake Form Submission',
          message,
          status: 'New'
        }
      });

      logger.info('Public enquiry submitted', {
        name,
        email,
        phone,
        enquiry_id: enquiry.enquiry_id
      });

      res.json(
        successResponse('Thank you for your inquiry! We will get back to you soon.', {
          enquiry_id: enquiry.enquiry_id,
          received_at: enquiry.created_at
        })
      );
    } catch (err) {
      next(err);
    }
  }
);

export default router;
