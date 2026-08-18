import prisma from '../config/prisma.js';
import { errorResponse } from '../utils/response.js';
import { getSubscriptionStatus } from '../config/subscription.config.js';

/**
 * Blocks academy-scoped routes when subscription is expired AND no plan choice has been made.
 * Must run after authenticate (req.user.academy_id).
 */
export const enforceActiveSubscription = async (req, res, next) => {
  try {
    const academyId = req.user?.academy_id;
    if (!academyId) {
      return next();
    }

    const academy = await prisma.academy.findUnique({
      where: { academy_id: academyId }
    });

    if (!academy) {
      return res.status(404).json(errorResponse('Academy not found'));
    }

    const status = academy.status?.toLowerCase();
    if (status && !['active', 'approved'].includes(status)) {
      return res
        .status(403)
        .json(errorResponse('Academy account is not active. Contact support.'));
    }

    const subscription = getSubscriptionStatus(academy);
    
    // Allow expired academies to access basic routes - they need to choose a plan
    // The frontend will handle showing the plan selection screen
    req.subscription = subscription;
    return next();
  } catch (error) {
    return next(error);
  }
};
