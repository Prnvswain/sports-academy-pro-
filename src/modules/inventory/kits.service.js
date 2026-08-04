import prisma from '../../config/prisma.js';
import logger from '../../utils/logger.js';
import { createNotification } from '../notifications/notifications.service.js';
import * as mailService from '../../services/mail.service.js';

const sendMail = mailService.sendMail || mailService.default?.sendMail || mailService.default;

// Get active sports for Sports List
export const getActiveSports = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  const sports = await prisma.sport.findMany({
    where: {
      academy_id: academyId,
      status: 'ACTIVE'
    },
    include: {
      globalSport: {
        select: {
          icon: true
        }
      },
      sports_kits: {
        select: {
          kit_id: true,
          available_qty: true,
          assigned_qty: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  return sports.map(sport => {
    const totalKits = sport.sports_kits.length;
    const availableStock = sport.sports_kits.reduce((sum, kit) => sum + (kit.available_qty || 0), 0);
    const assignedStock = sport.sports_kits.reduce((sum, kit) => sum + (kit.assigned_qty || 0), 0);
    return {
      sport_id: sport.sport_id,
      name: sport.name,
      description: sport.description,
      icon: sport.globalSport?.icon || '🏅',
      totalKits,
      availableStock,
      assignedStock
    };
  });
};

// Get kits of a sport
export const getKitsBySport = async (academy_id, sport_id) => {
  const academyId = parseInt(academy_id, 10);
  const sportId = parseInt(sport_id, 10);

  return await prisma.sportsKit.findMany({
    where: {
      academy_id: academyId,
      sport_id: sportId
    },
    orderBy: {
      created_at: 'desc'
    }
  });
};

// Create a new kit
export const createKit = async (academy_id, data) => {
  const academyId = parseInt(academy_id, 10);
  const sportId = parseInt(data.sport_id, 10);
  const totalQty = parseInt(data.total_qty, 10) || 0;

  // Validate duplicate name within the same sport
  const existingKit = await prisma.sportsKit.findFirst({
    where: {
      academy_id: academyId,
      sport_id: sportId,
      name: { equals: data.name }
    }
  });

  if (existingKit) {
    const error = new Error('A kit with this name already exists for this sport');
    error.statusCode = 400;
    throw error;
  }

  // Calculate base price from items JSON
  let basePrice = 0;
  const itemsList = typeof data.items === 'string' ? JSON.parse(data.items) : data.items || [];
  for (const item of itemsList) {
    const itemQty = parseInt(item.qty, 10) || 0;
    const itemPrice = parseFloat(item.price) || 0;
    basePrice += itemQty * itemPrice;
  }

  const sellingPrice = data.selling_price !== undefined ? parseFloat(data.selling_price) : basePrice;

  return await prisma.sportsKit.create({
    data: {
      academy_id: academyId,
      sport_id: sportId,
      name: data.name,
      description: data.description || null,
      status: data.status || 'ACTIVE',
      total_qty: totalQty,
      available_qty: totalQty,
      assigned_qty: 0,
      base_price: basePrice,
      selling_price: sellingPrice,
      items: typeof data.items === 'string' ? data.items : JSON.stringify(itemsList)
    }
  });
};

// Update a kit
export const updateKit = async (academy_id, kit_id, data) => {
  const academyId = parseInt(academy_id, 10);
  const kitId = parseInt(kit_id, 10);

  const kit = await prisma.sportsKit.findFirst({
    where: { kit_id: kitId, academy_id: academyId }
  });

  if (!kit) {
    const error = new Error('Kit not found');
    error.statusCode = 404;
    throw error;
  }

  // Duplicate name validation
  if (data.name && data.name !== kit.name) {
    const existingKit = await prisma.sportsKit.findFirst({
      where: {
        academy_id: academyId,
        sport_id: kit.sport_id,
        name: { equals: data.name }
      }
    });

    if (existingKit) {
      const error = new Error('A kit with this name already exists for this sport');
      error.statusCode = 400;
      throw error;
    }
  }

  // Calculate base price from items
  let basePrice = kit.base_price;
  let itemsJson = kit.items;
  if (data.items) {
    basePrice = 0;
    const itemsList = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
    for (const item of itemsList) {
      const itemQty = parseInt(item.qty, 10) || 0;
      const itemPrice = parseFloat(item.price) || 0;
      basePrice += itemQty * itemPrice;
    }
    itemsJson = typeof data.items === 'string' ? data.items : JSON.stringify(itemsList);
  }

  const sellingPrice = data.selling_price !== undefined ? parseFloat(data.selling_price) : (data.items ? basePrice : kit.selling_price);

  // Handle total stock change
  let totalQty = kit.total_qty;
  let availableQty = kit.available_qty;
  if (data.total_qty !== undefined) {
    totalQty = parseInt(data.total_qty, 10) || 0;
    const assignedQty = kit.assigned_qty;
    availableQty = totalQty - assignedQty;
    if (availableQty < 0) {
      const error = new Error('New total sets is less than currently assigned sets');
      error.statusCode = 400;
      throw error;
    }
  }

  return await prisma.sportsKit.update({
    where: { kit_id: kitId },
    data: {
      name: data.name !== undefined ? data.name : kit.name,
      description: data.description !== undefined ? data.description : kit.description,
      status: data.status !== undefined ? data.status : kit.status,
      total_qty: totalQty,
      available_qty: availableQty,
      base_price: basePrice,
      selling_price: sellingPrice,
      items: itemsJson
    }
  });
};

// Delete kit
export const deleteKit = async (academy_id, kit_id) => {
  const academyId = parseInt(academy_id, 10);
  const kitId = parseInt(kit_id, 10);

  const kit = await prisma.sportsKit.findFirst({
    where: { kit_id: kitId, academy_id: academyId }
  });

  if (!kit) {
    const error = new Error('Kit not found');
    error.statusCode = 404;
    throw error;
  }

  if (kit.assigned_qty > 0) {
    const error = new Error('Cannot delete kit with active assignments');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.sportsKit.delete({
    where: { kit_id: kitId }
  });
};

// Assign a kit to a student
export const assignKit = async (academy_id, kit_id, data) => {
  const academyId = parseInt(academy_id, 10);
  const kitId = parseInt(kit_id, 10);
  const studentId = parseInt(data.student_id, 10);

  // Check student
  const student = await prisma.student.findFirst({
    where: { student_id: studentId, academy_id: academyId, is_deleted: false },
    include: { parent: true }
  });

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // Get kit
  const kit = await prisma.sportsKit.findFirst({
    where: { kit_id: kitId, academy_id: academyId }
  });

  if (!kit) {
    const error = new Error('Kit not found');
    error.statusCode = 404;
    throw error;
  }

  if (kit.status !== 'ACTIVE') {
    const error = new Error('This kit is currently inactive');
    error.statusCode = 400;
    throw error;
  }

  if (kit.available_qty <= 0) {
    const error = new Error('This kit is out of stock');
    error.statusCode = 400;
    throw error;
  }

  // Check duplicate active assignment of same kit to same student
  const existingAssign = await prisma.sportsKitAssignment.findFirst({
    where: {
      kit_id: kitId,
      student_id: studentId,
      status: 'ACTIVE'
    }
  });

  if (existingAssign) {
    const error = new Error('This student already has an active assignment of this kit');
    error.statusCode = 400;
    throw error;
  }

  // Process payment mode
  let feeId = null;
  const paymentMode = data.payment_mode; // FEE or PAID
  const issueDate = data.issue_date ? new Date(data.issue_date) : new Date();

  // Perform in database transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Decrease available, increase assigned
    await tx.sportsKit.update({
      where: { kit_id: kitId },
      data: {
        available_qty: { decrement: 1 },
        assigned_qty: { increment: 1 }
      }
    });

    // 2. If FEE mode, create fee entry
    if (paymentMode === 'FEE') {
      const fee = await tx.fee.create({
        data: {
          academy_id: academyId,
          student_id: studentId,
          amount_due: kit.selling_price,
          due_date: issueDate,
          status: 'PENDING',
          description: `Sports Kit Charge: ${kit.name}`
        }
      });
      feeId = fee.fee_id;
    } else {
      // Create Payment Record (Receipt) inside Accounts/Payment Records
      const year = new Date().getFullYear();
      const count = await tx.receipt.count({
        where: { academy_id: academyId, receipt_number: { startsWith: `REC-${year}` } }
      });
      const receiptNumber = `REC-${year}-${String(count + 1).padStart(3, '0')}`;

      await tx.receipt.create({
        data: {
          receipt_number: receiptNumber,
          academy_id: academyId,
          student_id: studentId,
          amount: kit.selling_price,
          discount: 0,
          additional_charges: 0,
          payment_date: issueDate,
          method: data.payment_method || 'cash',
          status: 'COMPLETED',
          remarks: `Sports Kit Purchased: ${kit.name}`
        }
      });
    }

    // 3. Create SportsKitAssignment
    return await tx.sportsKitAssignment.create({
      data: {
        academy_id: academyId,
        kit_id: kitId,
        student_id: studentId,
        issue_date: issueDate,
        expected_return_date: data.expected_return_date ? new Date(data.expected_return_date) : null,
        status: 'ACTIVE',
        payment_status: paymentMode === 'PAID' ? 'PAID' : 'UNPAID',
        payment_mode: paymentMode,
        remarks: data.remarks || null,
        fee_id: feeId
      },
      include: {
        kit: true,
        student: true
      }
    });
  });

  // Notifications Section 10
  try {
    const parentBody = paymentMode === 'FEE' 
      ? `New Sports Kit Charge Added: ${kit.name}. Amount: ₹${kit.selling_price}. Please settle pending dues.` 
      : `Sports Kit Purchased Successfully: ${kit.name}. Paid Amount: ₹${kit.selling_price}.`;

    const notifyData = {
      type: 'GENERAL',
      title: paymentMode === 'FEE' ? 'New Kit Charge Added' : 'Sports Kit Purchased Successfully',
      body: parentBody,
      metadata: { kit_name: kit.name, selling_price: Number(kit.selling_price), payment_mode: paymentMode }
    };

    // Academy Admin notification
    await createNotification(academyId, {
      ...notifyData,
      title: `Kit Issued: ${kit.name} to ${student.name}`
    });

    // Parent notification if parent linked
    if (student.parent_id) {
      await createNotification(academyId, {
        ...notifyData,
        user_id: student.parent_id
      });
    }

    // Email notification to parent
    if (student.parent?.email) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">${notifyData.title}</h2>
          <p>Hello <strong>${student.parent_name || 'Parent'}</strong>,</p>
          <p>Sports kit has been assigned to <strong>${student.name}</strong>:</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e2e8f0;">
            <p><strong>Kit Name:</strong> ${kit.name}</p>
            <p><strong>Price:</strong> ₹${kit.selling_price}</p>
            <p><strong>Issue Date:</strong> ${issueDate.toLocaleDateString()}</p>
            <p><strong>Payment Status:</strong> ${paymentMode === 'PAID' ? 'Paid' : 'Unpaid (Added to Dues)'}</p>
          </div>
          <p>Thank you for choosing SAMS Academy.</p>
        </div>
      `;
      await sendMail({
        to: student.parent.email,
        subject: `${notifyData.title} - ${student.name}`,
        html: emailHtml,
        text: `${notifyData.title}: ${kit.name} assigned to ${student.name}.`
      }).catch(err => logger.error('Failed to send kit assignment email:', err));
    }
  } catch (err) {
    logger.error('Failed to trigger kit assignment notifications:', err);
  }

  return result;
};

// Return a kit (decreases assigned, increases available)
export const returnKit = async (academy_id, assignment_id) => {
  const academyId = parseInt(academy_id, 10);
  const assignmentId = parseInt(assignment_id, 10);

  const assignment = await prisma.sportsKitAssignment.findFirst({
    where: { assignment_id: assignmentId, academy_id: academyId },
    include: { kit: true, student: { include: { parent: true } } }
  });

  if (!assignment) {
    const error = new Error('Assignment not found');
    error.statusCode = 404;
    throw error;
  }

  if (assignment.status === 'RETURNED') {
    const error = new Error('Kit is already returned');
    error.statusCode = 400;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update assignment status to RETURNED
    const updatedAssignment = await tx.sportsKitAssignment.update({
      where: { assignment_id: assignmentId },
      data: {
        status: 'RETURNED',
        return_date: new Date()
      }
    });

    // 2. Adjust kit stock
    await tx.sportsKit.update({
      where: { kit_id: assignment.kit_id },
      data: {
        available_qty: { increment: 1 },
        assigned_qty: { decrement: 1 }
      }
    });

    return updatedAssignment;
  });

  // Notifications
  try {
    const notifyData = {
      type: 'GENERAL',
      title: 'Sports Kit Returned',
      body: `Sports Kit ${assignment.kit.name} assigned to ${assignment.student.name} has been returned successfully.`
    };

    await createNotification(academyId, notifyData);

    if (assignment.student.parent_id) {
      await createNotification(academyId, {
        ...notifyData,
        user_id: assignment.student.parent_id
      });
    }
  } catch (err) {
    logger.error('Failed to trigger return notifications:', err);
  }

  return result;
};

// Update Payment Status (Unpaid -> Paid)
export const updatePaymentStatus = async (academy_id, assignment_id, data) => {
  const academyId = parseInt(academy_id, 10);
  const assignmentId = parseInt(assignment_id, 10);

  const assignment = await prisma.sportsKitAssignment.findFirst({
    where: { assignment_id: assignmentId, academy_id: academyId },
    include: { kit: true, student: { include: { parent: true } } }
  });

  if (!assignment) {
    const error = new Error('Assignment not found');
    error.statusCode = 404;
    throw error;
  }

  if (assignment.payment_status === 'PAID') {
    const error = new Error('Payment status is already Paid');
    error.statusCode = 400;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update assignment payment status
    const updated = await tx.sportsKitAssignment.update({
      where: { assignment_id: assignmentId },
      data: {
        payment_status: 'PAID'
      }
    });

    // 2. Remove pending additional fee if exists
    if (assignment.fee_id) {
      await tx.fee.delete({
        where: { fee_id: assignment.fee_id }
      });
    }

    // 3. Create payment record (Receipt)
    const year = new Date().getFullYear();
    const count = await tx.receipt.count({
      where: { academy_id: academyId, receipt_number: { startsWith: `REC-${year}` } }
    });
    const receiptNumber = `REC-${year}-${String(count + 1).padStart(3, '0')}`;

    await tx.receipt.create({
      data: {
        receipt_number: receiptNumber,
        academy_id: academyId,
        student_id: assignment.student_id,
        amount: assignment.kit.selling_price,
        discount: 0,
        additional_charges: 0,
        payment_date: new Date(),
        method: data.payment_method || 'cash',
        status: 'COMPLETED',
        remarks: `Sports Kit Payment Received: ${assignment.kit.name}`
      }
    });

    return updated;
  });

  // Notifications
  try {
    const notifyData = {
      type: 'GENERAL',
      title: 'Payment Received for Kit',
      body: `Payment of ₹${assignment.kit.selling_price} received for kit: ${assignment.kit.name} for student ${assignment.student.name}.`
    };

    await createNotification(academyId, notifyData);

    if (assignment.student.parent_id) {
      await createNotification(academyId, {
        ...notifyData,
        user_id: assignment.student.parent_id
      });
    }
  } catch (err) {
    logger.error('Failed to trigger payment notifications:', err);
  }

  return result;
};

// Get all kit assignments
export const getKitAssignments = async (academy_id, query = {}) => {
  const academyId = parseInt(academy_id, 10);
  const where = { academy_id: academyId };

  if (query.kit_id) {
    where.kit_id = parseInt(query.kit_id, 10);
  }
  if (query.student_id) {
    where.student_id = parseInt(query.student_id, 10);
  }
  if (query.status) {
    where.status = query.status;
  }
  if (query.payment_status) {
    where.payment_status = query.payment_status;
  }

  return await prisma.sportsKitAssignment.findMany({
    where,
    include: {
      kit: true,
      student: {
        include: {
          batch: true
        }
      }
    },
    orderBy: {
      issue_date: 'desc'
    }
  });
};

// Get Dashboard Stats (Section 11)
export const getDashboardStats = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);

  const kits = await prisma.sportsKit.findMany({
    where: { academy_id: academyId }
  });

  const assignments = await prisma.sportsKitAssignment.findMany({
    where: { academy_id: academyId },
    include: { kit: true }
  });

  const totalKits = kits.length;
  const availableKits = kits.reduce((acc, k) => acc + k.available_qty, 0);
  const assignedKits = kits.reduce((acc, k) => acc + k.assigned_qty, 0);
  const outOfStockKits = kits.filter(k => k.available_qty === 0).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAssignments = assignments.filter(a => a.issue_date.toISOString().startsWith(todayStr)).length;

  const pendingKitPayments = assignments.filter(a => a.payment_status === 'UNPAID').length;
  const kitRevenue = assignments
    .filter(a => a.payment_status === 'PAID')
    .reduce((acc, a) => acc + Number(a.kit?.selling_price || 0), 0);

  // Compute most assigned sport
  const sportCounts = {};
  for (const assign of assignments) {
    const sportId = assign.kit?.sport_id;
    if (sportId) {
      sportCounts[sportId] = (sportCounts[sportId] || 0) + 1;
    }
  }

  let mostAssignedSportId = null;
  let maxCount = 0;
  for (const [sId, count] of Object.entries(sportCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostAssignedSportId = parseInt(sId, 10);
    }
  }

  let mostAssignedSportName = 'N/A';
  if (mostAssignedSportId) {
    const sport = await prisma.sport.findUnique({
      where: { sport_id: mostAssignedSportId },
      select: { name: true }
    });
    mostAssignedSportName = sport?.name || 'N/A';
  }

  return {
    totalKits,
    availableKits,
    assignedKits,
    outOfStockKits,
    todayAssignments,
    pendingKitPayments,
    kitRevenue,
    mostAssignedSport: mostAssignedSportName
  };
};

// Get Reports Data (Section 12)
export const getReportsData = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);

  const kits = await prisma.sportsKit.findMany({
    where: { academy_id: academyId },
    include: { sport: true }
  });

  const assignments = await prisma.sportsKitAssignment.findMany({
    where: { academy_id: academyId },
    include: {
      kit: { include: { sport: true } },
      student: { include: { batch: true } }
    },
    orderBy: {
      issue_date: 'desc'
    }
  });

  return {
    kits,
    assignments
  };
};
