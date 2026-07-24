import prisma from '../../config/prisma.js';
import { logAudit } from '../../utils/audit.util.js';
import { createNotification } from '../notifications/notifications.service.js';
import logger from '../../utils/logger.js';

// Helper to convert Decimal fields to number for JSON response
const serializeItem = (item) => {
  if (!item) return null;
  return {
    ...item,
    purchase_price: item.purchase_price ? Number(item.purchase_price) : null
  };
};

export const getInventoryItems = async (academy_id, filters = {}) => {
  const { search, category, sport_id, condition } = filters;
  const academyId = parseInt(academy_id, 10);

  const where = { academy_id: academyId };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { brand: { contains: search } },
      { model_name: { contains: search } }
    ];
  }

  if (category) {
    where.category = category;
  }

  if (sport_id) {
    where.sport_id = parseInt(sport_id, 10);
  }

  if (condition) {
    where.condition = condition;
  }

  const items = await prisma.inventoryItem.findMany({
    where,
    include: {
      sport: {
        select: {
          sport_id: true,
          name: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return items.map(serializeItem);
};

export const createInventoryItem = async (academy_id, data, performed_by) => {
  const academyId = parseInt(academy_id, 10);
  const totalQty = parseInt(data.total_qty, 10) || 0;

  const item = await prisma.inventoryItem.create({
    data: {
      academy_id: academyId,
      name: data.name,
      category: data.category,
      sport_id: data.sport_id ? parseInt(data.sport_id, 10) : null,
      image_url: data.image_url || null,
      brand: data.brand || null,
      model_name: data.model_name || null,
      purchase_date: data.purchase_date ? new Date(data.purchase_date) : null,
      purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
      supplier: data.supplier || null,
      total_qty: totalQty,
      available_qty: totalQty, // Initial available is total
      min_stock_alert: parseInt(data.min_stock_alert, 10) || 0,
      condition: data.condition || 'New',
      notes: data.notes || null
    }
  });

  // Log in stock history
  await prisma.inventoryHistory.create({
    data: {
      academy_id: academyId,
      item_id: item.item_id,
      action_type: 'Added',
      qty_change: totalQty,
      previous_qty: 0,
      new_qty: totalQty,
      performed_by: performed_by || 'Admin',
      notes: 'Initial inventory item creation'
    }
  });

  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    action: 'CREATE_INVENTORY_ITEM',
    entity_type: 'InventoryItem',
    entity_id: item.item_id,
    metadata: { name: item.name, quantity: totalQty }
  });

  return serializeItem(item);
};

export const updateInventoryItem = async (academy_id, item_id, data, performed_by) => {
  const academyId = parseInt(academy_id, 10);
  const itemId = parseInt(item_id, 10);

  const existingItem = await prisma.inventoryItem.findFirst({
    where: { item_id: itemId, academy_id: academyId }
  });

  if (!existingItem) {
    const error = new Error('Inventory item not found');
    error.statusCode = 404;
    throw error;
  }

  // Calculate new quantities if total_qty changed
  let newTotalQty = existingItem.total_qty;
  let newAvailableQty = existingItem.available_qty;
  let qtyDifference = 0;

  if (data.total_qty !== undefined) {
    newTotalQty = parseInt(data.total_qty, 10);
    qtyDifference = newTotalQty - existingItem.total_qty;
    newAvailableQty = existingItem.available_qty + qtyDifference;

    if (newAvailableQty < 0) {
      const error = new Error('New total quantity cannot be less than assigned quantity');
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedItem = await prisma.inventoryItem.update({
    where: { item_id: itemId },
    data: {
      name: data.name !== undefined ? data.name : existingItem.name,
      category: data.category !== undefined ? data.category : existingItem.category,
      sport_id: data.sport_id !== undefined ? (data.sport_id ? parseInt(data.sport_id, 10) : null) : existingItem.sport_id,
      image_url: data.image_url !== undefined ? data.image_url : existingItem.image_url,
      brand: data.brand !== undefined ? data.brand : existingItem.brand,
      model_name: data.model_name !== undefined ? data.model_name : existingItem.model_name,
      purchase_date: data.purchase_date !== undefined ? (data.purchase_date ? new Date(data.purchase_date) : null) : existingItem.purchase_date,
      purchase_price: data.purchase_price !== undefined ? (data.purchase_price ? parseFloat(data.purchase_price) : null) : existingItem.purchase_price,
      supplier: data.supplier !== undefined ? data.supplier : existingItem.supplier,
      total_qty: newTotalQty,
      available_qty: newAvailableQty,
      min_stock_alert: data.min_stock_alert !== undefined ? parseInt(data.min_stock_alert, 10) : existingItem.min_stock_alert,
      condition: data.condition !== undefined ? data.condition : existingItem.condition,
      notes: data.notes !== undefined ? data.notes : existingItem.notes
    }
  });

  // Log in stock history if quantity changed
  if (qtyDifference !== 0) {
    await prisma.inventoryHistory.create({
      data: {
        academy_id: academyId,
        item_id: itemId,
        action_type: qtyDifference > 0 ? 'Added' : 'Removed',
        qty_change: Math.abs(qtyDifference),
        previous_qty: existingItem.total_qty,
        new_qty: newTotalQty,
        performed_by: performed_by || 'Admin',
        notes: `Stock quantity update difference: ${qtyDifference}`
      }
    });

    // Alert low stock if needed
    if (newAvailableQty <= updatedItem.min_stock_alert) {
      await createNotification(academyId, {
        type: 'GENERAL',
        title: 'Low Stock Alert',
        body: `Inventory item "${updatedItem.name}" is running low on stock. Available: ${newAvailableQty}`,
        metadata: { item_id: itemId }
      });
    }
  }

  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    action: 'UPDATE_INVENTORY_ITEM',
    entity_type: 'InventoryItem',
    entity_id: itemId,
    metadata: { name: updatedItem.name, changes: data }
  });

  return serializeItem(updatedItem);
};

export const adjustStock = async (academy_id, item_id, quantity_change, notes, performed_by) => {
  const academyId = parseInt(academy_id, 10);
  const itemId = parseInt(item_id, 10);
  const qtyChange = parseInt(quantity_change, 10);

  const existingItem = await prisma.inventoryItem.findFirst({
    where: { item_id: itemId, academy_id: academyId }
  });

  if (!existingItem) {
    const error = new Error('Inventory item not found');
    error.statusCode = 404;
    throw error;
  }

  const newTotalQty = existingItem.total_qty + qtyChange;
  const newAvailableQty = existingItem.available_qty + qtyChange;

  if (newAvailableQty < 0) {
    const error = new Error('Adjusted quantity cannot reduce stock below currently assigned quantities');
    error.statusCode = 400;
    throw error;
  }

  const updatedItem = await prisma.inventoryItem.update({
    where: { item_id: itemId },
    data: {
      total_qty: newTotalQty,
      available_qty: newAvailableQty
    }
  });

  // Log in stock history
  await prisma.inventoryHistory.create({
    data: {
      academy_id: academyId,
      item_id: itemId,
      action_type: qtyChange > 0 ? 'Added' : 'Removed',
      qty_change: Math.abs(qtyChange),
      previous_qty: existingItem.total_qty,
      new_qty: newTotalQty,
      performed_by: performed_by || 'Admin',
      notes: notes || 'Manual stock adjustment'
    }
  });

  // Alert low stock if needed
  if (newAvailableQty <= updatedItem.min_stock_alert && qtyChange < 0) {
    await createNotification(academyId, {
      type: 'GENERAL',
      title: 'Low Stock Alert',
      body: `Inventory item "${updatedItem.name}" is running low. Available: ${newAvailableQty}`,
      metadata: { item_id: itemId }
    });
  }

  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    action: 'ADJUST_INVENTORY_STOCK',
    entity_type: 'InventoryItem',
    entity_id: itemId,
    metadata: { name: updatedItem.name, qtyChange }
  });

  return serializeItem(updatedItem);
};

