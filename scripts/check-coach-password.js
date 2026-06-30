import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

async function checkCoachPassword() {
  try {
    const email = 'pranav.k.swain@gmail.com';
    
    const coach = await prisma.coach.findFirst({
      where: {
        email: email.toLowerCase(),
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

    if (!coach) {
      console.log('Coach not found with email:', email);
      return;
    }

    console.log('Coach found:');
    console.log('- ID:', coach.coach_id);
    console.log('- Name:', coach.name);
    console.log('- Email:', coach.email);
    console.log('- Status:', coach.status);
    console.log('- Academy ID:', coach.academy_id);
    console.log('- Password Hash:', coach.password_hash ? 'SET' : 'NULL/MISSING');

    if (!coach.password_hash) {
      console.log('\n⚠️  WARNING: Coach has no password_hash set!');
      console.log('This is why login is failing.');
      
      // Set a temporary password
      const tempPassword = 'TempPass123';
      const password_hash = await bcrypt.hash(tempPassword, 10);
      
      await prisma.coach.update({
        where: { coach_id: coach.coach_id },
        data: { password_hash },
      });
      
      console.log('\n✅ Set temporary password:', tempPassword);
      console.log('Please use this password to login and change it immediately.');
    } else {
      console.log('\n✅ Coach has password_hash set.');
      console.log('The issue might be with the password being entered.');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkCoachPassword();
