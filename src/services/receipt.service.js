import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Generate a unique receipt number for an academy
 * Format: REC-YYYY-000001
 */
export const generateReceiptNumber = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  const currentYear = new Date().getFullYear();

  // Find the last receipt number for this academy for the current year
  const lastReceipt = await prisma.receipt.findFirst({
    where: {
      academy_id: academyId,
      receipt_number: {
        startsWith: `REC-${currentYear}-`
      }
    },
    orderBy: {
      receipt_id: 'desc'
    },
    select: {
      receipt_number: true
    }
  });

  let sequenceNumber = 1;

  if (lastReceipt) {
    // Extract the sequence number from the last receipt number
    const parts = lastReceipt.receipt_number.split('-');
    if (parts.length === 3) {
      sequenceNumber = parseInt(parts[2], 10) + 1;
    }
  }

  // Format the sequence number with leading zeros (6 digits)
  const paddedSequence = String(sequenceNumber).padStart(6, '0');
  const receiptNumber = `REC-${currentYear}-${paddedSequence}`;

  return receiptNumber;
};

/**
 * Validate transaction number format
 * Must be 12-50 characters, alphanumeric only
 */
export const validateTransactionNumber = (transactionNumber) => {
  if (!transactionNumber || typeof transactionNumber !== 'string') {
    return {
      valid: false,
      error: 'Transaction number is required'
    };
  }

  const trimmed = transactionNumber.trim();
  
  if (trimmed.length < 12) {
    return {
      valid: false,
      error: 'Transaction number must be at least 12 characters'
    };
  }

  if (trimmed.length > 50) {
    return {
      valid: false,
      error: 'Transaction number must not exceed 50 characters'
    };
  }

  // Allow only alphanumeric characters
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  if (!alphanumericRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Transaction number can only contain letters and numbers'
    };
  }

  return {
    valid: true,
    value: trimmed
  };
};

/**
 * Validate payment screenshot
 * Must be JPG, JPEG, PNG, or PDF
 * Maximum 5MB
 */
export const validatePaymentScreenshot = (file) => {
  if (!file) {
    return {
      valid: false,
      error: 'Payment screenshot is required'
    };
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Only JPG, JPEG, PNG, and PDF files are allowed'
    };
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must not exceed 5MB'
    };
  }

  return {
    valid: true,
    file
  };
};

/**
 * Check if a payment method is allowed for parent portal
 */
export const isParentPaymentMethodAllowed = (method) => {
  const allowedMethods = ['upi', 'bank_transfer', 'neft', 'rtgs', 'imps'];
  return allowedMethods.includes(method?.toLowerCase());
};

/**
 * Check if a payment method is allowed for coach/admin (offline)
 */
export const isOfflinePaymentMethodAllowed = (method) => {
  const allowedMethods = ['cash', 'cheque'];
  return allowedMethods.includes(method?.toLowerCase());
};

/**
 * Get status badge color for UI
 */
export const getStatusBadgeColor = (status) => {
  const statusColors = {
    'PENDING_VERIFICATION': 'amber',
    'APPROVED': 'emerald',
    'REJECTED': 'red',
    'NEED_REUPLOAD': 'orange',
    'PAID': 'blue',
    'COMPLETED': 'green',
    'FAILED': 'red',
    'VOID': 'gray'
  };
  return statusColors[status] || 'gray';
};

/**
 * Get status label for display
 */
export const getStatusLabel = (status) => {
  const statusLabels = {
    'PENDING_VERIFICATION': 'Pending Verification',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected',
    'NEED_REUPLOAD': 'Re-upload Required',
    'PAID': 'Paid',
    'COMPLETED': 'Completed',
    'FAILED': 'Failed',
    'VOID': 'Void'
  };
  return statusLabels[status] || status;
};
