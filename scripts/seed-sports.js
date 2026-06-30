import { seedDefaultSports } from '../src/modules/super-admin/super-admin.service.js';
import prisma from '../src/config/prisma.js';

async function seedSports() {
  try {
    console.log('Seeding default sports...');
    const result = await seedDefaultSports();
    console.log('Result:', result);
  } catch (error) {
    console.error('Error seeding sports:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSports();