export const assignEquipment = async (academy_id, item_id, coach_id, qty, notes, performed_by) => {
  const academyId = parseInt(academy_id, 10);
  const itemId = parseInt(item_id, 10);
  const coachId = parseInt(coach_id, 10);
  const quantity = parseInt(qty, 10);

  if (quantity <= 0) {
    const error = new Error('Quantity must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  // Transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findFirst({
      where: { item_id: itemId, academy_id: academyId }
    });

    if (!item) {
      throw new Error('Inventory item not found');
    }

    if (item.available_qty < quantity) {
      throw new Error(`Insufficient available stock. Available: ${item.available_qty}, Requested: ${quantity}`);
    }

    // Check if coach exists
    const coach = await tx.coach.findFirst({
      where: { coach_id: coachId, academy_id: academyId }
    });

    if (!coach) {
      throw new Error('Coach not found');
    }

    // Deduct available qty
    const updatedItem = await tx.inventoryItem.update({
      where: { item_id: itemId },
      data: {
        available_qty: item.available_qty - quantity
      }
    });

    // Upsert assignment
    const existingAssignment = await tx.inventoryAssignment.findFirst({
      where: { item_id: itemId, coach_id: coachId, academy_id: academyId }
    });

    let assignment;
    if (existingAssignment) {
      assignment = await tx.inventoryAssignment.update({
        where: { assignment_id: existingAssignment.assignment_id },
        data: {
          assigned_qty: existingAssignment.assigned_qty + quantity,
          notes: notes || existingAssignment.notes
        }
      });
    } else {
      assignment = await tx.inventoryAssignment.create({
        data: {
          academy_id: academyId,
          item_id: itemId,
          coach_id: coachId,
          assigned_qty: quantity,
          returned_qty: 0,
          notes: notes || null
        }
      });
    }

    // Log in stock history
    await tx.inventoryHistory.create({
      data: {
        academy_id: academyId,
        item_id: itemId,
        action_type: 'Assigned',
        qty_change: quantity,
        previous_qty: item.total_qty, // Reference item total qty
        new_qty: item.total_qty,
        performed_by: performed_by || 'Admin',
        notes: `Assigned ${quantity}x to coach ${coach.name}`
      }
    });

    return { assignment, updatedItem, coachName: coach.name };
  });

  // Push notifications
  await createNotification(academyId, {
    type: 'GENERAL',
    title: 'Equipment Assigned',
    body: `You have been assigned ${quantity}x ${result.updatedItem.name}`,
    coach_id: coachId,
    metadata: { item_id: itemId }
  });

  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    action: 'ASSIGN_INVENTORY_ITEM',
    entity_type: 'InventoryAssignment',
    entity_id: result.assignment.assignment_id,
    metadata: { item: result.updatedItem.name, coach: result.coachName, quantity }
  });

  return result.assignment;
};

