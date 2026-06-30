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

export const listPlans = async () => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' }
    });
    
    return plans.map(plan => ({
      plan_id: plan.plan_id,
      id: plan.plan_id,
      name: plan.name,
      plan_name: plan.name,
      description: plan.description,
      price: plan.price,
      monthly_price: plan.price,
      annual_price: plan.annual_price,
      billing_cycle: plan.billing_cycle || 'month',
      features: plan.features || [],
      status: plan.is_active ? 'active' : 'disabled',
      is_active: plan.is_active
    }));
  } catch (error) {
    return [];
  }
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
      throw new Error('Sport name is required');
    }

    // Jo icon select kiya hai vahi save hoga, fallback tabhi chalega agar icon completely undefined ho
    const finalIcon = icon && icon.trim() !== '' ? icon.trim() : '🏅';

    // Prisma data create block - id is auto-incremented
    const sport = await prisma.globalSport.create({
      data: {
        name: name.trim(),
        icon: finalIcon,
        attributes: typeof attributes === 'string' ? attributes : JSON.stringify(attributes || [])
      }
    });

    // Response format safely parsing back
    return {
      id: sport.id,
      name: sport.name,
      icon: sport.icon,
      attributes: typeof sport.attributes === 'string' ? JSON.parse(sport.attributes) : sport.attributes
    };
  } catch (error) {
    // Agar Prisma unique constraint hit ho (P2002)
    if (error.code === 'P2002') {
      throw new Error('This sport already exists in global records');
    }
    throw new Error('Failed to create sport: ' + error.message);
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
  const is_active = status === 'active';
  const plan = await prisma.subscriptionPlan.update({
    where: { plan_id: parseInt(plan_id, 10) },
    data: { is_active }
  });

  await logAudit({
    actor_type: 'SUPER_ADMIN',
    actor_id,
    action: 'PLAN_STATUS_UPDATED',
    entity_type: 'SubscriptionPlan',
    entity_id: plan.plan_id,
    metadata: { status, is_active },
    ip_address: ip
  });

  return {
    ...plan,
    status: is_active ? 'active' : 'disabled'
  };
};

// ─── FIXED METRICS QUERY MODULE ──────────────────────────────────────────────
export const getPlatformStats = async () => {
  const [academyCount, activeAcademies, studentCount, coachCount, revenue] = await Promise.all([
    prisma.academy.count(),
    // FIX 1: Swapped 'active' to capitalized 'ACTIVE' to match AcademyStatus enum
    prisma.academy.count({ where: { status: 'ACTIVE' } }),
    prisma.student.count({ where: { is_deleted: false, status: 'ACTIVE' } }),
    // FIX 2: Added status filter to coaches so dashboard returns live staff pairs accurately
    prisma.coach.count({ where: { is_deleted: false, status: 'ACTIVE' } }),
    prisma.receipt.aggregate({
      where: { status: 'COMPLETED' }, 
      _sum: { amount: true }
    })
  ]);

  return {
    total_academies: academyCount,
    active_academies: activeAcademies,
    total_students: studentCount,
    total_coaches: coachCount,
    platform_revenue: revenue._sum.amount || 0
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