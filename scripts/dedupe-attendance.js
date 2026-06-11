/**
 * Run once before db:push if unique constraint on student_attendance fails.
 * Keeps the latest row per (student_id, batch_id, date).
 */
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const main = async () => {
  const rows = await prisma.studentAttendance.findMany({
    orderBy: { created_at: 'desc' }
  });

  const seen = new Set();
  let removed = 0;

  for (const row of rows) {
    const key = `${row.student_id}-${row.batch_id}-${row.date.toISOString().slice(0, 10)}`;
    if (seen.has(key)) {
      await prisma.studentAttendance.delete({ where: { attendance_id: row.attendance_id } });
      removed += 1;
    } else {
      seen.add(key);
    }
  }

  console.log(`Removed ${removed} duplicate attendance row(s).`);
};

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
