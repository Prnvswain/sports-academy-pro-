import prisma from '../config/prisma.js';
import { errorResponse } from '../utils/response.js';
import { getSubscriptionStatus } from '../config/subscription.config.js';

/**
 * Blocks academy-scoped routes when subscription is expired.
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
    if (subscription.expired) {
      return res
        .status(402)
        .json(errorResponse('Academy subscription has expired. Renew to restore access.'));
    }

    req.subscription = subscription;
    return next();
  } catch (error) {
    return next(error);
  }
};
