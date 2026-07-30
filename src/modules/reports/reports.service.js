import { prisma } from '../../config/prisma.js';
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

// ==================== JSON REPORT DATA FUNCTIONS ====================

// Helper to parse date range filters
const parseDateRange = (filters) => {
  const startDate = filters.startDate ? new Date(filters.startDate) : null;
  const endDate = filters.endDate ? new Date(filters.endDate) : null;
  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
  }
  return { startDate, endDate };
};

// Attendance Report Data
export const getAttendanceReportData = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { startDate, endDate } = parseDateRange(filters);
  
  const where = { academy_id: academyId };
  
  if (startDate && endDate) {
    where.date = { gte: startDate, lte: endDate };
  } else if (startDate) {
    where.date = { gte: startDate };
  } else if (endDate) {
    where.date = { lte: endDate };
  }
  
  if (filters.sport) {
    where.student = {
      enrollments: {
        some: {
          sport: { name: filters.sport }
        }
      }
    };
  }
  
  if (filters.batch) {
    where.batch = { name: filters.batch };
  }
  
  if (filters.coach) {
    where.batch = {
      coaches: {
        some: {
          coach: {
            name: filters.coach
          }
        }
      }
    };
  }
  
  if (filters.ageCategory) {
    where.student = { category: filters.ageCategory };
  }
  
  const attendances = await prisma.studentAttendance.findMany({
    where,
    include: {
      student: {
        include: {
          enrollments: { include: { sport: true } }
        }
      },
      batch: {
        include: {
          sport: true,
          coaches: {
            include: {
              coach: true
            }
          }
        }
      }
    },
    orderBy: { date: 'desc' }
  });
  
  const totalStudents = attendances.length;
  const present = attendances.filter(a => a.status === 'PRESENT').length;
  const absent = attendances.filter(a => a.status === 'ABSENT').length;
  const late = attendances.filter(a => a.status === 'LATE').length;
  const attendancePercentage = totalStudents > 0 ? ((present + late) / totalStudents * 100).toFixed(1) : 0;
  
  // Get coach attendance
  const coachAttendances = await prisma.coachAttendance.findMany({
    where: {
      academy_id: academyId,
      ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {})
    },
    include: { coach: true }
  });
  
  const totalCoaches = coachAttendances.length;
  const presentCoaches = coachAttendances.filter(c => c.status === 'PRESENT').length;
  
  const summary = {
    totalStudents,
    present,
    absent,
    late,
    attendancePercentage: parseFloat(attendancePercentage),
    totalCoaches,
    presentCoaches
  };
  
  const charts = [
    {
      type: 'pie',
      data: [
        { name: 'Present', value: present },
        { name: 'Absent', value: absent },
        { name: 'Late', value: late }
      ]
    }
  ];
  
  const table = {
    headers: ['Student Name', 'Batch', 'Sport', 'Status', 'Date'],
    rows: attendances.map(a => [
      a.student.name,
      a.batch.name,
      a.student.enrollments[0]?.sport?.name || '—',
      a.status,
      new Date(a.date).toLocaleDateString()
    ])
  };
  
  return { summary, charts, table };
};

