import prisma from '../../config/prisma.js';
import { NOT_DELETED } from '../../utils/softDelete.util.js';

const escapeCsv = (value) => {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsv = (headers, rows) => {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  return lines.join('\n');
};

export const exportAttendanceReport = async (academy_id, { from, to } = {}) => {
  const academyId = parseInt(academy_id, 10);
  const dateFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  const records = await prisma.studentAttendance.findMany({
    where: {
      academy_id: academyId,
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
    },
    include: {
      student: true,
      batch: true,
      coach: { select: { name: true } }
    },
    orderBy: { date: 'desc' }
  });

  const headers = [
    'date',
    'student_name',
    'batch_name',
    'status',
    'coach_name',
    'remarks'
  ];

  const rows = records.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    student_name: r.student?.name,
    batch_name: r.batch?.name,
    status: r.status,
    coach_name: r.coach?.name,
    remarks: r.remarks
  }));

  return toCsv(headers, rows);
};

export const exportStudentsReport = async (academy_id) => {
  const students = await prisma.student.findMany({
    where: { academy_id: parseInt(academy_id, 10), ...NOT_DELETED },
    include: { sport: true, batch: true }
  });

  const headers = [
    'name',
    'age',
    'gender',
    'sport',
    'batch',
    'parent_email',
    'fees_status',
    'status'
  ];

  const rows = students.map((s) => ({
    name: s.name,
    age: s.age,
    gender: s.gender,
    sport: s.sport?.name,
    batch: s.batch?.name,
    parent_email: s.parent_email,
    fees_status: s.fees_status,
    status: s.status
  }));

  return toCsv(headers, rows);
};

export const exportFeesReport = async (academy_id) => {
  const payments = await prisma.payment.findMany({
    where: { academy_id: parseInt(academy_id, 10) },
    include: { student: true, collected_by: { select: { name: true } } },
    orderBy: { payment_date: 'desc' }
  });

  const headers = [
    'payment_date',
    'student_name',
    'amount',
    'method',
    'status',
    'collected_by',
    'remarks'
  ];

  const rows = payments.map((p) => ({
    payment_date: p.payment_date.toISOString().slice(0, 10),
    student_name: p.student?.name,
    amount: p.amount,
    method: p.method,
    status: p.status,
    collected_by: p.collected_by?.name,
    remarks: p.remarks
  }));

  return toCsv(headers, rows);
};
