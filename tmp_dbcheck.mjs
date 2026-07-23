import prisma from './src/config/prisma.js';

const getUtcMidnight = (val) => {
  if (!val) {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [year, month, day] = val.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    const dateMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const day = parseInt(dateMatch[3], 10);
      return new Date(Date.UTC(year, month - 1, day));
    }
    const d = new Date(val);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  if (val instanceof Date) {
    return new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate()));
  }
  const d = new Date(val);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

console.log("getUtcMidnight('2026-07-22'):", getUtcMidnight('2026-07-22').toISOString());

const rec = await prisma.coachAttendance.findFirst({
  where: {
    coach_id: 1,
    batch_id: 15,
    date: getUtcMidnight('2026-07-22')
  }
});
console.log("Found record:", rec ? rec.attendance_id : "null");

await prisma.$disconnect();