// Revenue Report Data
export const getRevenueReportData = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { startDate, endDate } = parseDateRange(filters);
  
  const where = { 
    academy_id: academyId,
    status: 'COMPLETED'
  };
  
  if (startDate && endDate) {
    where.payment_date = { gte: startDate, lte: endDate };
  } else if (startDate) {
    where.payment_date = { gte: startDate };
  } else if (endDate) {
    where.payment_date = { lte: endDate };
  }
  
  if (filters.sport) {
    where.student = {
      enrollments: {
        some: {
          sport: { name: filters.sport }
        }
      }
    };
  }
  
  if (filters.batch) {
    where.student = {
      enrollments: {
        some: {
          batch: { name: filters.batch }
        }
      }
    };
  }
  
  if (filters.paymentMethod) {
    where.payment_method = filters.paymentMethod;
  }
  
  const receipts = await prisma.receipt.findMany({
    where,
    include: {
      student: {
        include: {
          enrollments: { include: { sport: true } }
        }
      }
    },
    orderBy: { payment_date: 'desc' }
  });
  
  const totalRevenue = receipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  
  // Get this month's revenue
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthRevenue = receipts
    .filter(r => new Date(r.payment_date) >= monthStart)
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  
  // Get pending revenue
  const pendingReceipts = await prisma.receipt.findMany({
    where: {
      academy_id: academyId,
      status: 'PENDING'
    }
  });
  const pending = pendingReceipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  
  // Calculate growth rate (compare with previous month)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthReceipts = await prisma.receipt.findMany({
    where: {
      academy_id: academyId,
      status: 'COMPLETED',
      payment_date: { gte: prevMonthStart, lt: prevMonthEnd }
    }
  });
  const prevMonthRevenue = prevMonthReceipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const growthRate = prevMonthRevenue > 0 
    ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1)
    : 0;
  
  const summary = {
    totalRevenue,
    thisMonthRevenue,
    pending,
    growthRate: parseFloat(growthRate)
  };
  
  // Group by month for chart
  const monthlyRevenue = {};
  receipts.forEach(r => {
    const date = new Date(r.payment_date);
    const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!monthlyRevenue[key]) monthlyRevenue[key] = 0;
    monthlyRevenue[key] += parseFloat(r.amount || 0);
  });
  
  const charts = [
    {
      type: 'bar',
      data: Object.values(monthlyRevenue)
    },
    {
      type: 'pie',
      data: [
        { name: 'Collected', value: totalRevenue },
        { name: 'Pending', value: pending }
      ]
    }
  ];
  
  const table = {
    headers: ['Date', 'Student', 'Amount', 'Method', 'Status'],
    rows: receipts.map(r => [
      new Date(r.payment_date).toLocaleDateString(),
      r.student.name,
      `₹${parseFloat(r.amount).toFixed(2)}`,
      r.payment_method || '—',
      r.status
    ])
  };
  
  return { summary, charts, table };
};

// Fees Report Data
export const getFeesReportData = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { startDate, endDate } = parseDateRange(filters);
  
  const where = { 
    academy_id: academyId,
    status: 'ACTIVE',
    is_deleted: false,
    auto_deactivated: false
  };
  
  if (filters.sport) {
    where.enrollments = {
      some: {
        sport: { name: filters.sport }
      }
    };
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.plan) {
    where.enrollments = {
      some: {
        plan_type: filters.plan
      }
    };
  }
  
  const students = await prisma.student.findMany({
    where,
    include: {
      enrollments: { 
        where: { is_active: true },
        include: { sport: true }
      },
      receipts: { where: { status: 'COMPLETED' } }
    }
  });
  
  let totalAssigned = 0;
  let totalCollected = 0;
  let pendingDues = 0;
  let overdueStudents = 0;
  const tableRows = [];
  
  students.forEach(student => {
    const totalFeeDue = student.enrollments.reduce((sum, e) => sum + parseFloat(e.final_fee || 0), 0);
    const totalPaid = student.receipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const balance = Math.max(0, totalFeeDue - totalPaid);
    
    totalAssigned += totalFeeDue;
    totalCollected += totalPaid;
    pendingDues += balance;
    
    if (balance > 0) {
      const latestEnrollment = student.enrollments[0];
      const dueDate = latestEnrollment?.next_due_date ? new Date(latestEnrollment.next_due_date) : null;
      if (dueDate && dueDate < new Date()) {
        overdueStudents++;
      }
      
      tableRows.push([
        student.name,
        student.parent_name || '—',
        `₹${totalFeeDue.toFixed(2)}`,
        `₹${totalPaid.toFixed(2)}`,
        `₹${balance.toFixed(2)}`,
        latestEnrollment?.next_due_date ? new Date(latestEnrollment.next_due_date).toLocaleDateString() : '—'
      ]);
    }
  });
  
  const summary = {
    totalAssigned,
    totalCollected,
    pendingDues,
    overdueStudents
  };
  
  const charts = [
    {
      type: 'pie',
      data: [
        { name: 'Paid', value: totalCollected },
        { name: 'Pending', value: pendingDues }
      ]
    }
  ];
  
  const table = {
    headers: ['Student Name', 'Parent Name', 'Total Assigned', 'Paid', 'Pending', 'Due Date'],
    rows: tableRows
  };
  
  return { summary, charts, table };
};

