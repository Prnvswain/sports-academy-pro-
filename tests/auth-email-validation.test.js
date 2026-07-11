import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAcademyAdminEmailUniqueness } from '../src/modules/auth/emailValidation.util.js';

test('blocks academy admin signup when another academy admin already uses the email', async () => {
  const prisma = {
    user: {
      findFirst: async () => ({ user_id: 42, role: 'ACADEMY_ADMIN' }),
    },
  };

  await assert.rejects(
    () => validateAcademyAdminEmailUniqueness({ prisma, email: 'Owner@Example.com' }),
    (error) => {
      assert.equal(error.message, 'Email already registered');
      assert.equal(error.statusCode, 409);
      return true;
    },
  );
});

test('allows academy admin signup when the email exists only in coach or parent records', async () => {
  const prisma = {
    user: {
      findFirst: async () => null,
    },
  };

  await assert.doesNotReject(() => validateAcademyAdminEmailUniqueness({ prisma, email: 'Owner@Example.com' }));
});
