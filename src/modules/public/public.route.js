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

      // Get academy_id from query参数
      const academyIdParam = req.query.academy_id;
      
      let academy;
      if (academyIdParam) {
        academy = await prisma.academy.findFirst({
          where: { 
            academy_id: parseInt(academyIdParam),
            status: 'ACTIVE'
          },
        });
      } else {
        // No academy_id provided - return error
        return res.status(400).json({
          success: false,
          message: 'Invalid enquiry link: academy_id is required',
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
          email: email || null,
          phone: phone || '0000000000',
          notes: message || null,
          parent_name: parent_name || null,
          age: age ? parseInt(age) : null,
          gender: gender || null,
          sport_interested: interested_sport || null,
          interested_sports: interested_sport ? JSON.stringify([interested_sport]) : null,
          enquiry_source: enquiry_source || 'WEBSITE',
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

      // Create notification for academy admin (non-blocking)
      try {
        const adminUser = await prisma.user.findFirst({
          where: {
            academy_id: academy.academy_id,
            role: 'ACADEMY_ADMIN',
            is_deleted: false
          }
        });

        if (adminUser) {
          await prisma.notification.create({
            data: {
              academy_id: academy.academy_id,
              user_id: adminUser.user_id,
              type: 'GENERAL',
              title: 'New Enquiry Received',
              body: `New enquiry from ${name} for ${interested_sport || 'General'}. Phone: ${phone || 'Not provided'}`,
              metadata: JSON.stringify({
                subtype: 'new_enquiry',
                enquiry_id: enquiry.enquiry_id,
                student_name: name,
                sport: interested_sport
              })
            }
          });
        }
      } catch (notificationError) {
        // Log notification error but don't fail the enquiry submission
        logger.error('Failed to create notification for new enquiry', {
          error: notificationError.message,
          enquiry_id: enquiry.enquiry_id,
          academy_id: academy.academy_id
        });
      }

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
    const academyIdParam = req.query.academy_id;
    
    if (!academyIdParam) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enquiry link: academy_id is required',
      });
    }
    
    const academy = await prisma.academy.findFirst({
      where: { 
        academy_id: parseInt(academyIdParam),
        status: 'ACTIVE'
      },
      select: {
        academy_id: true,
        name: true,
        logo_url: true,
      },
    });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found',
      });
    }

    res.json(
      successResponse('Academy branding retrieved', {
        academy_id: academy.academy_id,
        academy_name: academy.name,
        logo: academy.logo_url,
      }),
    );
  } catch (err) {
    next(err);
  }
});

// Public endpoint to fetch specific academy by ID (no auth required) - DEPRECATED, use /academy with query param
router.get('/academy/:academyId', async (req, res, next) => {
  try {
    const { academyId } = req.params;
    
    const academy = await prisma.academy.findFirst({
      where: { 
        academy_id: parseInt(academyId),
        status: 'ACTIVE'
      },
      select: {
        academy_id: true,
        name: true,
        logo_url: true,
      },
    });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found',
      });
    }

    res.json(
      successResponse('Academy branding retrieved', {
        academy_id: academy.academy_id,
        academy_name: academy.name,
        logo: academy.logo_url,
      }),
    );
  } catch (err) {
    next(err);
  }
});

// Public endpoint to fetch active plans
router.get('/plans', async (req, res, next) => {
  try {
    const setting = await prisma.globalSetting.findUnique({
      where: { setting_key: 'platform_subscription_plans' }
    });
    
    let plans = [];
    if (setting) {
      plans = JSON.parse(setting.setting_value);
    } else {
      plans = [
        {
          id: 'free',
          name: 'Free Grassroots Pack',
          price: 0,
          duration: 'Monthly',
          duration_months: 1,
          teacher_limit: 3,
          student_limit: 30,
          features: ['Smart batch scheduling tracking', 'Automated email notification systems', 'Standard portal access support'],
          highlights: ['Best for getting started'],
          status: 'active'
        },
        {
          id: 'pro',
          name: 'Pro Academy Track',
          price: 790,
          duration: 'Monthly',
          duration_months: 1,
          teacher_limit: 6,
          student_limit: 80,
          features: ['Advanced analytic dashboard data', 'Pending fee transaction metrics', 'Priority live support channels'],
          highlights: ['Recommended for growing academies'],
          status: 'active'
        },
        {
          id: 'plus',
          name: 'Plus Enterprise Level',
          price: 1990,
          duration: 'Monthly',
          duration_months: 1,
          teacher_limit: 20,
          student_limit: 500,
          features: ['Multi-branch sports architecture', 'Custom system API mappings', 'Dedicated customer success manager'],
          highlights: ['Best for established academies'],
          status: 'active'
        }
      ];
    }

    const activePlans = plans.filter(p => p.status === 'active');
    res.json(successResponse('Plans retrieved', activePlans));
  } catch (err) {
    next(err);
  }
});

// Public endpoint to fetch active QR/UPI details
router.get('/payment-settings', async (req, res, next) => {
  try {
    const setting = await prisma.globalSetting.findUnique({
      where: { setting_key: 'platform_payment_settings' }
    });
    
    let paymentSettings = {
      upi_id: 'merchant@upi',
      merchant_name: 'Sports Academy Pro Private Limited',
      qr_enabled: true,
      qr_image_url: '',
      coupons: []
    };
    if (setting) {
      paymentSettings = { ...paymentSettings, ...JSON.parse(setting.setting_value) };
    }
    
    res.json(successResponse('Payment settings retrieved', {
      upi_id: paymentSettings.upi_id,
      merchant_name: paymentSettings.merchant_name,
      qr_enabled: paymentSettings.qr_enabled,
      qr_image_url: paymentSettings.qr_image_url
    }));
  } catch (err) {
    next(err);
  }
});

export default router;
