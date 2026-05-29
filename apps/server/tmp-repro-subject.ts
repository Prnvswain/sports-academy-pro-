import { prisma } from '@school-syllabus/database';
import { syllabusService } from './src/services/syllabus.service.js';

async function main() {
  const school = await prisma.school.findFirst();
  if (!school) {
    throw new Error('No school available');
  }

  try {
    const item = await syllabusService.createSubject(school.id, { name: 'Subject no class test' });
    console.log('SUCCESS', item);
  } catch (error) {
    console.error('ERROR', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