export const returnEquipment = async (academy_id, assignment_id, qty, notes, performed_by) => {
  const academyId = parseInt(academy_id, 10);
  const assignmentId = parseInt(assignment_id, 10);
  const quantity = parseInt(qty, 10);

  if (quantity <= 0) {
    const error = new Error('Quantity must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    const assignment = await tx.inventoryAssignment.findFirst({
      where: { assignment_id: assignmentId, academy_id: academyId },
      include: { item: true, coach: true }
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const currentAssigned = assignment.assigned_qty - assignment.returned_qty;
    if (quantity > currentAssigned) {
      throw new Error(`Cannot return more than currently checked out. Checked out: ${currentAssigned}, Returning: ${quantity}`);
    }

    // Add back to available qty
    await tx.inventoryItem.update({
      where: { item_id: assignment.item_id },
      data: {
        available_qty: assignment.item.available_qty + quantity
      }
    });

    // Update assignment returned count
    const updatedAssignment = await tx.inventoryAssignment.update({
      where: { assignment_id: assignmentId },
      data: {
        returned_qty: assignment.returned_qty + quantity
      }
    });

    // Log history
    await tx.inventoryHistory.create({
      data: {
        academy_id: academyId,
        item_id: assignment.item_id,
        action_type: 'Returned',
        qty_change: quantity,
        previous_qty: assignment.item.total_qty,
        new_qty: assignment.item.total_qty,
        performed_by: performed_by || 'Admin/Coach',
        notes: `Returned ${quantity}x from coach ${assignment.coach.name}`
      }
    });

    return { updatedAssignment, itemName: assignment.item.name, coachName: assignment.coach.name, coachId: assignment.coach_id };
  });

  // Notifications
  await createNotification(academyId, {
    type: 'GENERAL',
    title: 'Equipment Returned',
    body: `Successfully processed return of ${quantity}x ${result.itemName} from Coach ${result.coachName}`,
    coach_id: result.coachId,
    metadata: { assignment_id: assignmentId }
  });

  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    action: 'RETURN_INVENTORY_ITEM',
    entity_type: 'InventoryAssignment',
    entity_id: assignmentId,
    metadata: { item: result.itemName, coach: result.coachName, quantity }
  });

  return result.updatedAssignment;
};

