import * as authService from './auth.service.js';
import { successResponse } from '../../utils/response.js';

export const signup = async (req, res, next) => {
  try {
    const result = await authService.signupAcademy(req.body);
    return res.status(201).json(
      successResponse('Academy and admin account created successfully', result)
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser({
      email: req.body.email,
      password: req.body.password,
      ip: req.ip
    });

    return res.status(200).json(
      successResponse('Login successful', result)
    );
  } catch (error) {
    next(error);
  }
};

export const coachLogin = async (req, res, next) => {
  try {
    const result = await authService.loginCoach({
      email: req.body.email,
      password: req.body.password,
      ip: req.ip
    });

    return res.status(200).json(
      successResponse('Coach login successful', result)
    );
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    await authService.requestPasswordReset({ email: req.body.email });
    return res.status(200).json(
      successResponse(
        'If an account exists for this email, a verification code has been sent.'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPasswordWithCode({
      email: req.body.email,
      code: req.body.code,
      newPassword: req.body.new_password
    });
    return res.status(200).json(
      successResponse('Password updated successfully. You can sign in now.')
    );
  } catch (error) {
    next(error);
  }
};
