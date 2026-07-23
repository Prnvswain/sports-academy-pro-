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

/**
 * Send batch session start notification email
 * @param {string} to - Recipient email address
 * @param {string} recipientName - Recipient's name
 * @param {object} sessionData - Session details
 */
export const sendBatchSessionStartEmail = async (to, recipientName, sessionData) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'SAMS Portal'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject: '🏃 Batch Session Started',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Batch Session Started</title>
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
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
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
              color: #1d4ed8;
              font-size: 22px;
              margin-top: 0;
            }
            .info-box {
              background-color: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-box p {
              margin: 10px 0;
            }
            .info-box strong {
              color: #1d4ed8;
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏃 SAMS Portal</h1>
              <p>Sports Academy Management System</p>
            </div>
            <div class="content">
              <h2>Batch Session Started</h2>
              <p>Dear <strong>${recipientName}</strong>,</p>
              <p>A batch session has been started:</p>
              
              <div class="info-box">
                <p><strong>Batch:</strong> ${sessionData.batch_name}</p>
                <p><strong>Sport:</strong> ${sessionData.sport_name}</p>
                <p><strong>Coach:</strong> ${sessionData.coach_name}</p>
                <p><strong>Timing:</strong> ${sessionData.timing}</p>
                <p><strong>Start Time:</strong> ${new Date(sessionData.start_time).toLocaleString()}</p>
              </div>
              
              <p>The training session is now in progress.</p>
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
    logger.info('Batch session start email sent successfully', { 
      to, 
      messageId: info.messageId 
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send batch session start email', { 
      error: error.message, 
      to 
    });
    // Don't throw - email failures should not block the main flow
    return { success: false, error: error.message };
  }
};

/**
 * Send batch session end notification email
 * @param {string} to - Recipient email address
 * @param {string} recipientName - Recipient's name
 * @param {object} sessionData - Session details
 */
export const sendBatchSessionEndEmail = async (to, recipientName, sessionData) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'SAMS Portal'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject: '✅ Batch Session Completed',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Batch Session Completed</title>
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ SAMS Portal</h1>
              <p>Sports Academy Management System</p>
            </div>
            <div class="content">
              <h2>Batch Session Completed</h2>
              <p>Dear <strong>${recipientName}</strong>,</p>
              <p>A batch session has been completed:</p>
              
              <div class="info-box">
                <p><strong>Batch:</strong> ${sessionData.batch_name}</p>
                <p><strong>Sport:</strong> ${sessionData.sport_name}</p>
                <p><strong>Coach:</strong> ${sessionData.coach_name}</p>
                <p><strong>Duration:</strong> ${sessionData.duration_minutes} minutes</p>
                <p><strong>Present:</strong> ${sessionData.present_count}</p>
                <p><strong>Absent:</strong> ${sessionData.absent_count}</p>
                <p><strong>Late:</strong> ${sessionData.late_count}</p>
              </div>
              
              <p>The training session has ended successfully.</p>
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
    logger.info('Batch session end email sent successfully', { 
      to, 
      messageId: info.messageId 
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send batch session end email', { 
      error: error.message, 
      to 
    });
    // Don't throw - email failures should not block the main flow
    return { success: false, error: error.message };
  }
};

/**
 * Send Parent Portal Password Reset Email
 * @param {string} to - Recipient email
 * @param {string} recipientName - Parent's name
 * @param {object} credentials - Login credentials
 */
export const sendParentPasswordResetEmail = async (to, recipientName, credentials) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'SAMS Portal'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject: '🔐 Parent Portal Password Reset',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Parent Portal Password Reset</title>
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
              background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
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
              padding: 30px;
            }
            .info-box {
              background-color: #f3f4f6;
              border-left: 4px solid #8b5cf6;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-box p {
              margin: 8px 0;
              font-size: 14px;
            }
            .info-box strong {
              color: #6d28d9;
            }
            .password-box {
              background-color: #fef3c7;
              border: 2px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              text-align: center;
            }
            .password-box p {
              margin: 0;
              font-size: 18px;
              font-weight: 700;
              color: #92400e;
              font-family: 'Courier New', monospace;
              letter-spacing: 2px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #6c757d;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Parent Portal</h1>
              <p>Sports Academy Management System</p>
            </div>
            <div class="content">
              <h2>Password Reset</h2>
              <p>Dear <strong>${recipientName}</strong>,</p>
              <p>Your Parent Portal password has been reset by the academy administrator. You can now log in with the following credentials:</p>
              
              <div class="info-box">
                <p><strong>Portal URL:</strong> <a href="${credentials.portalUrl}">${credentials.portalUrl}</a></p>
                <p><strong>Username:</strong> ${credentials.username}</p>
              </div>
              
              <div class="password-box">
                <p>${credentials.password}</p>
              </div>
              
              <p style="color: #dc2626; font-weight: 600;">⚠️ Please change your password after logging in for security reasons.</p>
              
              <p>If you did not request this password reset, please contact your academy administrator immediately.</p>
              
              <a href="${credentials.portalUrl}" class="button">Access Parent Portal</a>
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
    logger.info('Parent password reset email sent successfully', { 
      to, 
      messageId: info.messageId 
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send parent password reset email', { 
      error: error.message, 
      to 
    });
    // Don't throw - email failures should not block the main flow
    return { success: false, error: error.message };
  }
};

export default transporter;
