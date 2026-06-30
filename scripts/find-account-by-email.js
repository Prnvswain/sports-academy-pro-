import prisma from '../src/config/prisma.js';

async function findAccountByEmail() {
  try {
    const email = 'pranav.k.swain@gmail.com';
    const normalizedEmail = email.toLowerCase();
    
    console.log(`Searching for account with email: ${email}\n`);
    
    // Check User (Admin)
    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        is_deleted: false,
      },
      select: {
        user_id: true,
        name: true,
        email: true,
        role: true,
        academy_id: true,
      },
    });

    if (user) {
      console.log('✅ Found as USER (Admin):');
      console.log(`  ID: ${user.user_id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Academy ID: ${user.academy_id}`);
      console.log(`  Login at: /login/admin`);
    }
    
    // Check Coach
    const coach = await prisma.coach.findFirst({
      where: {
        email: normalizedEmail,
        is_deleted: false,
      },
      select: {
        coach_id: true,
        name: true,
        email: true,
        academy_id: true,
        status: true,
      },
    });

    if (coach) {
      console.log('✅ Found as COACH:');
      console.log(`  ID: ${coach.coach_id}`);
      console.log(`  Name: ${coach.name}`);
      console.log(`  Academy ID: ${coach.academy_id}`);
      console.log(`  Status: ${coach.status}`);
      console.log(`  Login at: /login/coach`);
    }
    
    // Check Parent
    const parent = await prisma.parent.findFirst({
      where: {
        email: normalizedEmail,
      },
      select: {
        parent_id: true,
        name: true,
        email: true,
        academy_id: true,
        is_active: true,
      },
    });

    if (parent) {
      console.log('✅ Found as PARENT:');
      console.log(`  ID: ${parent.parent_id}`);
      console.log(`  Name: ${parent.name}`);
      console.log(`  Academy ID: ${parent.academy_id}`);
      console.log(`  Active: ${parent.is_active}`);
      console.log(`  Login at: /parent/login`);
    }
    
    if (!user && !coach && !parent) {
      console.log('❌ No account found with this email.');
      console.log('\nAvailable options:');
      console.log('1. Create a new account via signup');
      console.log('2. Check if the email is correct');
      console.log('3. Contact administrator to create account');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

findAccountByEmail();
