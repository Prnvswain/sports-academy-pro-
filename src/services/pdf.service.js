import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Generate HTML template for receipt
 * This can be converted to PDF using a PDF generation library
 */
export const generateReceiptHTML = async (receipt_id) => {
  const receiptId = parseInt(receipt_id, 10);

  const receipt = await prisma.receipt.findUnique({
    where: { receipt_id: receiptId },
    include: {
      student: {
        include: {
          academy: true,
          sport: true,
          batch: true,
          parent: true,
        },
      },
      approved_by: true,
      collected_by: true,
    },
  });

  if (!receipt) {
    throw new Error('Receipt not found');
  }

  const academy = receipt.student.academy;
  const student = receipt.student;

  // Format dates
  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get status label and color
  const getStatusInfo = (status) => {
    const statusMap = {
      'PENDING_VERIFICATION': { label: 'Pending Verification', color: '#f59e0b' },
      'APPROVED': { label: 'Approved', color: '#10b981' },
      'REJECTED': { label: 'Rejected', color: '#ef4444' },
      'NEED_REUPLOAD': { label: 'Re-upload Required', color: '#f97316' },
      'PAID': { label: 'Paid', color: '#3b82f6' },
      'COMPLETED': { label: 'Completed', color: '#10b981' },
      'FAILED': { label: 'Failed', color: '#ef4444' },
      'VOID': { label: 'Void', color: '#6b7280' },
    };
    return statusMap[status] || { label: status, color: '#6b7280' };
  };

  const statusInfo = getStatusInfo(receipt.status);

  // Generate HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${receipt.receipt_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .academy-info {
      flex: 1;
    }
    
    .academy-logo {
      width: 80px;
      height: 80px;
      object-fit: contain;
      margin-bottom: 10px;
    }
    
    .academy-name {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 5px;
    }
    
    .academy-address {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 3px;
    }
    
    .receipt-number {
      text-align: right;
    }
    
    .receipt-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .receipt-value {
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #374151;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .info-label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    
    .info-value {
      font-size: 14px;
      color: #1f2937;
      font-weight: 500;
    }
    
    .amount-section {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    
    .amount-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    
    .amount-row.total {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
      font-weight: bold;
    }
    
    .amount-label {
      font-size: 14px;
      color: #374151;
    }
    
    .amount-value {
      font-size: 16px;
      color: #1f2937;
      font-weight: 600;
    }
    
    .amount-value.total {
      font-size: 20px;
      color: #059669;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: ${statusInfo.color}20;
      color: ${statusInfo.color};
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    
    .footer-text {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    
    .footer-note {
      font-size: 11px;
      color: #9ca3af;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- Header -->
    <div class="header">
      <div class="academy-info">
        ${academy.logo_url ? `<img src="${academy.logo_url}" alt="${academy.name}" class="academy-logo">` : ''}
        <div class="academy-name">${academy.name}</div>
        <div class="academy-address">${academy.address || ''}</div>
        <div class="academy-address">Phone: ${academy.phone_number || '—'}</div>
        <div class="academy-address">Email: ${academy.email || '—'}</div>
      </div>
      <div class="receipt-number">
        <div class="receipt-label">Receipt Number</div>
        <div class="receipt-value">${receipt.receipt_number}</div>
        <div style="margin-top: 10px;">
          <div class="receipt-label">Receipt Date</div>
          <div class="receipt-value">${formatDate(receipt.created_at)}</div>
        </div>
      </div>
    </div>

    <!-- Student Details -->
    <div class="section">
      <div class="section-title">Student Details</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Student Name</div>
          <div class="info-value">${student.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Parent Name</div>
          <div class="info-value">${student.parent_name || '—'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Sport</div>
          <div class="info-value">${student.sport?.name || '—'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Batch</div>
          <div class="info-value">${student.batch?.name || '—'}</div>
        </div>
      </div>
    </div>

    <!-- Payment Details -->
    <div class="section">
      <div class="section-title">Payment Details</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Payment Date</div>
          <div class="info-value">${formatDate(receipt.payment_date)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Payment Method</div>
          <div class="info-value">${receipt.method ? receipt.method.toUpperCase() : '—'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Transaction Number</div>
          <div class="info-value">${receipt.transaction_number || '—'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Status</div>
          <div class="info-value">
            <span class="status-badge">${statusInfo.label}</span>
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">Collected By</div>
          <div class="info-value">
            ${receipt.collected_by ? receipt.collected_by.name : receipt.approved_by ? receipt.approved_by.name : '—'}
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">Remarks</div>
          <div class="info-value">${receipt.remarks || '—'}</div>
        </div>
      </div>
    </div>

    <!-- Amount Section -->
    <div class="amount-section">
      <div class="amount-row">
        <div class="amount-label">Amount</div>
        <div class="amount-value">${formatCurrency(receipt.amount)}</div>
      </div>
      ${receipt.discount > 0 ? `
      <div class="amount-row">
        <div class="amount-label">Discount</div>
        <div class="amount-value">-${formatCurrency(receipt.discount)}</div>
      </div>
      ` : ''}
      ${receipt.additional_charges > 0 ? `
      <div class="amount-row">
        <div class="amount-label">Additional Charges</div>
        <div class="amount-value">+${formatCurrency(receipt.additional_charges)}</div>
      </div>
      ` : ''}
      <div class="amount-row total">
        <div class="amount-label">Total Paid</div>
        <div class="amount-value total">${formatCurrency(parseFloat(receipt.amount) - parseFloat(receipt.discount) + parseFloat(receipt.additional_charges))}</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">Thank you for your payment!</div>
      <div class="footer-text">Generated by Sports Academy Pro</div>
      <div class="footer-note">This is a digitally generated receipt. No signature required.</div>
    </div>
  </div>
</body>
</html>
  `;

  return html;
};

/**
 * Generate receipt PDF
 * This is a placeholder - in production, you would use a library like puppeteer or jsPDF
 */
export const generateReceiptPDF = async (receipt_id) => {
  try {
    const html = await generateReceiptHTML(receipt_id);
    
    // In production, you would use puppeteer or similar to convert HTML to PDF
    // For now, we'll return the HTML which can be converted to PDF on the client side
    // or stored as a reference
    
    logger.info('Receipt HTML generated', { receipt_id });
    
    return {
      html,
      receipt_id,
      message: 'Receipt HTML generated successfully. Use a PDF generation library to convert to PDF.'
    };
  } catch (error) {
    logger.error('Failed to generate receipt PDF', { receipt_id, error: error.message });
    throw error;
  }
};

/**
 * Update receipt with PDF URL
 */
export const updateReceiptPDF = async (receipt_id, pdf_url) => {
  const receiptId = parseInt(receipt_id, 10);

  const updatedReceipt = await prisma.receipt.update({
    where: { receipt_id: receiptId },
    data: { pdf_url },
  });

  logger.info('Receipt PDF URL updated', { receipt_id, pdf_url });
  return updatedReceipt;
};
