import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';
import { JWT_SECRET, JWT_EXPIRE, BCRYPT_SALT_ROUNDS } from '../../config/app.config.js';
import { logAudit } from '../../utils/audit.util.js';
import logger from '../../utils/logger.js';

export const loginSuperAdmin = async ({ email, password, ip }) => {
  const admin = await prisma.superAdmin.findFirst({
    where: { email: email.trim().toLowerCase(), is_active: true }
  });

  if (!admin) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      super_admin_id: admin.super_admin_id,
      email: admin.email,
      role: 'SUPER_ADMIN',
      name: admin.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id: admin.super_admin_id,
    action: 'SUPER_ADMIN_LOGIN',
    ip_address: ip
  });

  logger.info('Super admin login', { super_admin_id: admin.super_admin_id, ip });

  return {
    token,
    user: {
      super_admin_id: admin.super_admin_id,
      name: admin.name,
      email: admin.email,
      role: 'SUPER_ADMIN'
    }
  };
};

export const listAcademies = async () => {
  try {
    const academies = await prisma.academy.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            students: true,
            coaches: true,
            batches: true
          }
        }
      }
    });
    
    // Ensure each academy has _count with default values
    return academies.map(a => ({
      ...a,
      _count: {
        students: a._count?.students ?? 0,
        coaches: a._count?.coaches ?? 0,
        batches: a._count?.batches ?? 0
      }
    }));
  } catch (error) {
    // Return empty array on error
    return [];
  }
};

const getDynamicPlans = async () => {
  const setting = await prisma.globalSetting.findUnique({
    where: { setting_key: 'platform_subscription_plans' }
  });
  if (setting) {
    try {
      return JSON.parse(setting.setting_value);
    } catch (e) {
      // ignore
    }
  }
  return [];
};