// Performance Report Data
export const getPerformanceReportData = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { startDate, endDate } = parseDateRange(filters);
  
  const where = { academy_id: academyId };
  
  if (startDate && endDate) {
    where.created_at = { gte: startDate, lte: endDate };
  } else if (startDate) {
    where.created_at = { gte: startDate };
  } else if (endDate) {
    where.created_at = { lte: endDate };
  }
  
  if (filters.sport) {
    where.attribute = {
      sport: { name: filters.sport }
    };
  }
  
  if (filters.batch) {
    where.student = {
      enrollments: {
        some: {
          batch: { name: filters.batch }
        }
      }
    };
  }
  
  if (filters.coach) {
    where.coach = { name: filters.coach };
  }
  
  if (filters.assessment) {
    where.attribute = { name: filters.assessment };
  }
  
  if (filters.ageCategory) {
    where.student = { age_category: filters.ageCategory };
  }
  
  const scores = await prisma.performanceScore.findMany({
    where,
    include: {
      student: {
        include: {
          enrollments: { include: { sport: true, batch: true } }
        }
      },
      attribute: true,
      coach: true
    },
    orderBy: { created_at: 'desc' }
  });
  
  const totalEvaluations = scores.length;
  const averageScore = totalEvaluations > 0 
    ? (scores.reduce((sum, s) => sum + parseFloat(s.score || 0), 0) / totalEvaluations).toFixed(1)
    : 0;
  
  const topPerformers = scores
    .filter((s, i, arr) => arr.filter(x => x.student_id === s.student_id).length > 0)
    .slice(0, 5);
  
  const summary = {
    totalEvaluations,
    averageScore: parseFloat(averageScore),
    topPerformers: topPerformers.length
  };
  
  // Group by attribute for chart
  const attributeScores = {};
  scores.forEach(s => {
    const attrName = s.attribute.name;
    if (!attributeScores[attrName]) attributeScores[attrName] = [];
    attributeScores[attrName].push(parseFloat(s.score || 0));
  });
  
  const charts = [
    {
      type: 'bar',
      data: Object.keys(attributeScores).map(attr => 
        attributeScores[attr].reduce((sum, val) => sum + val, 0) / attributeScores[attr].length
      )
    }
  ];
  
  const table = {
    headers: ['Student Name', 'Attribute', 'Score', 'Coach', 'Date'],
    rows: scores.map(s => [
      s.student.name,
      s.attribute.name,
      s.score,
      s.coach?.name || '—',
      new Date(s.created_at).toLocaleDateString()
    ])
  };
  
  return { summary, charts, table };
};

