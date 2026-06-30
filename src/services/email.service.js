import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// Create transporter with environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    logger.warn('Email service configuration error', { error: error.message });
  } else {
    logger.info('Email service is ready to send messages');
  }
});

/**
 * Send password change notification email to parent
 * @param {string} to - Recipient email address
 * @param {string} parentName - Parent's name
 * @param {string} newPassword - New plain text password
 */
export const sendPasswordChangeEmail = async (to, parentName, newPassword) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'SAMS Portal'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject: '🔑 SAMS Portal - Account Security Update',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Change Notification</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
            }
            .header p {
              margin: 10px 0 0 0;
              font-size: 16px;
              opacity: 0.9;
            }
            .content {
              padding: 40px;
            }
            .content h2 {
              color: #059669;
              font-size: 22px;
              margin-top: 0;
            }
            .info-box {
              background-color: #f0fdf4;
              border-left: 4px solid #10b981;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-box p {
              margin: 10px 0;
            }
            .info-box strong {
              color: #059669;
            }
            .security-notice {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .security-notice p {
              margin: 10px 0;
              color: #92400e;
            }
            .footer {
              background-color: #f9fafb;
              padding: 20px;
              text-align: center;
              font-size: 14px;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              margin: 5px 0;
            }
            .button {
              display: inline-block;
              background-color: #10b981;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 SAMS Portal</h1>
              <p>Sports Academy Management System</p>
            </div>
            <div class="content">
              <h2>Password Successfully Updated</h2>
              <p>Dear <strong>${parentName}</strong>,</p>
              <p>Your account password has been successfully changed/reset. Below are your updated login credentials:</p>
              
              <div class="info-box">
                <p><strong>Login Username (Email):</strong> ${to}</p>
                <p><strong>New Password:</strong> ${newPassword}</p>
              </div>
              
              <p>Please use these credentials to log in to your account. We recommend changing your password periodically for enhanced security.</p>
              
              <div class="security-notice">
                <p><strong>⚠️ Security Notice:</strong></p>
                <p>If you did not authorize this password change, please contact your academy administrator immediately. This could indicate unauthorized access to your account.</p>
              </div>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/parent/login" class="button">Login to Your Account</a>
            </div>
            <div class="footer">
              <p>This is an automated email from SAMS Portal.</p>
              <p>Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} SAMS Portal. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Password change email sent successfully', { 
      to, 
      messageId: info.messageId 
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send password change email', { 
      error: error.message, 
      to 
    });
    throw error;
  }
};

export default transporter;
