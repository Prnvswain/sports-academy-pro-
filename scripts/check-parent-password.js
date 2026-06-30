import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

async function checkParentPassword() {
  try {
    const email = 'pranav.k.swain@gmail.com';
    
    const parent = await prisma.parent.findFirst({
      where: {
        email: email.toLowerCase(),
      },
      select: {
        parent_id: true,
        name: true,
        email: true,
        password_hash: true,
        is_active: true,
        academy_id: true,
      },
    });

    if (!parent) {
      console.log('Parent not found with email:', email);
      return;
    }

    console.log('Parent found:');
    console.log('- ID:', parent.parent_id);
    console.log('- Name:', parent.name);
    console.log('- Email:', parent.email);
    console.log('- Active:', parent.is_active);
    console.log('- Academy ID:', parent.academy_id);
    console.log('- Password Hash:', parent.password_hash ? 'SET' : 'NULL/MISSING');

    if (!parent.password_hash) {
      console.log('\n⚠️  WARNING: Parent has no password_hash set!');
      console.log('This is why login is failing.');
      
      // Set a temporary password
      const tempPassword = 'TempPass123';
      const password_hash = await bcrypt.hash(tempPassword, 10);
      
      await prisma.parent.update({
        where: { parent_id: parent.parent_id },
        data: { password_hash },
      });
      
      console.log('\n✅ Set temporary password:', tempPassword);
      console.log('Please use this password to login and change it immediately.');
    } else {
      console.log('\n✅ Parent has password_hash set.');
      console.log('The issue might be with the password being entered.');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkParentPassword();