// Coach Report Data
export const getCoachReportData = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { startDate, endDate } = parseDateRange(filters);
  
  const where = { academy_id: academyId };
  
  if (filters.sport) {
    where.batch = {
      sport: {
        name: filters.sport
      }
    };
  }
  
  if (filters.coach) {
    where.coach = { name: filters.coach };
  }
  
  // Apply date filter to where clause
  if (startDate && endDate) {
    where.date = { gte: startDate, lte: endDate };
  }
  
  const coachAttendances = await prisma.coachAttendance.findMany({
    where,
    include: {
      coach: true,
      batch: {
        include: { sport: true }
      }
    },
    orderBy: { date: 'desc' }
  });
  
  const totalCoaches = coachAttendances.length;
  const present = coachAttendances.filter(c => c.status === 'PRESENT').length;
  const absent = coachAttendances.filter(c => c.status === 'ABSENT').length;
  const attendancePercentage = totalCoaches > 0 ? (present / totalCoaches * 100).toFixed(1) : 0;
  
  // Get coach sessions
  const sessions = await prisma.batchSession.findMany({
    where: {
      academy_id: academyId,
      ...(startDate && endDate ? { session_date: { gte: startDate, lte: endDate } } : {})
    },
    include: {
      batch: { include: { sport: true, coach: true } }
    }
  });
  
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
  
  const summary = {
    totalCoaches,
    present,
    absent,
    attendancePercentage: parseFloat(attendancePercentage),
    totalSessions,
    completedSessions
  };
  
  const charts = [
    {
      type: 'pie',
      data: [
        { name: 'Present', value: present },
        { name: 'Absent', value: absent }
      ]
    }
  ];
  
  const table = {
    headers: ['Coach Name', 'Sport', 'Status', 'Date', 'Check-in Time'],
    rows: coachAttendances.map(c => [
      c.coach.name,
      c.coach.sport?.name || '—',
      c.status,
      new Date(c.attendance_date).toLocaleDateString(),
      c.check_in_time || '—'
    ])
  };
  
  return { summary, charts, table };
};

// Batch Report Data
export const getBatchReportData = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  
  const where = { academy_id: academyId };
  
  if (filters.sport) {
    where.sport = { name: filters.sport };
  }
  
  if (filters.batch) {
    where.name = filters.batch;
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  const batches = await prisma.batch.findMany({
    where,
    include: {
      sport: true,
      coach: true,
      students: {
        where: { is_deleted: false, auto_deactivated: false },
        include: {
          enrollments: { where: { is_active: true } },
          receipts: { where: { status: 'COMPLETED' } }
        }
      }
    }
  });
  
  const totalBatches = batches.length;
  const totalStudents = batches.reduce((sum, b) => sum + b.students.length, 0);
  const activeBatches = batches.filter(b => b.status === 'ACTIVE').length;
  
  const tableRows = batches.map(batch => {
    let totalCollected = 0;
    let totalDues = 0;
    
    batch.students.forEach(student => {
      const totalFeeDue = student.enrollments.reduce((sum, e) => sum + parseFloat(e.final_fee || 0), 0);
      const studentPaid = student.receipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
      const balance = Math.max(0, totalFeeDue - studentPaid);
      
      totalCollected += studentPaid;
      totalDues += balance;
    });
    
    return [
      batch.name,
      batch.sport?.name || '—',
      batch.coach?.name || '—',
      batch.students.length,
      batch.status,
      `₹${totalCollected.toFixed(2)}`,
      `₹${totalDues.toFixed(2)}`
    ];
  });
  
  const summary = {
    totalBatches,
    totalStudents,
    activeBatches
  };
  
  const charts = [
    {
      type: 'pie',
      data: [
        { name: 'Active', value: activeBatches },
        { name: 'Inactive', value: totalBatches - activeBatches }
      ]
    }
  ];
  
  const table = {
    headers: ['Batch Name', 'Sport', 'Coach', 'Students', 'Status', 'Collected', 'Dues'],
    rows: tableRows
  };
  
  return { summary, charts, table };
};

// Sports Report Data
export const getSportsReportData = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { startDate, endDate } = parseDateRange(filters);
  
  const where = { academy_id: academyId };
  
  if (filters.sport) {
    where.name = filters.sport;
  }
  
  const sports = await prisma.sport.findMany({
    where,
    include: {
      batches: {
        where: { status: 'ACTIVE' },
        include: {
          students: {
            where: { is_deleted: false, auto_deactivated: false }
          }
        }
      },
      enrollments: {
        where: { is_active: true },
        include: { student: true }
      }
    }
  });
  
  const totalSports = sports.length;
  const totalBatches = sports.reduce((sum, s) => sum + s.batches.length, 0);
  const totalEnrollments = sports.reduce((sum, s) => sum + s.enrollments.length, 0);
  
  const tableRows = sports.map(sport => [
    sport.name,
    sport.batches.length,
    sport.enrollments.length,
    sport.batches.reduce((sum, b) => sum + b.students.length, 0)
  ]);
  
  const summary = {
    totalSports,
    totalBatches,
    totalEnrollments
  };
  
  const charts = [
    {
      type: 'bar',
      data: sports.map(s => s.enrollments.length)
    }
  ];
  
  const table = {
    headers: ['Sport Name', 'Active Batches', 'Enrollments', 'Students'],
    rows: tableRows
  };
  
  return { summary, charts, table };
};

