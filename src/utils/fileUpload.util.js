/**
 * File Upload Utility Functions
 * Handles image upload validation and processing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed image file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Upload directory for profile photos
const UPLOAD_DIR = path.join(__dirname, '../../uploads/profile-photos');

/**
 * Validate image file
 * @param {File} file - File object to validate
 * @returns {object} Validation result with isValid flag and error message
 */
export const validateImageFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Ensure upload directory exists
 */
export const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};

/**
 * Generate unique filename for uploaded file
 * @param {string} originalName - Original filename
 * @param {number} studentId - Student ID for organization
 * @returns {string} Unique filename
 */
export const generateUniqueFilename = (originalName, studentId) => {
  const timestamp = Date.now();
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '');
  return `student_${studentId}_${timestamp}_${baseName}${ext}`;
};

/**
 * Save uploaded file to disk
 * @param {File} file - File object to save
 * @param {number} studentId - Student ID for organization
 * @returns {Promise<string>} Relative path to saved file
 */
export const saveUploadedFile = async (file, studentId) => {
  ensureUploadDir();

  const filename = generateUniqueFilename(file.name, studentId);
  const filePath = path.join(UPLOAD_DIR, filename);

  // Convert file to buffer and save
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  fs.writeFileSync(filePath, buffer);

  // Return relative path for database storage
  return `/uploads/profile-photos/${filename}`;
};

/**
 * Delete existing profile photo
 * @param {string} photoPath - Path to photo file
 */
export const deleteProfilePhoto = (photoPath) => {
  if (!photoPath) return;

  try {
    const fullPath = path.join(__dirname, '../../..', photoPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    // Don't throw error, just log it
  }
};

/**
 * Get public URL for profile photo
 * @param {string} photoPath - Relative path from uploads directory
 * @returns {string} Full URL to access the photo
 */
export const getProfilePhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  return photoPath; // In production, this would return a full CDN URL
};
