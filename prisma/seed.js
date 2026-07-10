import { PrismaClient, AcademyStatus, SubscriptionTier, UserRole, RecordStatus } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const GLOBAL_SPORTS = [
  { name: 'Cricket', icon: '🏏', attributes: ["Batting Average", "Strike Rate", "Bowling Economy", "Wickets Taken", "Catches Dropped", "Run Out Direct Hits", "Dot Ball %", "Fitness Score", "Yo-Yo Test", "Matches Played"] },
  { name: 'Football', icon: '⚽', attributes: ["Goals Scored", "Assists", "Pass Accuracy %", "Interceptions", "Tackles Won", "Sprints Completed", "Distance Covered (km)", "Yellow/Red Cards", "Shot Accuracy %", "Clean Sheets"] },
  { name: 'Basketball', icon: '🏀', attributes: ["Points Per Game", "Rebounds", "Assists", "Steals", "Blocks", "Free Throw %", "3-Point %", "Turnovers", "Minutes Played", "Fouls"] },
  { name: 'Tennis', icon: '🎾', attributes: ["Aces", "First Serve %", "Double Faults", "Break Points Won", "Unforced Errors", "Winners", "Return Points Won", "Net Points Won", "Match Win Rate", "Stamina Index"] },
  { name: 'Badminton', icon: '🏸', attributes: ["Smash Winners", "Drop Shot Accuracy", "Rallies Won", "Errors at Net", "Serve Accuracy", "Footwork Speed", "Jump Smashes", "Matches Won", "Stamina Level", "Agility Score"] },
  { name: 'Swimming', icon: '🏊', attributes: ["50m Freestyle Time", "100m Butterfly Time", "Turn Speed", "Dive Reaction Time", "Breath Control (sec)", "Stroke Rate", "Kick Efficiency", "Endurance Score", "Lap Consistency", "Personal Best Beats"] },
  { name: 'Athletics', icon: '🏃', attributes: ["100m Sprint Time", "400m Time", "Long Jump Distance", "High Jump Height", "Javelin Throw Distance", "Reaction Time at Block", "Stride Length", "Endurance Score", "Personal Best Improvements", "Form Consistency"] },
  { name: 'Hockey', icon: '🏑', attributes: ["Goals Scored", "Penalty Corner Conversion %", "Interceptions", "Pass Accuracy", "Tackles Won", "Saves (Goalie)", "Dribbles Completed", "Distance Covered", "Green/Yellow Cards", "Stamina Index"] }
];

const DURATION_PLANS = [
  { name: '1 Month', duration_months: 1, multiplier: 1 },
  { name: '3 Months', duration_months: 3, multiplier: 2.8 },
  { name: '6 Months', duration_months: 6, multiplier: 5.5 },
  { name: '12 Months', duration_months: 12, multiplier: 10 }
];

async function main() {
  const passwordHash = await bcrypt.hash('123456', 12);

  // Check if global sports already exist to prevent overwriting manually added sports
  const existingSportsCount = await prisma.globalSport.count();
  if (existingSportsCount > 0) {
    console.log('ℹ️  Global sports already exist, skipping sports seeding');
  } else {
    // Seed GlobalSports table only if empty
    for (const sportData of GLOBAL_SPORTS) {
      await prisma.globalSport.upsert({
        where: { name: sportData.name },
        update: {},
        create: {
          name: sportData.name,
          icon: sportData.icon,
          attributes: JSON.stringify(sportData.attributes)
        }
      }).catch(async () => {
        const existing = await prisma.globalSport.findFirst({ where: { name: sportData.name } });
        if (!existing) {
          await prisma.globalSport.create({
            data: {
              name: sportData.name,
              icon: sportData.icon,
              attributes: JSON.stringify(sportData.attributes)
            }
          });
        }
      });
    }
  }

  for (const tier of [SubscriptionTier.FREE, SubscriptionTier.PRO, SubscriptionTier.PLUS]) {
    await prisma.platformPlan.upsert({
      where: { tier },
      update: {},
      create: {
        tier,
        name: tier.charAt(0) + tier.slice(1).toLowerCase(),
        max_coaches: tier === SubscriptionTier.FREE ? 3 : tier === SubscriptionTier.PRO ? 6 : null,
        max_students: tier === SubscriptionTier.FREE ? 30 : tier === SubscriptionTier.PRO ? 80 : null,
        price_monthly: tier === SubscriptionTier.FREE ? 0 : tier === SubscriptionTier.PRO ? 999 : 1999
      }
    });
  }

  await prisma.superAdmin.upsert({
    where: { email: 'superadmin@sportsacademy.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@sportsacademy.com',
      password_hash: passwordHash
    }
  });

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const academy = await prisma.academy.upsert({
    where: { email: 'academy@sportsacademy.com' },
    update: {},
    create: {
      name: 'Champion Sports Academy',
      owner_name: 'Sports Owner',
      email: 'academy@sportsacademy.com',
      phone_number: '9999999999',
      subscription_tier: SubscriptionTier.PRO,
      subscription_plan: 'pro',
      subscription_starts_at: new Date(),
      subscription_expires_at: expiresAt,
      status: AcademyStatus.ACTIVE,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India'
    }
  });

  for (const plan of DURATION_PLANS) {
    const existing = await prisma.durationPlan.findFirst({
      where: { academy_id: academy.academy_id, name: plan.name }
    });
    if (!existing) {
      await prisma.durationPlan.create({
        data: {
          academy_id: academy.academy_id,
          name: plan.name,
          duration_months: plan.duration_months,
          multiplier: plan.multiplier,
          status: RecordStatus.ACTIVE
        }
      });
    }
  }

  await prisma.user.upsert({
    where: { email: 'admin@sportsacademy.com' },
    update: {},
    create: {
      academy_id: academy.academy_id,
      name: 'Main Admin',
      first_name: 'Main',
      last_name: 'Admin',
      email: 'admin@sportsacademy.com',
      password_hash: passwordHash,
      role: UserRole.ACADEMY_ADMIN
    }
  });

  for (let i = 1; i <= 3; i++) {
    const email = `coach${i}@sportsacademy.com`;
    const existing = await prisma.coach.findFirst({
      where: { academy_id: academy.academy_id, email }
    });
    if (!existing) {
      await prisma.coach.create({
        data: {
          academy_id: academy.academy_id,
          name: `Coach ${i}`,
          first_name: 'Coach',
          last_name: String(i),
          specialization: GLOBAL_SPORTS[i % GLOBAL_SPORTS.length].name,
          phone_number: `90000000${String(i).padStart(2, '0')}`,
          email,
          password_hash: passwordHash,
          status: RecordStatus.ACTIVE
        }
      });
    }
  }

  console.log('✅ Seed complete');
  console.log('   Super Admin: superadmin@sportsacademy.com / 123456');
  console.log('   Academy Admin: admin@sportsacademy.com / 123456');
  console.log('   Coach: coach1@sportsacademy.com / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