const getDefaultPlans = () => [
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

export const listPlans = async () => {
  let plans = await getDynamicPlans();
  if (plans.length === 0) {
    plans = getDefaultPlans();
  }
  return plans.map(p => ({
    plan_id: p.id,
    id: p.id,
    name: p.name,
    price: p.price,
    duration: p.duration,
    duration_months: p.duration_months || 1,
    teacher_limit: p.teacher_limit,
    student_limit: p.student_limit,
    features: p.features || [],
    highlights: p.highlights || [],
    status: p.status || 'active',
    is_active: p.status === 'active'
  }));
};

export const listSports = async () => {
  try {
    const sports = await prisma.globalSport.findMany({
      orderBy: { name: 'asc' }
    });
    
    return sports.map(sport => ({
      id: sport.id,
      name: sport.name,
      icon: sport.icon,
      attributes: sport.attributes ? JSON.parse(sport.attributes) : []
    }));
  } catch (error) {
    return [];
  }
};

export const createSport = async ({ name, icon, attributes }) => {
  try {
    if (!name) {
      const error = new Error('Sport name is required');
      error.statusCode = 400;
      throw error;
    }

    const finalIcon = icon && icon.trim() !== '' ? icon.trim() : '🏅';

    const sport = await prisma.globalSport.create({
      data: {
        name: name.trim(),
        icon: finalIcon,
        attributes: typeof attributes === 'string' ? attributes : JSON.stringify(attributes || [])
      }
    });

    return {
      id: sport.id,
      name: sport.name,
      icon: sport.icon,
      attributes: typeof sport.attributes === 'string' ? JSON.parse(sport.attributes) : sport.attributes
    };
  } catch (error) {
    if (error.code === 'P2002') {
      const duplicateError = new Error('This sport already exists in global records');
      duplicateError.statusCode = 409;
      throw duplicateError;
    }
    throw error;
  }
};

export const deleteSport = async (id) => {
  try {
    const sportId = parseInt(id, 10);
    
    // Check if sport exists
    const sport = await prisma.globalSport.findUnique({
      where: { id: sportId }
    });

    if (!sport) {
      const error = new Error('Sport not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if sport is being used in any academy
    const sportUsage = await prisma.sport.findMany({
      where: { global_sport_id: sportId }
    });

    if (sportUsage.length > 0) {
      const error = new Error('This sport is currently in use by academies and cannot be deleted');
      error.statusCode = 409;
      throw error;
    }

    // Delete the sport
    await prisma.globalSport.delete({
      where: { id: sportId }
    });

    return { id: sportId, name: sport.name };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw new Error('Failed to delete sport: ' + error.message);
  }
};

export const updateGlobalSportAttributes = async (id, attributes) => {
  console.log('=== updateGlobalSportAttributes DEBUG ===');
  console.log('id:', id, 'type:', typeof id);
  console.log('attributes:', attributes);

  try {
    const sportId = parseInt(id, 10);
    
    // Check if sport exists
    const sport = await prisma.globalSport.findUnique({
      where: { id: sportId }
    });

    console.log('Found GlobalSport:', sport);

    if (!sport) {
      const error = new Error('Sport not found');
      error.statusCode = 404;
      throw error;
    }

    // Update attributes
    const updated = await prisma.globalSport.update({
      where: { id: sportId },
      data: {
        attributes: JSON.stringify(attributes || [])
      }
    });

    console.log('Updated GlobalSport:', updated);

    // Sync attributes to all academies that have this global sport
    const academySports = await prisma.sport.findMany({
      where: { global_sport_id: sportId },
      select: { sport_id: true, academy_id: true }
    });

    console.log('Found academy sports using this global sport:', academySports);

    // Import sync function dynamically to avoid circular dependency
    const { syncGlobalSportAttributes } = await import('../performance/performance.service.js');

    for (const academySport of academySports) {
      console.log(`Syncing attributes to academy ${academySport.academy_id}, sport ${academySport.sport_id}`);
      try {
        await syncGlobalSportAttributes(academySport.academy_id, academySport.sport_id);
      } catch (error) {
        console.error(`Failed to sync to academy ${academySport.academy_id}:`, error);
        // Continue with other academies even if one fails
      }
    }

    console.log('Sync complete for all academies');

    return {
      id: updated.id,
      name: updated.name,
      icon: updated.icon,
      attributes: JSON.parse(updated.attributes)
    };
  } catch (error) {
    console.error('updateGlobalSportAttributes error:', error);
    if (error.statusCode) {
      throw error;
    }
    throw new Error('Failed to update sport attributes: ' + error.message);
  }
};
export const seedDefaultSports = async () => {
  const defaultSports = [
    { name: 'Cricket', icon: '🏏', attributes: ["Batting Average", "Strike Rate", "Bowling Economy", "Wickets Taken", "Catches Dropped", "Run Out Direct Hits", "Dot Ball %", "Fitness Score", "Yo-Yo Test", "Matches Played"] },
    { name: 'Football', icon: '⚽', attributes: ["Goals Scored", "Assists", "Pass Accuracy %", "Interceptions", "Tackles Won", "Sprints Completed", "Distance Covered (km)", "Yellow/Red Cards", "Shot Accuracy %", "Clean Sheets"] },
    { name: 'Basketball', icon: '🏀', attributes: ["Points Per Game", "Rebounds", "Assists", "Steals", "Blocks", "Free Throw %", "3-Point %", "Turnovers", "Minutes Played", "Fouls"] },
    { name: 'Tennis', icon: '🎾', attributes: ["Aces", "First Serve %", "Double Faults", "Break Points Won", "Unforced Errors", "Winners", "Return Points Won", "Net Points Won", "Match Win Rate", "Stamina Index"] },
    { name: 'Badminton', icon: '🏸', attributes: ["Smash Winners", "Drop Shot Accuracy", "Rallies Won", "Errors at Net", "Serve Accuracy", "Footwork Speed", "Jump Smashes", "Matches Won", "Stamina Level", "Agility Score"] },
    { name: 'Swimming', icon: '🏊', attributes: ["50m Freestyle Time", "100m Butterfly Time", "Turn Speed", "Dive Reaction Time", "Breath Control (sec)", "Stroke Rate", "Kick Efficiency", "Endurance Score", "Lap Consistency", "Personal Best Beats"] },
    { name: 'Volleyball', icon: '🏐', attributes: ["Spike Success %", "Blocks Made", "Digs", "Serve Aces", "Pass Accuracy %", "Setting Assists", "Service Errors", "Jump Height (cm)", "Agility Score", "Matches Played"] },
    { name: 'Table Tennis', icon: '🏓', attributes: ["Forehand Winners", "Backhand Winners", "Spin Accuracy", "Block Success %", "Serve Points", "Unforced Errors", "Rally Win Rate", "Reaction Time", "Footwork Speed", "Match Win Rate"] },
    { name: 'Hockey', icon: '🏑', attributes: ["Goals Scored", "Penalty Corner Conversion %", "Interceptions", "Pass Accuracy", "Tackles Won", "Saves (Goalie)", "Dribbles Completed", "Distance Covered", "Green/Yellow Cards", "Stamina Index"] },
    { name: 'Athletics (Track & Field)', icon: '🏃', attributes: ["100m Sprint Time", "400m Time", "Long Jump Distance", "High Jump Height", "Javelin Throw Distance", "Reaction Time at Block", "Stride Length", "Endurance Score", "Personal Best Improvements", "Form Consistency"] },
    { name: 'Boxing', icon: '🥊', attributes: ["Punches Landed", "Punch Accuracy %", "Knockdowns", "Dodges/Slips", "Jabs Landed", "Power Punches", "Block Success %", "Footwork Agility", "Stamina Level", "Matches Won"] },
    { name: 'Kabaddi', icon: '🤼‍♂️', attributes: ["Successful Raids", "Super Raids", "Tackle Points", "Super Tackles", "Touch Points", "Bonus Points", "Escapes", "Empty Raids", "Catch Success %", "Agility Index"] },
    { name: 'Golf', icon: '🏌️‍♂️', attributes: ["Driving Distance", "Fairways Hit %", "Greens in Regulation (GIR)", "Putts per Round", "Sand Saves %", "Birdies", "Eagles", "Bogey Avoidance", "Handicap", "Swing Speed"] },
    { name: 'Baseball', icon: '⚾', attributes: ["Batting Average", "Home Runs", "RBIs", "On-Base Percentage", "Strikeouts (Pitcher)", "ERA (Earned Run Average)", "Fielding Percentage", "Stolen Bases", "Fastball Speed", "Innings Pitched"] },
    { name: 'Rugby', icon: '🏉', attributes: ["Tries Scored", "Tackles Made", "Tackle Success %", "Meters Gained", "Passes Completed", "Offloads", "Rucks Won", "Lineouts Won", "Penalties Conceded", "Stamina Index"] },
    { name: 'Chess', icon: '♟️', attributes: ["ELO Rating", "Matches Won", "Draws", "Matches Lost", "Blunders", "Inaccuracies", "Centipawn Loss", "Opening Accuracy", "Middle-Game Tactics", "Endgame Conversion %"] },
    { name: 'Archery', icon: '🏹', attributes: ["10-Ring Hits", "Bullseyes", "Average Arrow Score", "Wind Adjustment Accuracy", "Release Consistency", "Bow Arm Stability", "Draw Weight Comfort", "Total Points", "Tournament Wins", "Focus/Concentration Index"] },
    { name: 'Gymnastics', icon: '🤸‍♂️', attributes: ["Vault Score", "Uneven Bars Score", "Balance Beam Score", "Floor Exercise Score", "Execution Deductions", "Difficulty Value", "Landing Stability", "Flexibility Index", "Core Strength", "Competition Medals"] },
    { name: 'Cycling', icon: '🚴', attributes: ["Average Speed (km/h)", "Peak Power Output (Watts)", "FTP (Functional Threshold Power)", "Cadence (RPM)", "Distance Covered", "Elevation Climbed", "Sprint Speed", "Heart Rate Efficiency", "V02 Max", "Time Trial Record"] },
    { name: 'Wrestling', icon: '🤼', attributes: ["Takedowns", "Escapes", "Reversals", "Near Falls", "Pins / Falls", "Mat Control Time", "Defense Success %", "Stamina Index", "Flexibility", "Matches Won"] }
  ];

  const existingCount = await prisma.globalSport.count();
  if (existingCount > 0) {
    return { message: 'Sports already seeded', count: existingCount };
  }

  for (const sport of defaultSports) {
    try {
      await prisma.globalSport.create({
        data: {
          name: sport.name,
          icon: sport.icon,
          attributes: JSON.stringify(sport.attributes)
        }
      });
    } catch (error) {
      // Skip duplicate names
      if (!error.message.includes('Unique constraint')) {
        console.error(`Failed to seed sport ${sport.name}:`, error.message);
      }
    }
  }

  const finalCount = await prisma.globalSport.count();
  return { message: 'Sports seeded successfully', count: finalCount };
};

export const updateAcademyStatus = async (academy_id, status, actor_id, ip) => {
  const academy = await prisma.academy.update({
    where: { academy_id: parseInt(academy_id, 10) },
    data: { status }
  });

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'ACADEMY_STATUS_UPDATED',
    entity_type: 'Academy',
    entity_id: academy.academy_id,
    metadata: { status },
    ip_address: ip
  });

  return academy;
};

export const updatePlanStatus = async (plan_id, status, actor_id, ip) => {
  let plans = await getDynamicPlans();
  if (plans.length === 0) {
    plans = getDefaultPlans();
  }
  
  const index = plans.findIndex(p => p.id === plan_id);
  if (index === -1) {
    throw new Error('Plan not found');
  }
  
  plans[index].status = status;
  
  await prisma.globalSetting.upsert({
    where: { setting_key: 'platform_subscription_plans' },
    create: { setting_key: 'platform_subscription_plans', setting_value: JSON.stringify(plans) },
    update: { setting_value: JSON.stringify(plans) }
  });
  
  const { setCachedPlans } = await import('../../config/subscription.config.js');
  setCachedPlans(plans);

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'PLAN_STATUS_UPDATED',
    entity_type: 'PlatformPlan',
    entity_id: 0,
    metadata: { status, id: plan_id },
    ip_address: ip
  });
  
  return plans[index];
};

