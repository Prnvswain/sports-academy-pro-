import prisma from '../src/config/prisma.js';

async function normalizeCoachEmails() {
  try {
    console.log('Starting email normalization for coaches...');
    
    const coaches = await prisma.coach.findMany({
      where: {
        email: {
          not: null,
        },
        is_deleted: false,
      },
      select: {
        coach_id: true,
        email: true,
      },
    });

    console.log(`Found ${coaches.length} coaches with emails`);

    let updated = 0;
    for (const coach of coaches) {
      const normalizedEmail = coach.email.trim().toLowerCase();
      
      if (coach.email !== normalizedEmail) {
        await prisma.coach.update({
          where: { coach_id: coach.coach_id },
          data: { email: normalizedEmail },
        });
        console.log(`Updated coach ${coach.coach_id}: "${coach.email}" -> "${normalizedEmail}"`);
        updated++;
      }
    }

    console.log(`Successfully normalized ${updated} coach emails`);
  } catch (error) {
    console.error('Error normalizing coach emails:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

normalizeCoachEmails();