// Inventory Report Data
export const getInventoryReportData = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  
  const where = { academy_id: academyId };
  
  if (filters.category) {
    where.category = filters.category;
  }
  
  if (filters.stockStatus) {
    if (filters.stockStatus === 'In Stock') {
      where.available_qty = { gt: 0 };
    } else if (filters.stockStatus === 'Low Stock') {
      // Will filter after fetching since min_stock_alert varies per item
    } else if (filters.stockStatus === 'Out of Stock') {
      where.available_qty = 0;
    }
  }
  
  const items = await prisma.inventoryItem.findMany({
    where,
    include: { sport: true },
    orderBy: { name: 'asc' }
  });
  
  // Filter for low stock after fetching
  let filteredItems = items;
  if (filters.stockStatus === 'Low Stock') {
    filteredItems = items.filter(i => i.available_qty > 0 && i.available_qty <= i.min_stock_alert);
  }
  
  const totalItems = filteredItems.length;
  const totalQuantity = filteredItems.reduce((sum, i) => sum + i.total_qty, 0);
  const availableQuantity = filteredItems.reduce((sum, i) => sum + i.available_qty, 0);
  const lowStockItems = filteredItems.filter(i => i.available_qty <= i.min_stock_alert).length;
  const outOfStockItems = filteredItems.filter(i => i.available_qty === 0).length;
  
  const tableRows = filteredItems.map(item => [
    item.name,
    item.category,
    item.sport?.name || '—',
    item.total_qty,
    item.available_qty,
    item.available_qty <= item.min_stock_alert ? 'Low Stock' : 'In Stock',
    `₹${item.purchase_price ? parseFloat(item.purchase_price).toFixed(2) : '—'}`
  ]);
  
  const summary = {
    totalItems,
    totalQuantity,
    availableQuantity,
    lowStockItems,
    outOfStockItems
  };
  
  const charts = [
    {
      type: 'pie',
      data: [
        { name: 'In Stock', value: items.filter(i => i.available_qty > i.min_stock_alert).length },
        { name: 'Low Stock', value: lowStockItems },
        { name: 'Out of Stock', value: outOfStockItems }
      ]
    }
  ];
  
  const table = {
    headers: ['Item Name', 'Category', 'Sport', 'Total Qty', 'Available', 'Status', 'Purchase Price'],
    rows: tableRows
  };
  
  return { summary, charts, table };
};

// Enquiry Report Data
export const getEnquiryReportData = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { startDate, endDate } = parseDateRange(filters);
  
  const where = { academy_id: academyId };
  
  if (startDate && endDate) {
    where.created_at = { gte: startDate, lte: endDate };
  } else if (startDate) {
    where.created_at = { gte: startDate };
  } else if (endDate) {
    where.created_at = { lte: endDate };
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.source) {
    where.source = filters.source;
  }
  
  const enquiries = await prisma.enquiry.findMany({
    where,
    orderBy: { created_at: 'desc' }
  });
  
  const totalEnquiries = enquiries.length;
  const newEnquiries = enquiries.filter(e => e.status === 'NEW').length;
  const convertedEnquiries = enquiries.filter(e => e.status === 'CONVERTED').length;
  const conversionRate = totalEnquiries > 0 ? (convertedEnquiries / totalEnquiries * 100).toFixed(1) : 0;
  
  const tableRows = enquiries.map(e => [
    e.name,
    e.phone,
    e.sport_interest || '—',
    e.status,
    e.source || '—',
    new Date(e.created_at).toLocaleDateString()
  ]);
  
  const summary = {
    totalEnquiries,
    newEnquiries,
    convertedEnquiries,
    conversionRate: parseFloat(conversionRate)
  };
  
  const charts = [
    {
      type: 'pie',
      data: [
        { name: 'New', value: newEnquiries },
        { name: 'Converted', value: convertedEnquiries },
        { name: 'Other', value: totalEnquiries - newEnquiries - convertedEnquiries }
      ]
    }
  ];
  
  const table = {
    headers: ['Name', 'Phone', 'Sport Interest', 'Status', 'Source', 'Created Date'],
    rows: tableRows
  };
  
  return { summary, charts, table };
};