export const createPlan = async (data, actor_id, ip) => {
  let plans = await getDynamicPlans();
  if (plans.length === 0) {
    plans = getDefaultPlans();
  }
  
  const newPlan = {
    id: 'plan_' + Date.now(),
    name: data.name,
    price: parseFloat(data.price),
    duration: data.duration || 'Monthly',
    duration_months: data.duration === 'Yearly' ? 12 : data.duration === 'Half-Yearly' ? 6 : data.duration === 'Quarterly' ? 3 : 1,
    teacher_limit: data.teacher_limit === null ? null : parseInt(data.teacher_limit, 10),
    student_limit: data.student_limit === null ? null : parseInt(data.student_limit, 10),
    features: Array.isArray(data.features) ? data.features : [],
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    status: data.status || 'active'
  };
  
  plans.push(newPlan);
  
  await prisma.globalSetting.upsert({
    where: { setting_key: 'platform_subscription_plans' },
    create: { setting_key: 'platform_subscription_plans', setting_value: JSON.stringify(plans) },
    update: { setting_value: JSON.stringify(plans) }
  });
  
  // Refresh cache
  const { setCachedPlans } = await import('../../config/subscription.config.js');
  setCachedPlans(plans);

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'PLAN_CREATED',
    entity_type: 'PlatformPlan',
    entity_id: 0,
    metadata: { name: newPlan.name, id: newPlan.id },
    ip_address: ip
  });
  
  return newPlan;
};