export const getCoachAssignments = async (coach_id) => {
  const coachId = parseInt(coach_id, 10);

  const assignments = await prisma.inventoryAssignment.findMany({
    where: {
      coach_id: coachId,
      assigned_qty: { gt: prisma.inventoryAssignment.fields.returned_qty }
    },
    include: {
      item: {
        include: {
          sport: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { assigned_date: 'desc' }
  });

  return assignments.map(a => ({
    ...a,
    item: serializeItem(a.item)
  }));
};

export const getCoachRequests = async (coach_id) => {
  const coachId = parseInt(coach_id, 10);

  return prisma.inventoryRequest.findMany({
    where: { coach_id: coachId },
    include: {
      item: {
        select: { name: true, category: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });
};

export const createCoachRequest = async (coach_id, academy_id, data) => {
  const coachId = parseInt(coach_id, 10);
  const academyId = parseInt(academy_id, 10);

  const coach = await prisma.coach.findUnique({
    where: { coach_id: coachId }
  });

  const request = await prisma.inventoryRequest.create({
    data: {
      academy_id: academyId,
      coach_id: coachId,
      item_id: data.item_id ? parseInt(data.item_id, 10) : null,
      type: data.type, // New, Replacement, Repair, Additional
      item_name_new: data.item_name_new || null,
      quantity: parseInt(data.quantity, 10) || 1,
      priority: data.priority || 'Medium',
      reason: data.reason,
      proof_url: data.proof_url || null,
      status: 'Pending'
    }
  });

  // Notify Academy Admins
  // Fetch users with ADMIN role
  const admins = await prisma.user.findMany({
    where: { academy_id: academyId, role: { in: ['ACADEMY_ADMIN'] } }
  });

  for (const admin of admins) {
    await createNotification(academyId, {
      type: 'GENERAL',
      title: 'New Coach Equipment Request',
      body: `Coach "${coach.name}" submitted a ${request.priority} priority request for ${request.quantity}x ${data.item_name_new || 'equipment'}.`,
      user_id: admin.user_id,
      metadata: { request_id: request.request_id }
    });
  }

  await logAudit({
    academy_id: academyId,
    actor_type: 'COACH',
    actor_id: coachId,
    action: 'CREATE_INVENTORY_REQUEST',
    entity_type: 'InventoryRequest',
    entity_id: request.request_id,
    metadata: { type: request.type, quantity: request.quantity }
  });

  return request;
};

export const getAdminRequests = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);

  return prisma.inventoryRequest.findMany({
    where: { academy_id: academyId },
    include: {
      coach: {
        select: { coach_id: true, name: true }
      },
      item: {
        select: { name: true, category: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });
};

export const getAdminAssignments = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);

  return prisma.inventoryAssignment.findMany({
    where: { academy_id: academyId },
    include: {
      coach: {
        select: { coach_id: true, name: true }
      },
      item: {
        select: { name: true, category: true }
      }
    },
    orderBy: { assigned_date: 'desc' }
  });
};

export const actionRequest = async (academy_id, request_id, status, remarks, performed_by) => {
  const academyId = parseInt(academy_id, 10);
  const requestId = parseInt(request_id, 10);

  const existingRequest = await prisma.inventoryRequest.findFirst({
    where: { request_id: requestId, academy_id: academyId },
    include: { coach: true, item: true }
  });

  if (!existingRequest) {
    const error = new Error('Inventory request not found');
    error.statusCode = 404;
    throw error;
  }

  const updatedRequest = await prisma.inventoryRequest.update({
    where: { request_id: requestId },
    data: {
      status,
      remarks: remarks || existingRequest.remarks
    }
  });

  // Notify coach
  await createNotification(academyId, {
    type: 'GENERAL',
    title: `Request status: ${status}`,
    body: `Your request for ${existingRequest.quantity}x ${existingRequest.item_name_new || existingRequest.item?.name} has been updated to "${status}".`,
    coach_id: existingRequest.coach_id,
    metadata: { request_id: requestId }
  });

  // Auto-assign stock on approval of 'Additional' requests
  if (status === 'Approved' && existingRequest.type === 'Additional' && existingRequest.item_id) {
    try {
      await assignEquipment(
        academyId,
        existingRequest.item_id,
        existingRequest.coach_id,
        existingRequest.quantity,
        `Auto-assigned on request #${requestId} approval`,
        performed_by
      );
      logger.info('Auto-assigned stock successfully for request', { requestId });
    } catch (e) {
      logger.error('Failed auto-assigning stock on request approval', { error: e.message, requestId });
    }
  }

  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    action: 'ACTION_INVENTORY_REQUEST',
    entity_type: 'InventoryRequest',
    entity_id: requestId,
    metadata: { status, remarks }
  });

  return updatedRequest;
};

export const getInventoryDashboard = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);

  // Total unique items
  const totalItemsCount = await prisma.inventoryItem.count({
    where: { academy_id: academyId }
  });

  // Stock aggregates
  const items = await prisma.inventoryItem.findMany({
    where: { academy_id: academyId }
  });

  const totalStockQty = items.reduce((sum, i) => sum + i.total_qty, 0);
  const availableStockQty = items.reduce((sum, i) => sum + i.available_qty, 0);

  // Assigned stock
  const assignments = await prisma.inventoryAssignment.findMany({
    where: { academy_id: academyId }
  });
  const assignedStockQty = assignments.reduce((sum, a) => sum + (a.assigned_qty - a.returned_qty), 0);

  // Pending requests
  const pendingRequestsCount = await prisma.inventoryRequest.count({
    where: { academy_id: academyId, status: 'Pending' }
  });

  // Low stock alerts count
  const lowStockCount = items.filter(i => i.available_qty <= i.min_stock_alert).length;

  // Damaged items count
  const damagedItemsCount = items.filter(i => i.condition === 'Damaged').length;

  return {
    totalItems: totalItemsCount,
    totalStock: totalStockQty,
    assignedStock: assignedStockQty,
    availableStock: availableStockQty,
    pendingRequests: pendingRequestsCount,
    lowStockAlerts: lowStockCount,
    damagedItems: damagedItemsCount
  };
};

export const getInventoryReports = async (academy_id, type) => {
  const academyId = parseInt(academy_id, 10);

  switch (type) {
    case 'current_stock':
      const currentItems = await prisma.inventoryItem.findMany({
        where: { academy_id: academyId },
        include: { sport: { select: { name: true } } },
        orderBy: { name: 'asc' }
      });
      return currentItems.map(serializeItem);

    case 'coach_wise':
      return prisma.inventoryAssignment.findMany({
        where: { academy_id: academyId },
        include: {
          coach: { select: { name: true, specialization: true } },
          item: { select: { name: true, category: true } }
        },
        orderBy: { coach: { name: 'asc' } }
      });

    case 'sport_wise':
      const sportItems = await prisma.inventoryItem.findMany({
        where: { academy_id: academyId, sport_id: { not: null } },
        include: { sport: { select: { name: true } } },
        orderBy: { sport: { name: 'asc' } }
      });
      return sportItems.map(serializeItem);

    case 'damaged':
      const damaged = await prisma.inventoryItem.findMany({
        where: { academy_id: academyId, condition: 'Damaged' },
        include: { sport: { select: { name: true } } },
        orderBy: { name: 'asc' }
      });
      return damaged.map(serializeItem);

    case 'request_history':
      return prisma.inventoryRequest.findMany({
        where: { academy_id: academyId },
        include: {
          coach: { select: { name: true } },
          item: { select: { name: true } }
        },
        orderBy: { created_at: 'desc' }
      });

    case 'purchase_history':
      const purchaseItems = await prisma.inventoryItem.findMany({
        where: { academy_id: academyId, purchase_date: { not: null } },
        include: { sport: { select: { name: true } } },
        orderBy: { purchase_date: 'desc' }
      });
      return purchaseItems.map(serializeItem);

    case 'low_stock':
      const lowItems = await prisma.inventoryItem.findMany({
        where: { academy_id: academyId }
      });
      const lowStockList = lowItems.filter(i => i.available_qty <= i.min_stock_alert);
      return lowStockList.map(serializeItem);

    default:
      throw new Error(`Invalid report type: ${type}`);
  }
};

export const getCoachesList = async (academy_id, coach_id) => {
  const academyId = parseInt(academy_id, 10);
  const coachId = parseInt(coach_id, 10);

  return prisma.coach.findMany({
    where: {
      academy_id: academyId,
      coach_id: { not: coachId }
    },
    select: {
      coach_id: true,
      name: true
    }
  });
};
