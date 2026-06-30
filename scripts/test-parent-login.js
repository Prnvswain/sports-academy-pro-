import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

async function testParentLogin() {
  try {
    const email = 'pranav.k.swain@gmail.com';
    const password = 'password123'; // Replace with actual password being used
    
    const normalizedEmail = email.trim().toLowerCase();
    
    console.log('Testing parent login...');
    console.log('Email:', normalizedEmail);
    console.log('Password:', password);
    console.log('');
    
    // Find parent
    const parent = await prisma.parent.findFirst({
      where: {
        email: normalizedEmail,
      },
    });

    if (!parent) {
      console.log('❌ Parent not found');
      return;
    }

    console.log('✅ Parent found:');
    console.log('  ID:', parent.parent_id);
    console.log('  Email:', parent.email);
    console.log('  Active:', parent.is_active);
    console.log('  Academy ID:', parent.academy_id);
    console.log('  Password Hash:', parent.password_hash ? 'SET' : 'NULL');
    console.log('');

    // Test password comparison
    if (!parent.password_hash) {
      console.log('❌ No password hash set');
      return;
    }

    const isValid = await bcrypt.compare(password, parent.password_hash);
    console.log('Password valid:', isValid ? '✅ YES' : '❌ NO');
    
    if (!isValid) {
      console.log('\nThe password you entered is incorrect.');
      console.log('Please check your password and try again.');
    } else {
      console.log('\n✅ Login should succeed with these credentials.');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testParentLogin();