export const updatePlan = async (plan_id, data, actor_id, ip) => {
  let plans = await getDynamicPlans();
  if (plans.length === 0) {
    plans = getDefaultPlans();
  }
  
  const index = plans.findIndex(p => p.id === plan_id);
  if (index === -1) {
    throw new Error('Plan not found');
  }
  
  plans[index] = {
    ...plans[index],
    name: data.name ?? plans[index].name,
    price: data.price !== undefined ? parseFloat(data.price) : plans[index].price,
    duration: data.duration ?? plans[index].duration,
    duration_months: data.duration ? (data.duration === 'Yearly' ? 12 : data.duration === 'Half-Yearly' ? 6 : data.duration === 'Quarterly' ? 3 : 1) : plans[index].duration_months,
    teacher_limit: data.teacher_limit !== undefined ? (data.teacher_limit === null ? null : parseInt(data.teacher_limit, 10)) : plans[index].teacher_limit,
    student_limit: data.student_limit !== undefined ? (data.student_limit === null ? null : parseInt(data.student_limit, 10)) : plans[index].student_limit,
    features: Array.isArray(data.features) ? data.features : plans[index].features,
    highlights: Array.isArray(data.highlights) ? data.highlights : plans[index].highlights,
    status: data.status ?? plans[index].status
  };
  
  await prisma.globalSetting.upsert({
    where: { setting_key: 'platform_subscription_plans' },
    create: { setting_key: 'platform_subscription_plans', setting_value: JSON.stringify(plans) },
    update: { setting_value: JSON.stringify(plans) }
  });
  
  // Refresh cache
  const { setCachedPlans } = await import('../../config/subscription.config.js');
  setCachedPlans(plans);

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'PLAN_UPDATED',
    entity_type: 'PlatformPlan',
    entity_id: 0,
    metadata: { name: plans[index].name, id: plan_id },
    ip_address: ip
  });
  
  return plans[index];
};

export const deletePlan = async (plan_id, actor_id, ip) => {
  let plans = await getDynamicPlans();
  if (plans.length === 0) {
    plans = getDefaultPlans();
  }
  
  const plan = plans.find(p => p.id === plan_id);
  if (!plan) {
    throw new Error('Plan not found');
  }
  
  const updatedPlans = plans.filter(p => p.id !== plan_id);
  
  await prisma.globalSetting.upsert({
    where: { setting_key: 'platform_subscription_plans' },
    create: { setting_key: 'platform_subscription_plans', setting_value: JSON.stringify(updatedPlans) },
    update: { setting_value: JSON.stringify(updatedPlans) }
  });
  
  // Refresh cache
  const { setCachedPlans } = await import('../../config/subscription.config.js');
  setCachedPlans(updatedPlans);

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'PLAN_DELETED',
    entity_type: 'PlatformPlan',
    entity_id: 0,
    metadata: { id: plan_id },
    ip_address: ip
  });
  
  return { id: plan_id };
};

export const getTrialSettings = async () => {
  const setting = await prisma.globalSetting.findUnique({
    where: { setting_key: 'platform_trial_settings' }
  });
  if (setting) {
    try {
      return JSON.parse(setting.setting_value);
    } catch (e) {
      // ignore
    }
  }
  
  return {
    enabled: true,
    duration_days: 14,
    default_plan_id: 'free',
    restrictions: {
      limit_coaches: true,
      limit_students: true
    }
  };
};

export const updateTrialSettings = async (data, actor_id, ip) => {
  const settings = {
    enabled: !!data.enabled,
    duration_days: parseInt(data.duration_days, 10) || 14,
    default_plan_id: data.default_plan_id || 'free',
    restrictions: data.restrictions || { limit_coaches: true, limit_students: true }
  };
  
  await prisma.globalSetting.upsert({
    where: { setting_key: 'platform_trial_settings' },
    create: { setting_key: 'platform_trial_settings', setting_value: JSON.stringify(settings) },
    update: { setting_value: JSON.stringify(settings) }
  });

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'TRIAL_SETTINGS_UPDATED',
    entity_type: 'GlobalSetting',
    metadata: settings,
    ip_address: ip
  });
  
  return settings;
};

