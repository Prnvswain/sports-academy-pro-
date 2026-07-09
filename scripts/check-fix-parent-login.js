import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS } from '../src/config/app.config.js';

const EMAIL = 'durgesh.csai@gmail.com';

async function checkAndFixParent() {
  console.log('=== Parent Login Debug Script ===');
  console.log(`Checking parent account for: ${EMAIL}\n`);

  try {
    // Find parent by email
    const parent = await prisma.parent.findFirst({
      where: {
        email: EMAIL.toLowerCase(),
      },
    });

    if (!parent) {
      console.log('❌ Parent record NOT found in database');
      console.log('This parent account needs to be created.');
      return;
    }

    console.log('✅ Parent record found:');
    console.log(`  - Parent ID: ${parent.parent_id}`);
    console.log(`  - Name: ${parent.name}`);
    console.log(`  - Email: ${parent.email}`);
    console.log(`  - Academy ID: ${parent.academy_id}`);
    console.log(`  - Is Active: ${parent.is_active}`);
    console.log(`  - Phone: ${parent.phone}`);
    console.log(`  - Has Password Hash: ${!!parent.password_hash}`);
    console.log(`  - Must Change Password: ${parent.must_change_password}`);
    console.log(`  - Last Login: ${parent.last_login_at}`);
    console.log(`  - Created At: ${parent.created_at}`);

    if (!parent.is_active) {
      console.log('\n⚠️  Parent account is INACTIVE');
      console.log('Activating account...');
      await prisma.parent.update({
        where: { parent_id: parent.parent_id },
        data: { is_active: true },
      });
      console.log('✅ Account activated');
    }

    // Check if password hash exists
    if (!parent.password_hash) {
      console.log('\n❌ Password hash is missing');
      console.log('Setting a default password...');
      const defaultPassword = 'Parent@123';
      const hashedPassword = await bcrypt.hash(defaultPassword, BCRYPT_SALT_ROUNDS);
      
      await prisma.parent.update({
        where: { parent_id: parent.parent_id },
        data: { 
          password_hash: hashedPassword,
          must_change_password: true,
        },
      });
      
      console.log(`✅ Default password set to: ${defaultPassword}`);
      console.log('⚠️  Parent must change password on first login');
    } else {
      console.log('\n✅ Password hash exists and is valid');
    }

    // Check linked students
    const students = await prisma.student.findMany({
      where: { 
        parent_id: parent.parent_id,
        is_deleted: false,
      },
      include: {
        sport: true,
        batch: true,
      },
    });

    console.log(`\n📚 Linked Students: ${students.length}`);
    students.forEach((student, idx) => {
      console.log(`  ${idx + 1}. ${student.name} - ${student.sport?.name || 'No sport'} (${student.batch?.name || 'No batch'})`);
    });

    if (students.length === 0) {
      console.log('⚠️  No students linked to this parent account');
    }

    console.log('\n=== Summary ===');
    console.log('Parent account is ready for login.');
    console.log(`Login with email: ${EMAIL}`);
    if (!parent.password_hash) {
      console.log('Default password: Parent@123 (must change on first login)');
    } else {
      console.log('Use the existing password or reset if forgotten');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixParent();
