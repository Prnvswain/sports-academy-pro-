import { PrismaClient, AcademyStatus, SubscriptionTier, UserRole, RecordStatus } from '../web/src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();


const DURATION_PLANS = [
  { name: '1 Month', duration_months: 1, multiplier: 1 },
  { name: '3 Months', duration_months: 3, multiplier: 2.8 },
  { name: '6 Months', duration_months: 6, multiplier: 5.5 },
  { name: '12 Months', duration_months: 12, multiplier: 10 }
];

async function main() {
  const passwordHash = await bcrypt.hash('123456', 12);

  for (const name of GLOBAL_SPORTS) {
    await prisma.sport.upsert({
      where: { name_academy_id: { name, academy_id: null } },
      update: {},
      create: { name, academy_id: null, is_custom: false, status: RecordStatus.ACTIVE }
    }).catch(async () => {
      const existing = await prisma.sport.findFirst({ where: { name, academy_id: null } });
      if (!existing) {
        await prisma.sport.create({
          data: { name, academy_id: null, is_custom: false, status: RecordStatus.ACTIVE }
        });
      }
    });
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
          specialization: GLOBAL_SPORTS[i % GLOBAL_SPORTS.length],
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
