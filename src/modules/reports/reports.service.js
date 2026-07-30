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

// 1. Monthly Collection
export const exportMonthlyCollectionReport = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  const receipts = await prisma.receipt.findMany({
    where: { academy_id: academyId, status: 'COMPLETED' },
    orderBy: { payment_date: 'asc' }
  });

  const monthlyGroups = {};
  receipts.forEach(r => {
    const date = new Date(r.payment_date);
    const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!monthlyGroups[key]) {
      monthlyGroups[key] = { amount: 0, count: 0 };
    }
    monthlyGroups[key].amount += parseFloat(r.amount);
    monthlyGroups[key].count += 1;
  });

  const headers = ['Month', 'Total Amount Collected (₹)', 'Transaction Count'];
  const rows = Object.keys(monthlyGroups).map(key => ({
    'Month': key,
    'Total Amount Collected (₹)': monthlyGroups[key].amount.toFixed(2),
    'Transaction Count': monthlyGroups[key].count
  }));

  return toCsv(headers, rows);
};

export const exportMonthlyCollectionReportPdf = async (academy_id) => {
  const csv = await exportMonthlyCollectionReport(academy_id);
  const lines = csv.split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(line => line.split(','));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { color: #0f172a; margin-bottom: 5px; }
        p { color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
        th { background-color: #f8fafc; font-weight: bold; color: #0f172a; }
        tr:nth-child(even) { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>Monthly Collection Report</h1>
      <p>Report generated on ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(val => `<td>${val}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
};

// 2. Pending Fees
export const exportPendingFeesReport = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  const activeStudents = await prisma.student.findMany({
    where: { academy_id: academyId, status: 'ACTIVE', is_deleted: false, auto_deactivated: false },
    include: {
      enrollments: { where: { is_active: true } },
      receipts: { where: { status: 'COMPLETED' } }
    }
  });

  const headers = ['Student Name', 'Parent Name', 'Parent Email', 'Parent Phone', 'Next Due Date', 'Total Assigned (₹)', 'Total Paid (₹)', 'Pending Dues (₹)'];
  const rows = [];

  activeStudents.forEach(student => {
    const totalFeeDue = student.enrollments.reduce((sum, e) => sum + parseFloat(e.final_fee || 0), 0);
    const totalPaid = student.receipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const balance = Math.max(0, totalFeeDue - totalPaid);

    if (balance > 0) {
      const latestEnrollment = student.enrollments[0];
      const dueDate = latestEnrollment?.next_due_date ? new Date(latestEnrollment.next_due_date).toLocaleDateString() : '—';
      rows.push({
        'Student Name': student.name,
        'Parent Name': student.parent_name || '—',
        'Parent Email': student.parent_email || '—',
        'Parent Phone': student.parent_phone || '—',
        'Next Due Date': dueDate,
        'Total Assigned (₹)': totalFeeDue.toFixed(2),
        'Total Paid (₹)': totalPaid.toFixed(2),
        'Pending Dues (₹)': balance.toFixed(2)
      });
    }
  });

  return toCsv(headers, rows);
};

export const exportPendingFeesReportPdf = async (academy_id) => {
  const csv = await exportPendingFeesReport(academy_id);
  const lines = csv.split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(line => line.split(','));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { color: #0f172a; margin-bottom: 5px; }
        p { color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
        th { background-color: #f8fafc; font-weight: bold; color: #0f172a; }
        tr:nth-child(even) { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>Pending Fees Report</h1>
      <p>Report generated on ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(val => `<td>${val}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
};

// 3. Student-wise Fee Report
export const exportStudentFeeReport = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  const activeStudents = await prisma.student.findMany({
    where: { academy_id: academyId, status: 'ACTIVE', is_deleted: false, auto_deactivated: false },
    include: {
      enrollments: { where: { is_active: true }, include: { sport: true } },
      receipts: { where: { status: 'COMPLETED' } }
    }
  });

  const headers = ['Student Name', 'Sport', 'Total Assigned (₹)', 'Total Paid (₹)', 'Outstanding Balance (₹)', 'Status'];
  const rows = activeStudents.map(student => {
    const totalFeeDue = student.enrollments.reduce((sum, e) => sum + parseFloat(e.final_fee || 0), 0);
    const totalPaid = student.receipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const balance = Math.max(0, totalFeeDue - totalPaid);

    let status = 'unpaid';
    if (totalPaid >= totalFeeDue && totalFeeDue > 0) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    const sportName = student.enrollments[0]?.sport?.name || '—';

    return {
      'Student Name': student.name,
      'Sport': sportName,
      'Total Assigned (₹)': totalFeeDue.toFixed(2),
      'Total Paid (₹)': totalPaid.toFixed(2),
      'Outstanding Balance (₹)': balance.toFixed(2),
      'Status': status.toUpperCase()
    };
  });

  return toCsv(headers, rows);
};

export const exportStudentFeeReportPdf = async (academy_id) => {
  const csv = await exportStudentFeeReport(academy_id);
  const lines = csv.split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(line => line.split(','));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { color: #0f172a; margin-bottom: 5px; }
        p { color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
        th { background-color: #f8fafc; font-weight: bold; color: #0f172a; }
        tr:nth-child(even) { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>Student-wise Fee Report</h1>
      <p>Report generated on ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(val => `<td>${val}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
};

// 4. Batch-wise Collection
export const exportBatchCollectionReport = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  const batches = await prisma.batch.findMany({
    where: { academy_id: academyId, status: 'ACTIVE' },
    include: {
      sport: true,
      students: {
        where: { is_deleted: false, auto_deactivated: false },
        include: {
          enrollments: { where: { is_active: true } },
          receipts: { where: { status: 'COMPLETED' } }
        }
      }
    }
  });

  const headers = ['Batch Name', 'Sport', 'Student Count', 'Total Collected (₹)', 'Total Dues Outstanding (₹)'];
  const rows = batches.map(batch => {
    let totalCollected = 0;
    let totalDues = 0;

    batch.students.forEach(student => {
      const totalFeeDue = student.enrollments.reduce((sum, e) => sum + parseFloat(e.final_fee || 0), 0);
      const studentPaid = student.receipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
      const balance = Math.max(0, totalFeeDue - studentPaid);

      totalCollected += studentPaid;
      totalDues += balance;
    });

    return {
      'Batch Name': batch.name,
      'Sport': batch.sport?.name || '—',
      'Student Count': batch.students.length,
      'Total Collected (₹)': totalCollected.toFixed(2),
      'Total Dues Outstanding (₹)': totalDues.toFixed(2)
    };
  });

  return toCsv(headers, rows);
};

export const exportBatchCollectionReportPdf = async (academy_id) => {
  const csv = await exportBatchCollectionReport(academy_id);
  const lines = csv.split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(line => line.split(','));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { color: #0f172a; margin-bottom: 5px; }
        p { color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
        th { background-color: #f8fafc; font-weight: bold; color: #0f172a; }
        tr:nth-child(even) { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>Batch-wise Collection Report</h1>
      <p>Report generated on ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(val => `<td>${val}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
};
