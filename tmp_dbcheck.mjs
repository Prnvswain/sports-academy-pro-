import prisma from './src/config/prisma.js';

const parents = await prisma.parent.findMany({ take: 10, select: { parent_id: true, email: true, academy_id: true, name: true, is_active: true } });
console.log(JSON.stringify(parents, null, 2));
const students = await prisma.student.findMany({ take: 10, select: { student_id: true, parent_id: true, academy_id: true, name: true, is_deleted: true } });
console.log(JSON.stringify(students, null, 2));
await prisma.$disconnect();