export const getPaymentsData = async () => {
  const [paymentsSetting, settingsSetting] = await Promise.all([
    prisma.globalSetting.findUnique({ where: { setting_key: 'platform_payments' } }),
    prisma.globalSetting.findUnique({ where: { setting_key: 'platform_payment_settings' } })
  ]);
  
  let transactions = [];
  if (paymentsSetting) {
    try {
      transactions = JSON.parse(paymentsSetting.setting_value);
    } catch (e) {
      // ignore
    }
  }
  
  let settings = {
    upi_id: 'merchant@upi',
    merchant_name: 'Sports Academy Pro Private Limited',
    qr_enabled: true,
    qr_image_url: '',
    coupons: []
  };
  if (settingsSetting) {
    try {
      settings = { ...settings, ...JSON.parse(settingsSetting.setting_value) };
    } catch (e) {
      // ignore
    }
  }
  
  return { transactions, settings };
};

export const updatePaymentSettings = async (data, actor_id, ip) => {
  const settingsSetting = await prisma.globalSetting.findUnique({ where: { setting_key: 'platform_payment_settings' } });
  let settings = {
    upi_id: 'merchant@upi',
    merchant_name: 'Sports Academy Pro Private Limited',
    qr_enabled: true,
    qr_image_url: '',
    coupons: []
  };
  if (settingsSetting) {
    try {
      settings = JSON.parse(settingsSetting.setting_value);
    } catch (e) {}
  }
  
  settings = {
    ...settings,
    upi_id: data.upi_id ?? settings.upi_id,
    merchant_name: data.merchant_name ?? settings.merchant_name,
    qr_enabled: data.qr_enabled !== undefined ? !!data.qr_enabled : settings.qr_enabled,
    qr_image_url: data.qr_image_url ?? settings.qr_image_url,
    coupons: Array.isArray(data.coupons) ? data.coupons : settings.coupons
  };
  
  await prisma.globalSetting.upsert({
    where: { setting_key: 'platform_payment_settings' },
    create: { setting_key: 'platform_payment_settings', setting_value: JSON.stringify(settings) },
    update: { setting_value: JSON.stringify(settings) }
  });

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'PAYMENT_SETTINGS_UPDATED',
    entity_type: 'GlobalSetting',
    metadata: settings,
    ip_address: ip
  });
  
  return settings;
};

export const updatePaymentStatus = async (tx_id, status, actor_id, ip) => {
  const setting = await prisma.globalSetting.findUnique({
    where: { setting_key: 'platform_payments' }
  });
  if (!setting) {
    throw new Error('No transactions found');
  }
  
  const transactions = JSON.parse(setting.setting_value);
  const index = transactions.findIndex(t => t.id === tx_id);
  if (index === -1) {
    throw new Error('Transaction not found');
  }
  
  const tx = transactions[index];
  tx.status = status;
  tx.updated_at = new Date().toISOString();
  
  await prisma.globalSetting.update({
    where: { setting_key: 'platform_payments' },
    data: { setting_value: JSON.stringify(transactions) }
  });
  
  if (status === 'COMPLETED') {
    const academyId = parseInt(tx.academy_id, 10);
    const plans = await listPlans();
    const plan = plans.find(p => p.id === tx.plan_id);
    
    if (plan) {
      const expiresAt = new Date();
      if (plan.duration === 'Yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else if (plan.duration === 'Half-Yearly') {
        expiresAt.setMonth(expiresAt.getMonth() + 6);
      } else if (plan.duration === 'Quarterly') {
        expiresAt.setMonth(expiresAt.getMonth() + 3);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }
      
      let subscriptionTier = 'FREE';
      const lowercaseId = String(plan.id).toLowerCase();
      if (lowercaseId.includes('plus')) {
        subscriptionTier = 'PLUS';
      } else if (lowercaseId.includes('pro')) {
        subscriptionTier = 'PRO';
      }
      
      await prisma.academy.update({
        where: { academy_id: academyId },
        data: {
          subscription_plan: plan.id,
          subscription_tier: subscriptionTier,
          subscription_starts_at: new Date(),
          subscription_expires_at: expiresAt,
          status: 'ACTIVE'
        }
      });
      
      const firstAdmin = await prisma.user.findFirst({
        where: { academy_id: academyId, role: 'ACADEMY_ADMIN' }
      });
      if (firstAdmin) {
        await prisma.notification.create({
          data: {
            academy_id: academyId,
            user_id: firstAdmin.user_id,
            type: 'GENERAL',
            title: 'Subscription Activated',
            body: `Your payment was verified. Your academy subscription to ${plan.name} has been activated until ${expiresAt.toLocaleDateString()}!`,
            metadata: JSON.stringify({ subtype: 'payment_success', transaction_id: tx.id })
          }
        });
      }
    }
  } else if (status === 'FAILED' || status === 'REJECTED') {
    const academyId = parseInt(tx.academy_id, 10);
    const firstAdmin = await prisma.user.findFirst({
      where: { academy_id: academyId, role: 'ACADEMY_ADMIN' }
    });
    if (firstAdmin) {
      await prisma.notification.create({
        data: {
          academy_id: academyId,
          user_id: firstAdmin.user_id,
          type: 'GENERAL',
          title: 'Subscription Payment Declined',
          body: `Your platform subscription transaction reference ${tx.id} was rejected. Please contact support.`,
          metadata: JSON.stringify({ subtype: 'payment_failed', transaction_id: tx.id })
        }
      });
    }
  }

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'PAYMENT_STATUS_UPDATED',
    entity_type: 'GlobalSetting',
    metadata: { id: tx_id, status },
    ip_address: ip
  });
  
  return tx;
};

