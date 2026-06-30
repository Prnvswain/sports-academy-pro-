import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

async function resetParentPassword() {
  try {
    const email = 'pranav.k.swain@gmail.com';
    const newPassword = 'Test123456'; // New temporary password
    
    const normalizedEmail = email.toLowerCase();
    
    console.log('Resetting password for parent:', normalizedEmail);
    console.log('New password:', newPassword);
    console.log('');
    
    const parent = await prisma.parent.findFirst({
      where: {
        email: normalizedEmail,
      },
    });

    if (!parent) {
      console.log('❌ Parent not found');
      return;
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    
    await prisma.parent.update({
      where: { parent_id: parent.parent_id },
      data: { 
        password_hash,
        must_change_password: true,
      },
    });

    console.log('✅ Password reset successfully');
    console.log('Parent ID:', parent.parent_id);
    console.log('Name:', parent.name);
    console.log('');
    console.log('Use this password to login: Test123456');
    console.log('You will be prompted to change it after login.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetParentPassword();
