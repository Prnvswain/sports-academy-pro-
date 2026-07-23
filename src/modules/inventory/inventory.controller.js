import * as inventoryService from './inventory.service.js';
import { successResponse } from '../../utils/response.js';
import { uploadToImageKit } from '../../utils/imagekit.util.js';

// ─── ADMIN ACTIONS ──────────────────────────────────────────────────────────

export const getItems = async (req, res, next) => {
  try {
    const items = await inventoryService.getInventoryItems(req.user.academy_id, req.query);
    res.json(successResponse('Inventory items retrieved successfully', items));
  } catch (err) {
    next(err);
  }
};

export const createItem = async (req, res, next) => {
  try {
    let imageUrl = null;
    if (req.file) {
      const uploadResult = await uploadToImageKit(
        req.file.buffer,
        req.file.originalname,
        'inventory-images'
      );
      imageUrl = uploadResult.url;
    }
    
    const item = await inventoryService.createInventoryItem(
      req.user.academy_id,
      { ...req.body, image_url: imageUrl },
      req.user.name || 'Admin'
    );
    res.status(201).json(successResponse('Inventory item created successfully', item));
  } catch (err) {
    next(err);
  }
};

export const updateItem = async (req, res, next) => {
  try {
    let updateData = { ...req.body };
    if (req.file) {
      const uploadResult = await uploadToImageKit(
        req.file.buffer,
        req.file.originalname,
        'inventory-images'
      );
      updateData.image_url = uploadResult.url;
    }

    const item = await inventoryService.updateInventoryItem(
      req.user.academy_id,
      req.params.item_id,
      updateData,
      req.user.name || 'Admin'
    );
    res.json(successResponse('Inventory item updated successfully', item));
  } catch (err) {
    next(err);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const { quantity_change, notes } = req.body;
    const item = await inventoryService.adjustStock(
      req.user.academy_id,
      req.params.item_id,
      quantity_change,
      notes,
      req.user.name || 'Admin'
    );
    res.json(successResponse('Stock adjusted successfully', item));
  } catch (err) {
    next(err);
  }
};

export const assignEquipment = async (req, res, next) => {
  try {
    const { coach_id, qty, notes } = req.body;
    const assignment = await inventoryService.assignEquipment(
      req.user.academy_id,
      req.params.item_id,
      coach_id,
      qty,
      notes,
      req.user.name || 'Admin'
    );
    res.status(201).json(successResponse('Equipment assigned successfully', assignment));
  } catch (err) {
    next(err);
  }
};

export const returnEquipment = async (req, res, next) => {
  try {
    const { qty, notes } = req.body;
    const assignment = await inventoryService.returnEquipment(
      req.user.academy_id,
      req.params.assignment_id,
      qty,
      notes,
      req.user.name || 'Admin'
    );
    res.json(successResponse('Equipment returned successfully', assignment));
  } catch (err) {
    next(err);
  }
};

export const getRequests = async (req, res, next) => {
  try {
    const requests = await inventoryService.getAdminRequests(req.user.academy_id);
    res.json(successResponse('Inventory requests retrieved successfully', requests));
  } catch (err) {
    next(err);
  }
};

export const getAssignments = async (req, res, next) => {
  try {
    const assignments = await inventoryService.getAdminAssignments(req.user.academy_id);
    res.json(successResponse('Inventory assignments retrieved successfully', assignments));
  } catch (err) {
    next(err);
  }
};

export const actionRequest = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const request = await inventoryService.actionRequest(
      req.user.academy_id,
      req.params.request_id,
      status,
      remarks,
      req.user.name || 'Admin'
    );
    res.json(successResponse(`Request status updated to ${status}`, request));
  } catch (err) {
    next(err);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const stats = await inventoryService.getInventoryDashboard(req.user.academy_id);
    res.json(successResponse('Inventory dashboard statistics retrieved', stats));
  } catch (err) {
    next(err);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const { type } = req.query;
    const data = await inventoryService.getInventoryReports(req.user.academy_id, type);
    res.json(successResponse('Inventory report data retrieved', data));
  } catch (err) {
    next(err);
  }
};

// ─── COACH ACTIONS ──────────────────────────────────────────────────────────

export const getCoachAssignments = async (req, res, next) => {
  try {
    const assignments = await inventoryService.getCoachAssignments(req.user.coach_id);
    res.json(successResponse('My assigned inventory retrieved successfully', assignments));
  } catch (err) {
    next(err);
  }
};

export const getCoachRequests = async (req, res, next) => {
  try {
    const requests = await inventoryService.getCoachRequests(req.user.coach_id);
    res.json(successResponse('My inventory requests retrieved successfully', requests));
  } catch (err) {
    next(err);
  }
};

export const createCoachRequest = async (req, res, next) => {
  try {
    let proofUrl = null;
    if (req.file) {
      const uploadResult = await uploadToImageKit(
        req.file.buffer,
        req.file.originalname,
        'inventory-proofs'
      );
      proofUrl = uploadResult.url;
    }

    const request = await inventoryService.createCoachRequest(
      req.user.coach_id,
      req.user.academy_id,
      { ...req.body, proof_url: proofUrl }
    );
    res.status(201).json(successResponse('Inventory request submitted successfully', request));
  } catch (err) {
    next(err);
  }
};