export const getAcademyDetailsForSuperAdmin = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  
  const [academy, admins, studentsCount, coachesCount, paymentsData, auditLogs] = await Promise.all([
    prisma.academy.findUnique({
      where: { academy_id: academyId },
      include: {
        _count: {
          select: {
            students: true,
            coaches: true,
            batches: true
          }
        }
      }
    }),
    prisma.user.findMany({
      where: { academy_id: academyId, role: 'ACADEMY_ADMIN', is_deleted: false },
      select: { user_id: true, name: true, email: true, created_at: true }
    }),
    prisma.student.count({ where: { academy_id: academyId, is_deleted: false } }),
    prisma.coach.count({ where: { academy_id: academyId, is_deleted: false } }),
    getPaymentsData(),
    prisma.auditLog.findMany({
      where: { academy_id: academyId },
      orderBy: { created_at: 'desc' },
      take: 15
    })
  ]);
  
  if (!academy) {
    throw new Error('Academy not found');
  }
  
  const academyPayments = paymentsData.transactions.filter(t => parseInt(t.academy_id, 10) === academyId);
  const totalRevenue = academyPayments
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  
  const hasPayments = academyPayments.some(t => t.status === 'COMPLETED');
  const isExpired = academy.subscription_expires_at ? new Date(academy.subscription_expires_at) < new Date() : false;
  let trialStatus = 'Paid';
  if (!hasPayments) {
    trialStatus = isExpired ? 'Trial Expired' : 'Active Trial';
  }
  
  return {
    academy,
    admins,
    total_students: studentsCount,
    total_coaches: coachesCount,
    revenue_generated: totalRevenue,
    trial_status: trialStatus,
    payment_history: academyPayments,
    login_history: auditLogs
  };
};

export const extendAcademySubscription = async (academy_id, days, actor_id, ip) => {
  const academyId = parseInt(academy_id, 10);
  const daysNum = parseInt(days, 10);
  
  const academy = await prisma.academy.findUnique({
    where: { academy_id: academyId }
  });
  if (!academy) {
    throw new Error('Academy not found');
  }
  
  const currentExpiry = academy.subscription_expires_at ? new Date(academy.subscription_expires_at) : new Date();
  const baseDate = currentExpiry < new Date() ? new Date() : currentExpiry;
  const newExpiry = new Date(baseDate.getTime() + daysNum * 24 * 60 * 60 * 1000);
  
  await prisma.academy.update({
    where: { academy_id: academyId },
    data: {
      subscription_expires_at: newExpiry,
      status: 'ACTIVE'
    }
  });
  
  const firstAdmin = await prisma.user.findFirst({
    where: { academy_id: academyId, role: 'ACADEMY_ADMIN' }
  });
  if (firstAdmin) {
    await prisma.notification.create({
      data: {
        academy_id: academyId,
        user_id: firstAdmin.user_id,
        type: 'GENERAL',
        title: 'Subscription Extended',
        body: `Your platform subscription has been extended by ${daysNum} days by support. New expiry: ${newExpiry.toLocaleDateString()}.`,
        metadata: JSON.stringify({ subtype: 'subscription_extended', days: daysNum })
      }
    });
  }

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'SUBSCRIPTION_EXTENDED',
    entity_type: 'Academy',
    entity_id: academyId,
    metadata: { days: daysNum, new_expiry: newExpiry.toISOString() },
    ip_address: ip
  });
  
  return { new_expiry: newExpiry };
};

export const upgradeAcademyPlan = async (academy_id, plan_id, actor_id, ip) => {
  const academyId = parseInt(academy_id, 10);
  
  const academy = await prisma.academy.findUnique({
    where: { academy_id: academyId }
  });
  if (!academy) {
    throw new Error('Academy not found');
  }
  
  const plans = await listPlans();
  const plan = plans.find(p => p.id === plan_id);
  if (!plan) {
    throw new Error('Plan not found');
  }
  
  const expiresAt = new Date();
  if (plan.duration === 'Yearly') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else if (plan.duration === 'Half-Yearly') {
    expiresAt.setMonth(expiresAt.getMonth() + 6);
  } else if (plan.duration === 'Quarterly') {
    expiresAt.setMonth(expiresAt.getMonth() + 3);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }
  
  let subscriptionTier = 'FREE';
  const lowercaseId = String(plan.id).toLowerCase();
  if (lowercaseId.includes('plus')) {
    subscriptionTier = 'PLUS';
  } else if (lowercaseId.includes('pro')) {
    subscriptionTier = 'PRO';
  }
  
  await prisma.academy.update({
    where: { academy_id: academyId },
    data: {
      subscription_plan: plan.id,
      subscription_tier: subscriptionTier,
      subscription_expires_at: expiresAt,
      status: 'ACTIVE'
    }
  });
  
  const firstAdmin = await prisma.user.findFirst({
    where: { academy_id: academyId, role: 'ACADEMY_ADMIN' }
  });
  if (firstAdmin) {
    await prisma.notification.create({
      data: {
        academy_id: academyId,
        user_id: firstAdmin.user_id,
        type: 'GENERAL',
        title: 'Plan Upgraded',
        body: `Your platform subscription has been upgraded to ${plan.name} by support. New expiry: ${expiresAt.toLocaleDateString()}.`,
        metadata: JSON.stringify({ subtype: 'plan_upgraded', plan_id })
      }
    });
  }

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'PLAN_UPGRADED',
    entity_type: 'Academy',
    entity_id: academyId,
    metadata: { plan_id, new_expiry: expiresAt.toISOString() },
    ip_address: ip
  });
  
  return { plan_id, subscription_expires_at: expiresAt };
};

