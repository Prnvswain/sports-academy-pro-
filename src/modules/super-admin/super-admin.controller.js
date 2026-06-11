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
