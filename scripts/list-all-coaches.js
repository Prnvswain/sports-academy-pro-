import prisma from '../src/config/prisma.js';

async function listAllCoaches() {
  try {
    const coaches = await prisma.coach.findMany({
      where: {
        is_deleted: false,
      },
      select: {
        coach_id: true,
        name: true,
        email: true,
        password_hash: true,
        status: true,
        academy_id: true,
      },
    });

    console.log(`Found ${coaches.length} coaches:\n`);
    
    coaches.forEach(coach => {
      console.log(`- ID: ${coach.coach_id}`);
      console.log(`  Name: ${coach.name}`);
      console.log(`  Email: ${coach.email || 'NULL'}`);
      console.log(`  Password Hash: ${coach.password_hash ? 'SET' : 'NULL/MISSING'}`);
      console.log(`  Status: ${coach.status}`);
      console.log(`  Academy ID: ${coach.academy_id}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listAllCoaches();