export const exportAcademyData = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  const [academy, students, coaches, batches] = await Promise.all([
    prisma.academy.findUnique({ where: { academy_id: academyId } }),
    prisma.student.findMany({ where: { academy_id: academyId, is_deleted: false } }),
    prisma.coach.findMany({ where: { academy_id: academyId, is_deleted: false } }),
    prisma.batch.findMany({ where: { academy_id: academyId } })
  ]);
  
  return {
    exported_at: new Date().toISOString(),
    academy,
    stats: {
      students_count: students.length,
      coaches_count: coaches.length,
      batches_count: batches.length
    },
    students: students.map(s => ({
      name: s.name,
      email: s.parent_email,
      phone: s.phone,
      joining_date: s.joining_date,
      status: s.status
    })),
    coaches: coaches.map(c => ({
      name: c.name,
      email: c.email,
      phone: c.phone_number,
      specialization: c.specialization,
      status: c.status
    })),
    batches: batches.map(b => ({
      name: b.name,
      timing: b.timing,
      capacity: b.max_capacity,
      status: b.status
    }))
  };
};

export const getSuperAdminNotifications = async () => {
  const notifications = await prisma.notification.findMany({
    where: {
      academy_id: null,
      user_id: null
    },
    orderBy: { created_at: 'desc' },
    take: 50
  });
  
  return notifications.map(n => ({
    ...n,
    metadata: n.metadata ? JSON.parse(n.metadata) : null
  }));
};

export const markSuperAdminNotificationAsRead = async (notification_id) => {
  const notification = await prisma.notification.update({
    where: { notification_id: parseInt(notification_id, 10) },
    data: { is_read: true }
  });
  return notification;
};

export const markSuperAdminNotificationsAllAsRead = async () => {
  const result = await prisma.notification.updateMany({
    where: {
      academy_id: null,
      user_id: null,
      is_read: false
    },
    data: { is_read: true }
  });
  return { count: result.count };
};

export const getSuperAdminUnreadCount = async () => {
  try {
    const count = await prisma.notification.count({
      where: {
        academy_id: null,
        user_id: null,
        is_read: false
      }
    });
    return { count };
  } catch (error) {
    logger.error('Error getting super admin unread count', { error: error.message });
    return { count: 0 };
  }
};

