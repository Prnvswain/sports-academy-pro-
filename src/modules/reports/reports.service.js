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

// PDF Export Functions
export const exportAttendanceReportPdf = async (academy_id, { from, to } = {}) => {
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

  // Generate simple HTML for PDF
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Attendance Report</h1>
      <p>Date Range: ${from || 'All'} to ${to || 'All'}</p>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Student Name</th>
            <th>Batch Name</th>
            <th>Status</th>
            <th>Coach Name</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(r => `
            <tr>
              <td>${r.date.toISOString().slice(0, 10)}</td>
              <td>${r.student?.name || 'N/A'}</td>
              <td>${r.batch?.name || 'N/A'}</td>
              <td>${r.status}</td>
              <td>${r.coach?.name || 'N/A'}</td>
              <td>${r.remarks || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  return html;
};

export const exportStudentsReportPdf = async (academy_id) => {
  const students = await prisma.student.findMany({
    where: { academy_id: parseInt(academy_id, 10), ...NOT_DELETED },
    include: { sport: true, batch: true }
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Students Report</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
            <th>Gender</th>
            <th>Sport</th>
            <th>Batch</th>
            <th>Parent Email</th>
            <th>Fees Status</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td>${s.name}</td>
              <td>${s.age || 'N/A'}</td>
              <td>${s.gender || 'N/A'}</td>
              <td>${s.sport?.name || 'N/A'}</td>
              <td>${s.batch?.name || 'N/A'}</td>
              <td>${s.parent_email || 'N/A'}</td>
              <td>${s.fees_status}</td>
              <td>${s.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  return html;
};

export const exportFeesReportPdf = async (academy_id) => {
  const payments = await prisma.receipt.findMany({
    where: { academy_id: parseInt(academy_id, 10) },
    include: { student: true, collected_by: { select: { name: true } } },
    orderBy: { payment_date: 'desc' }
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Fees Report</h1>
      <table>
        <thead>
          <tr>
            <th>Payment Date</th>
            <th>Student Name</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Collected By</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${payments.map(p => `
            <tr>
              <td>${p.payment_date.toISOString().slice(0, 10)}</td>
              <td>${p.student?.name || 'N/A'}</td>
              <td>${p.amount}</td>
              <td>${p.method || 'N/A'}</td>
              <td>${p.status}</td>
              <td>${p.collected_by?.name || 'N/A'}</td>
              <td>${p.remarks || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  return html;
};

// Coach Report Export
export const exportCoachesReport = async (academy_id) => {
  const coaches = await prisma.coach.findMany({
    where: { academy_id: parseInt(academy_id, 10), ...NOT_DELETED },
    include: {
      batches: {
        include: {
          batch: {
            include: {
              sport: true,
              students: {
                where: { ...NOT_DELETED },
                select: { student_id: true }
              }
            }
          }
        }
      },
      student_attendances: {
        where: {
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        },
        select: { attendance_id: true }
      }
    }
  });

  const headers = [
    'name',
    'email',
    'phone_number',
    'specialization',
    'status',
    'batches_count',
    'students_count',
    'attendance_last_30d'
  ];

  const rows = coaches.map((c) => ({
    name: c.name,
    email: c.email || 'N/A',
    phone_number: c.phone_number || 'N/A',
    specialization: c.specialization || 'N/A',
    status: c.status,
    batches_count: c.batches.length,
    students_count: c.batches.reduce((sum, b) => sum + (b.batch?.students?.length || 0), 0),
    attendance_last_30d: c.student_attendances.length
  }));

  return toCsv(headers, rows);
};

export const exportCoachesReportPdf = async (academy_id) => {
  const coaches = await prisma.coach.findMany({
    where: { academy_id: parseInt(academy_id, 10), ...NOT_DELETED },
    include: {
      batches: {
        include: {
          batch: {
            include: {
              sport: true,
              students: {
                where: { ...NOT_DELETED },
                select: { student_id: true }
              }
            }
          }
        }
      },
      student_attendances: {
        where: {
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        },
        select: { attendance_id: true }
      }
    }
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Coaches Report</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Specialization</th>
            <th>Status</th>
            <th>Batches</th>
            <th>Students</th>
            <th>Attendance (30d)</th>
          </tr>
        </thead>
        <tbody>
          ${coaches.map(c => `
            <tr>
              <td>${c.name}</td>
              <td>${c.email || 'N/A'}</td>
              <td>${c.phone_number || 'N/A'}</td>
              <td>${c.specialization || 'N/A'}</td>
              <td>${c.status}</td>
              <td>${c.batches.length}</td>
              <td>${c.batches.reduce((sum, b) => sum + (b.batch?.students?.length || 0), 0)}</td>
              <td>${c.student_attendances.length}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  return html;
};

// Batch Report Export
export const exportBatchesReport = async (academy_id) => {
  const batches = await prisma.batch.findMany({
    where: { academy_id: parseInt(academy_id, 10), ...NOT_DELETED },
    include: {
      sport: true,
      coaches: {
        include: {
          coach: {
            select: { name: true, email: true }
          }
        }
      },
      students: {
        where: { ...NOT_DELETED },
        select: { student_id: true }
      },
      student_attendances: {
        where: {
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        },
        select: { attendance_id: true }
      }
    }
  });

  const headers = [
    'name',
    'sport',
    'timing',
    'start_time',
    'end_time',
    'max_capacity',
    'status',
    'coaches_count',
    'students_count',
    'attendance_last_30d'
  ];

  const rows = batches.map((b) => ({
    name: b.name,
    sport: b.sport?.name || 'N/A',
    timing: b.timing || 'N/A',
    start_time: b.start_time || 'N/A',
    end_time: b.end_time || 'N/A',
    max_capacity: b.max_capacity || 'N/A',
    status: b.status,
    coaches_count: b.coaches.length,
    students_count: b.students.length,
    attendance_last_30d: b.student_attendances.length
  }));

  return toCsv(headers, rows);
};

export const exportBatchesReportPdf = async (academy_id) => {
  const batches = await prisma.batch.findMany({
    where: { academy_id: parseInt(academy_id, 10), ...NOT_DELETED },
    include: {
      sport: true,
      coaches: {
        include: {
          coach: {
            select: { name: true, email: true }
          }
        }
      },
      students: {
        where: { ...NOT_DELETED },
        select: { student_id: true }
      },
      student_attendances: {
        where: {
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        },
        select: { attendance_id: true }
      }
    }
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Batches Report</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Sport</th>
            <th>Timing</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Max Capacity</th>
            <th>Status</th>
            <th>Coaches</th>
            <th>Students</th>
            <th>Attendance (30d)</th>
          </tr>
        </thead>
        <tbody>
          ${batches.map(b => `
            <tr>
              <td>${b.name}</td>
              <td>${b.sport?.name || 'N/A'}</td>
              <td>${b.timing || 'N/A'}</td>
              <td>${b.start_time || 'N/A'}</td>
              <td>${b.end_time || 'N/A'}</td>
              <td>${b.max_capacity || 'N/A'}</td>
              <td>${b.status}</td>
              <td>${b.coaches.length}</td>
              <td>${b.students.length}</td>
              <td>${b.student_attendances.length}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  return html;
};
