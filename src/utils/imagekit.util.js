import ImageKit, { toFile } from '@imagekit/nodejs';
import { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } from '../config/app.config.js';
import logger from './logger.js';

let imageKitInstance = null;

/**
 * Get ImageKit instance (singleton)
 */
const getImageKitInstance = () => {
  if (!imageKitInstance) {
    if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
      throw new Error('ImageKit configuration is missing. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in environment variables.');
    }

    imageKitInstance = new ImageKit({
      publicKey: IMAGEKIT_PUBLIC_KEY,
      privateKey: IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: IMAGEKIT_URL_ENDPOINT,
    });

    console.log("ImageKit Instance:", imageKitInstance);
    console.log("ImageKit Instance Type:", typeof imageKitInstance);
    console.log("ImageKit Instance Methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(imageKitInstance)));
    console.log("ImageKit Instance Own Properties:", Object.getOwnPropertyNames(imageKitInstance));

    logger.info('ImageKit instance initialized successfully');
  }

  return imageKitInstance;
};

/**
 * Upload file to ImageKit
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} folder - Folder path in ImageKit (e.g., 'academy-logos')
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} - ImageKit upload response with URL
 */
export const uploadToImageKit = async (fileBuffer, fileName, folder = 'academy-logos', options = {}) => {
  try {
    console.log("=== ImageKit Upload Debug ===");
    console.log("fileBuffer type:", typeof fileBuffer);
    console.log("fileBuffer is Buffer:", Buffer.isBuffer(fileBuffer));
    console.log("fileBuffer length:", fileBuffer?.length);
    console.log("fileName:", fileName);
    console.log("folder:", folder);
    console.log("options:", options);

    const imageKit = getImageKitInstance();

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const uniqueFileName = `${timestamp}-${randomString}-${fileName}`;

    // Convert Buffer to File using toFile helper
    const file = await toFile(fileBuffer, fileName);

    const uploadOptions = {
      file: file,
      fileName: uniqueFileName,
      folder: folder,
      useUniqueFileName: false,
      ...options,
    };

    console.log("uploadOptions:", uploadOptions);
    console.log("Calling imageKit.files.upload...");

    const result = await imageKit.files.upload(uploadOptions);

    console.log("Upload result:", result);

    logger.info('File uploaded to ImageKit successfully', {
      fileId: result.fileId,
      url: result.url,
      name: result.name,
      folder: result.folderPath,
    });

    return {
      fileId: result.fileId,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      name: result.name,
      folderPath: result.folderPath,
    };
  } catch (error) {
    console.error("=== ImageKit Upload Error ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error code:", error.code);

    logger.error('ImageKit upload failed', {
      error: error.message,
      stack: error.stack,
      fileName,
      folder,
    });

    throw new Error(`Failed to upload file to ImageKit: ${error.message}`);
  }
};

/**
 * Delete file from ImageKit
 * @param {string} fileId - ImageKit file ID
 * @returns {Promise<void>}
 */
export const deleteFromImageKit = async (fileId) => {
  try {
    const imageKit = getImageKitInstance();

    await imageKit.deleteFile(fileId);

    logger.info('File deleted from ImageKit successfully', { fileId });
  } catch (error) {
    logger.error('ImageKit delete failed', {
      error: error.message,
      stack: error.stack,
      fileId,
    });

    throw new Error(`Failed to delete file from ImageKit: ${error.message}`);
  }
};

/**
 * Validate image file
 * @param {Object} file - File object with mimetype and size
 * @returns {Object} - Validation result with isValid and error message
 */
export const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'Logo must be JPG, JPEG, PNG, or WEBP format',
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Logo must be less than 5MB',
    };
  }

  return {
    isValid: true,
    error: null,
  };
};
