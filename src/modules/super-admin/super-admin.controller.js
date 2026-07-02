import * as superAdminService from './super-admin.service.js';
import { successResponse } from '../../utils/response.js';

export const login = async (req, res, next) => {
  try {
    const result = await superAdminService.loginSuperAdmin({
      email: req.body.email,
      password: req.body.password,
      ip: req.ip
    });
    res.json(successResponse('Super admin login successful', result));
  } catch (err) {
    next(err);
  }
};

export const getAcademies = async (req, res, next) => {
  try {
    const academies = await superAdminService.listAcademies();
    res.json(successResponse('Academies retrieved', academies));
  } catch (err) {
    next(err);
  }
};

export const getPlans = async (req, res, next) => {
  try {
    const plans = await superAdminService.listPlans();
    res.json(successResponse('Plans retrieved', plans));
  } catch (err) {
    next(err);
  }
};

export const getSports = async (req, res, next) => {
  try {
    console.log('=== Super Admin getSports Controller ===');
    console.log('req.user:', req.user);
    console.log('req.user.role:', req.user?.role);
    
    const sports = await superAdminService.listSports();
    console.log('Sports retrieved from service:', sports.length);
    res.json(successResponse('Global sports retrieved', sports));
  } catch (err) {
    console.error('Error in getSports controller:', err);
    next(err);
  }
};

export const createSport = async (req, res, next) => {
  try {
    const sport = await superAdminService.createSport(req.body);
    res.json(successResponse('Sport created successfully', sport));
  } catch (err) {
    next(err);
  }
};

export const deleteSport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await superAdminService.deleteSport(id);
    res.json(successResponse('Sport deleted successfully', result));
  } catch (err) {
    next(err);
  }
};

export const updateSportAttributes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attributes } = req.body;
    const result = await superAdminService.updateGlobalSportAttributes(id, attributes);
    res.json(successResponse('Sport attributes updated successfully', result));
  } catch (err) {
    next(err);
  }
};

export const seedSports = async (req, res, next) => {
  try {
    const result = await superAdminService.seedDefaultSports();
    res.json(successResponse('Sports seeded', result));
  } catch (err) {
    next(err);
  }
};

export const patchAcademyStatus = async (req, res, next) => {
  try {
    const academy = await superAdminService.updateAcademyStatus(
      req.params.academy_id,
      req.body.status,
      req.user.super_admin_id,
      req.ip
    );
    res.json(successResponse('Academy status updated', academy));
  } catch (err) {
    next(err);
  }
};

export const patchPlanStatus = async (req, res, next) => {
  try {
    const plan = await superAdminService.updatePlanStatus(
      req.params.plan_id,
      req.body.status,
      req.user.super_admin_id,
      req.ip
    );
    res.json(successResponse('Plan status updated', plan));
  } catch (err) {
    next(err);
  }
};

export const suspendAcademy = async (req, res, next) => {
  try {
    const academy = await superAdminService.updateAcademyStatus(
      req.params.academy_id,
      'SUSPENDED',
      req.user.super_admin_id,
      req.ip
    );
    res.json(successResponse('Academy suspended', academy));
  } catch (err) {
    next(err);
  }
};

export const activateAcademy = async (req, res, next) => {
  try {
    const academy = await superAdminService.updateAcademyStatus(
      req.params.academy_id,
      'ACTIVE',
      req.user.super_admin_id,
      req.ip
    );
    res.json(successResponse('Academy activated', academy));
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const stats = await superAdminService.getPlatformStats();
    res.json(successResponse('Platform statistics', stats));
  } catch (err) {
    next(err);
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const settings = await superAdminService.getGlobalSettings();
    res.json(successResponse('Global settings', settings));
  } catch (err) {
    next(err);
  }
};

export const putSetting = async (req, res, next) => {
  try {
    const setting = await superAdminService.upsertGlobalSetting(
      req.body.setting_key,
      req.body.setting_value,
      req.user.super_admin_id,
      req.ip
    );
    res.json(successResponse('Setting saved', setting));
  } catch (err) {
    next(err);
  }
};