export const getPlatformStats = async () => {
  const [
    academyCount,
    activeAcademies,
    suspendedAcademies,
    studentCount,
    coachCount,
    paymentsData,
    recentAcademies,
    recentLogs
  ] = await Promise.all([
    prisma.academy.count(),
    prisma.academy.count({ where: { status: 'ACTIVE' } }),
    prisma.academy.count({ where: { status: 'SUSPENDED' } }),
    prisma.student.count({ where: { is_deleted: false, status: 'ACTIVE' } }),
    prisma.coach.count({ where: { is_deleted: false, status: 'ACTIVE' } }),
    getPaymentsData(),
    prisma.academy.findMany({
      orderBy: { created_at: 'desc' },
      take: 5
    }),
    prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 10
    })
  ]);

  const transactions = paymentsData.transactions || [];
  const completedTx = transactions.filter(t => t.status === 'COMPLETED');
  
  const totalRevenue = completedTx.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  
  const now = new Date();
  
  const paidAcademyIds = new Set(completedTx.map(t => parseInt(t.academy_id, 10)));
  
  const activeAcademiesList = await prisma.academy.findMany({
    where: { status: 'ACTIVE' }
  });
  
  let activeTrials = 0;
  activeAcademiesList.forEach(a => {
    if (!paidAcademyIds.has(a.academy_id)) {
      if (a.subscription_expires_at && new Date(a.subscription_expires_at) >= now) {
        activeTrials++;
      }
    }
  });
  
  const expiredAcademies = await prisma.academy.count({
    where: {
      subscription_expires_at: { lt: now }
    }
  });
  
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingRenewals = await prisma.academy.count({
    where: {
      subscription_expires_at: {
        gt: now,
        lt: thirtyDaysFromNow
      },
      status: 'ACTIVE'
    }
  });

  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyRevenue = completedTx
    .filter(t => new Date(t.created_at || t.updated_at) >= firstDayOfMonth)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const newRegistrations = await prisma.academy.count({
    where: {
      created_at: { gte: thirtyDaysAgo }
    }
  });

  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    
    const rev = completedTx
      .filter(t => {
        const txDate = new Date(t.created_at || t.updated_at);
        return txDate >= d && txDate < nextD;
      })
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
    trendData.push({ month: monthLabel, revenue: rev });
  }

  const planCounts = {};
  const academiesList = await prisma.academy.findMany({
    select: { subscription_plan: true, subscription_tier: true }
  });
  
  academiesList.forEach(a => {
    const key = a.subscription_plan || String(a.subscription_tier).toLowerCase();
    planCounts[key] = (planCounts[key] || 0) + 1;
  });
  
  const planDistribution = Object.keys(planCounts).map(k => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: planCounts[k]
  }));

  const tierCounts = { FREE: 0, PRO: 0, PLUS: 0 };
  academiesList.forEach(a => {
    const tier = a.subscription_tier || 'FREE';
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  });
  const subscriptionDistribution = Object.keys(tierCounts).map(k => ({
    name: k,
    value: tierCounts[k]
  }));

  const growthData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    
    const count = await prisma.academy.count({
      where: {
        created_at: { lt: nextD }
      }
    });
    growthData.push({ month: monthLabel, academies: count });
  }

  return {
    total_academies: academyCount,
    active_academies: activeAcademies,
    inactive_academies: suspendedAcademies,
    total_students: studentCount,
    total_coaches: coachCount,
    platform_revenue: totalRevenue,
    active_trials: activeTrials,
    expired_plans: expiredAcademies,
    upcoming_renewals: upcomingRenewals,
    monthly_revenue: monthlyRevenue,
    new_registrations: newRegistrations,
    
    revenue_trend: trendData,
    plan_distribution: planDistribution,
    subscription_distribution: subscriptionDistribution,
    academy_growth: growthData,
    recent_registrations: recentAcademies,
    recent_payments: transactions.slice(0, 5),
    recent_activity: recentLogs
  };
};

export const upsertGlobalSetting = async (setting_key, setting_value, actor_id, ip) => {
  const setting = await prisma.globalSetting.upsert({
    where: { setting_key },
    create: { setting_key, setting_value },
    update: { setting_value }
  });

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'GLOBAL_SETTING_UPDATED',
    entity_type: 'GlobalSetting',
    metadata: { setting_key },
    ip_address: ip
  });

  return setting;
};

export const getGlobalSettings = async () => prisma.globalSetting.findMany();

export const ensureSuperAdminFromEnv = async () => {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  return prisma.superAdmin.create({
    data: {
      name: 'Platform Super Admin',
      email,
      password_hash
    }
  });
};

export const impersonateAcademyAdmin = async (academyId, superAdminId, ip) => {
  // Get the academy
  const academy = await prisma.academy.findUnique({
    where: { academy_id: parseInt(academyId, 10) }
  });

  if (!academy) {
    const error = new Error('Academy not found');
    error.statusCode = 404;
    throw error;
  }

  if (academy.status !== 'ACTIVE') {
    const error = new Error('Cannot impersonate a suspended or inactive academy');
    error.statusCode = 403;
    throw error;
  }

  // Find the academy's admin user
  const adminUser = await prisma.user.findFirst({
    where: {
      academy_id: parseInt(academyId, 10),
      role: 'ACADEMY_ADMIN',
      is_deleted: false
    }
  });

  if (!adminUser) {
    const error = new Error('No active admin found for this academy');
    error.statusCode = 404;
    throw error;
  }

  // Generate impersonation token with special flag
  const impersonationToken = jwt.sign(
    {
      user_id: adminUser.user_id,
      academy_id: academy.academy_id,
      email: adminUser.email,
      role: 'ACADEMY_ADMIN',
      name: adminUser.name,
      impersonating: true,
      original_super_admin_id: superAdminId
    },
    JWT_SECRET,
    { expiresIn: '1h' } // Shorter expiry for impersonation
  );

  // Log the impersonation action
  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id: superAdminId,
    action: 'ACADEMY_IMPERSONATION',
    entity_type: 'Academy',
    entity_id: academy.academy_id,
    target_actor_type: 'ACADEMY_ADMIN',
    target_actor_id: adminUser.user_id,
    ip_address: ip
  });

  logger.info('Super admin impersonating academy', { 
    super_admin_id: superAdminId, 
    academy_id: academy.academy_id, 
    target_admin_id: adminUser.user_id,
    ip 
  });

  return {
    impersonationToken,
    academy: {
      academy_id: academy.academy_id,
      name: academy.name
    },
    admin: {
      user_id: adminUser.user_id,
      name: adminUser.name,
      email: adminUser.email
    }
  };
};