// Filter Options Data
export const getFilterOptions = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  
  const [sports, batches, coaches, attributes] = await Promise.all([
    prisma.sport.findMany({
      where: { academy_id: academyId },
      select: { sport_id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    prisma.batch.findMany({
      where: { academy_id: academyId, status: 'ACTIVE' },
      select: { batch_id: true, name: true, sport_id: true },
      orderBy: { name: 'asc' }
    }),
    prisma.coach.findMany({
      where: { academy_id: academyId, status: 'ACTIVE' },
      select: { coach_id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    prisma.performanceAttribute.findMany({
      where: { academy_id: academyId },
      select: { name: true },
      orderBy: { name: 'asc' }
    })
  ]);
  
  // Fetch coach-batch relationships for cascading filters
  const coachBatches = await prisma.batchCoach.findMany({
    where: {
      coach: { academy_id: academyId },
      batch: { academy_id: academyId }
    },
    select: {
      coach_id: true,
      batch_id: true
    }
  });
  
  // Build relationship map for cascading filters
  const batchToSportMap = {};
  batches.forEach(batch => {
    batchToSportMap[batch.name] = batch.sport_id;
  });
  
  const sportIdToNameMap = {};
  sports.forEach(sport => {
    sportIdToNameMap[sport.sport_id] = sport.name;
  });
  
  const batchIdToNameMap = {};
  batches.forEach(batch => {
    batchIdToNameMap[batch.batch_id] = batch.name;
  });
  
  const coachIdToNameMap = {};
  coaches.forEach(coach => {
    coachIdToNameMap[coach.coach_id] = coach.name;
  });
  
  // Build coach-batch relationships
  const coachBatchRelations = {};
  coachBatches.forEach(relation => {
    const coachName = coachIdToNameMap[relation.coach_id];
    const batchName = batchIdToNameMap[relation.batch_id];
    if (coachName && batchName) {
      if (!coachBatchRelations[coachName]) {
        coachBatchRelations[coachName] = [];
      }
      coachBatchRelations[coachName].push(batchName);
    }
  });
  
  // Build batch-coach relationships (reverse)
  const batchCoachRelations = {};
  coachBatches.forEach(relation => {
    const coachName = coachIdToNameMap[relation.coach_id];
    const batchName = batchIdToNameMap[relation.batch_id];
    if (coachName && batchName) {
      if (!batchCoachRelations[batchName]) {
        batchCoachRelations[batchName] = [];
      }
      batchCoachRelations[batchName].push(coachName);
    }
  });
  
  const result = {
    sport: sports.map(s => s.name),
    batch: batches.map(b => b.name),
    coach: coaches.map(c => c.name),
    assessment: attributes.map(a => a.name),
    // Add relationship data for cascading filters
    relations: {
      batchToSport: batchToSportMap,
      sportIdToName: sportIdToNameMap,
      sportToBatches: sports.reduce((acc, sport) => {
        acc[sport.name] = batches.filter(b => b.sport_id === sport.sport_id).map(b => b.name);
        return acc;
      }, {}),
      coachToBatches: coachBatchRelations,
      batchToCoaches: batchCoachRelations
    }
  };
  
  console.log('getFilterOptions returning:', result);
  return result;
};
