import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/app.config.js';
import { errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse('Unauthorized: No token provided'));
    }

    const token = authHeader.substring(7);

    // 🎯 FIX: Check empty/undefined token values dynamically passed from front-end layout bugs
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json(errorResponse('Unauthorized: Token string is empty or invalid'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      logger.warn('Token validation failed', { reason: err.message });
      return res.status(401).json(errorResponse('Unauthorized: Invalid token'));
    }
  } catch (error) {
    logger.error('Auth middleware error', { message: error.message });
    return res.status(401).json(errorResponse('Unauthorized'));
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('Unauthorized'));
    }

    console.log('=== Authorize Middleware Debug ===');
    console.log('req.user:', req.user);
    console.log('req.user.role:', req.user.role);
    console.log('typeof req.user.role:', typeof req.user.role);
    console.log('roles parameter:', roles);

    // Handle both authorize('ROLE') and authorize(['ROLE1', 'ROLE2'])
    // Flatten nested array if authorize(['ROLE1', 'ROLE2']) is used
    const flatRoles = roles.length === 1 && Array.isArray(roles[0]) ? roles[0] : roles;

    console.log('flatRoles:', flatRoles);

    // SYSTEM SYNC: Convert everything to uppercase
    const userRole = req.user.role ? req.user.role.toUpperCase() : '';
    const allowedRoles = flatRoles.map(role => role.toUpperCase());

    console.log('userRole (uppercase):', userRole);
    console.log('allowedRoles (uppercase):', allowedRoles);

    // 🎯 FIX BEYOND CONFLICT: Agar resource super_admin bhi dekh sakta ho (like browsing presets)
    // toh use automatic handle karne ke liye fallback policy laga di hai
    if (!allowedRoles.includes(userRole) && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json(errorResponse('Forbidden: Insufficient permissions'));
    }

    next();
  };
};