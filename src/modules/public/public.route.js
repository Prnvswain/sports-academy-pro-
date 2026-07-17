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
    body('message').trim().notEmpty().isLength({ min: 10 }),
  ],
  validationErrorHandler,
  (req, res) => {
    logger.info('Public contact form submission', {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
    });
    res.json(
      successResponse('Thank you for contacting us. We will respond shortly.', {
        received_at: new Date().toISOString(),
      }),
    );
  },
);

router.post(
  '/enquiry',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  validationErrorHandler,
  async (req, res, next) => {
    try {
      const {
        name,
        email,
        phone,
        message,
        parent_name,
        age,
        gender,
        interested_sport,
        enquiry_source,
        follow_up_date,
      } = req.body;

      // Get academy_id from URL parameter or use first active academy
      const urlParams = new URLSearchParams(req.originalUrl.split('?')[1]);
      const academyIdParam = urlParams.get('academy_id');
      
      let academy;
      if (academyIdParam) {
        academy = await prisma.academy.findFirst({
          where: { 
            academy_id: parseInt(academyIdParam),
            status: 'ACTIVE'
          },
        });
      } else {
        // Fallback to first active academy
        academy = await prisma.academy.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { academy_id: 'asc' },
        });
      }

      if (!academy) {
        return res.status(400).json({
          success: false,
          message: 'No active academy found. Please contact support.',
        });
      }

      const enquiry = await prisma.enquiry.create({
        data: {
          academy_id: academy.academy_id,
          student_name: name,
          email,
          phone: phone || null,
          notes: message,
          parent_name: parent_name || null,
          age: age ? parseInt(age) : null,
          gender: gender || null,
          sport_interested: interested_sport || null,
          interested_sports: interested_sport ? JSON.stringify([interested_sport]) : null,
          enquiry_source: enquiry_source || null,
          follow_up_date: follow_up_date ? new Date(follow_up_date) : null,
          status: 'NEW',
        },
      });

      logger.info('Public enquiry submitted', {
        name,
        email,
        phone,
        academy_id: academy.academy_id,
        enquiry_id: enquiry.enquiry_id,
        sport_interested: interested_sport,
      });

      res.json(
        successResponse('Thank you for your inquiry! We will get back to you soon.', {
          enquiry_id: enquiry.enquiry_id,
          received_at: enquiry.created_at,
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// Public endpoint to fetch global sports (no auth required)
router.get('/sports', async (req, res, next) => {
  try {
    const sports = await prisma.globalSport.findMany({
      orderBy: { name: 'asc' }
    });

    const formattedSports = sports.map(sport => ({
      id: sport.id,
      name: sport.name,
      icon: sport.icon,
      attributes: sport.attributes ? JSON.parse(sport.attributes) : []
    }));

    res.json(successResponse('Global sports retrieved', formattedSports));
  } catch (err) {
    next(err);
  }
});

// Public endpoint to fetch academy branding (no auth required)
router.get('/academy', async (req, res, next) => {
  try {
    // Get the first active academy for public branding
    const academy = await prisma.academy.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { academy_id: 'asc' },
      select: {
        academy_id: true,
        name: true,
        logo_url: true,
      },
    });

    if (!academy) {
      return res.json(
        successResponse('No active academy found', {
          academy_name: 'Sports Academy',
          logo: null,
        }),
      );
    }

    res.json(
      successResponse('Academy branding retrieved', {
        academy_name: academy.name,
        logo: academy.logo_url,
      }),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
