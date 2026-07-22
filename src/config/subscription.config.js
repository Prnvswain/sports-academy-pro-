/**
 * Academy subscription tiers and expiry helpers.
 * Plans: free (basic), pro, plus (enterprise).
 */

const PLAN_DEFINITIONS = {
  free: {
    id: 'free',
    label: 'Free',
    trialDays: 30,
    maxCoaches: 3,
    maxStudents: 30
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    trialDays: 365,
    maxCoaches: 6,
    maxStudents: 80
  },
  plus: {
    id: 'plus',
    label: 'Plus',
    trialDays: 365,
    maxCoaches: null,
    maxStudents: null
  }
};

const PLAN_ALIASES = {
  basic: 'free',
  free: 'free',
  pro: 'pro',
  plus: 'plus',
  enterprise: 'plus',
  unlimited: 'plus'
};

let cachedPlans = null;

export function setCachedPlans(plans) {
  cachedPlans = plans;
}

export function getCachedPlans() {
  return cachedPlans;
}

export function normalizePlanId(plan) {
  if (!plan) {
    return PLAN_DEFINITIONS.free.id;
  }
  const key = typeof plan === 'string' ? plan.trim().toLowerCase() : String(plan).toLowerCase();
  
  if (cachedPlans && Array.isArray(cachedPlans)) {
    const found = cachedPlans.find(
      (p) =>
        (p.id && String(p.id).toLowerCase() === key) ||
        (p.name && String(p.name).toLowerCase() === key)
    );
    if (found) {
      return found.id || key;
    }
  }

  return PLAN_ALIASES[key] || key;
}

export function getPlanLimits(plan) {
  if (!plan) return PLAN_DEFINITIONS.free;
  
  const searchKey = typeof plan === 'string' ? plan.trim().toLowerCase() : String(plan).toLowerCase();
  if (cachedPlans && Array.isArray(cachedPlans)) {
    const found = cachedPlans.find(
      (p) => 
        (p.id && String(p.id).toLowerCase() === searchKey) ||
        (p.name && String(p.name).toLowerCase() === searchKey)
    );
    if (found) {
      return {
        id: found.id,
        label: found.name,
        trialDays: found.duration === 'Yearly' ? 365 : found.duration === 'Half-Yearly' ? 180 : found.duration === 'Quarterly' ? 90 : 30,
        maxCoaches: found.teacher_limit === null || found.teacher_limit === undefined ? null : parseInt(found.teacher_limit, 10),
        maxStudents: found.student_limit === null || found.student_limit === undefined ? null : parseInt(found.student_limit, 10),
        features: found.features || [],
        highlights: found.highlights || []
      };
    }
  }

  const id = normalizePlanId(plan);
  return PLAN_DEFINITIONS[id] || PLAN_DEFINITIONS.free;
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * @param {import('../generated/prisma/index.js').Academy | null | undefined} academy
 */
export function getSubscriptionStatus(academy) {
  if (!academy) {
    return {
      plan: 'free',
      expired: false,
      daysLeft: null,
      expiresAt: null,
      warnings: []
    };
  }

  const plan = normalizePlanId(academy.subscription_plan || academy.subscription_tier);
  const limits = getPlanLimits(plan);
  const expiresAt = academy.subscription_expires_at
    ? new Date(academy.subscription_expires_at)
    : null;

  if (!expiresAt) {
    return {
      plan,
      limits,
      expired: false,
      daysLeft: null,
      expiresAt: null,
      warnings: []
    };
  }

  const today = startOfDay(new Date());
  const expiryDay = startOfDay(expiresAt);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((expiryDay - today) / msPerDay);
  const expired = daysLeft < 0;

  const warnings = [];
  for (const d of [4, 3, 2, 1]) {
    if (daysLeft === d) {
      warnings.push({
        daysLeft: d,
        message: `Subscription expires in ${d} day${d === 1 ? '' : 's'}.`
      });
    }
  }

  return {
    plan,
    limits,
    expired,
    daysLeft,
    expiresAt,
    warnings
  };
}
