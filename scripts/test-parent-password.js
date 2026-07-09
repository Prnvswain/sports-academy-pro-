import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

const EMAIL = 'durgesh.csai@gmail.com';
const TEST_PASSWORD = 'Parent@123'; // Common default password

async function testPasswordVerification() {
  console.log('=== Parent Password Verification Test ===');
  console.log(`Testing password verification for: ${EMAIL}\n`);

  try {
    const parent = await prisma.parent.findFirst({
      where: {
        email: EMAIL.toLowerCase(),
      },
    });

    if (!parent) {
      console.log('❌ Parent not found');
      return;
    }

    console.log('✅ Parent found');
    console.log(`Password hash: ${parent.password_hash.substring(0, 20)}...`);

    // Test with common passwords
    const testPasswords = [
      'Parent@123',
      'password',
      '123456',
      'admin',
      'parent123',
    ];

    console.log('\nTesting common passwords:');
    for (const pwd of testPasswords) {
      const isValid = await bcrypt.compare(pwd, parent.password_hash);
      console.log(`  ${pwd.padEnd(20)}: ${isValid ? '✅ MATCH' : '❌ NO MATCH'}`);
    }

    // Test if the hash can be verified against itself (should always work)
    const selfCheck = await bcrypt.compare(parent.password_hash, parent.password_hash);
    console.log(`\nHash self-check: ${selfCheck ? '✅ Valid hash format' : '❌ Invalid hash format'}`);

    // Check hash format
    console.log(`\nHash format check:`);
    console.log(`  Starts with $2a$ or $2b$: ${parent.password_hash.startsWith('$2a$') || parent.password_hash.startsWith('$2b$') ? '✅' : '❌'}`);
    console.log(`  Hash length: ${parent.password_hash.length} (expected 60)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPasswordVerification();
