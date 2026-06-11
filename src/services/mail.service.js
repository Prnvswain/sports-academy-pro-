import nodemailer from 'nodemailer';
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  COACH_LOGIN_URL,
  isSmtpConfigured
} from '../config/mail.config.js';
import logger from '../utils/logger.js';

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      requireTLS: !SMTP_SECURE && SMTP_PORT === 587
    });
  }
  return transporter;
};

export const verifySmtpConnection = async () => {
  if (!isSmtpConfigured()) {
    logger.warn('SMTP not configured (SMTP_USER / SMTP_PASS missing)');
    return false;
  }

  try {
    await getTransporter().verify();
    logger.info('SMTP connection verified', { host: SMTP_HOST, port: SMTP_PORT });
    return true;
  } catch (error) {
    logger.error('SMTP connection verification failed', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
      message: error.message
    });
    return false;
  }
};

const sendMail = async ({ to, subject, html, text }) => {
  if (!isSmtpConfigured()) {
    const error = new Error('SMTP credentials are not configured');
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  try {
    const info = await getTransporter().sendMail({
      from: MAIL_FROM,
      to,
      subject,
      html,
      text
    });

    logger.info('Email dispatched', { to, subject, messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error('SMTP send failed', {
      to,
      subject,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export const sendCoachOnboardingEmail = async ({ email, name, temporaryPassword }) => {
  const loginUrl = COACH_LOGIN_URL;
  const subject = 'Welcome to SAMS — Your Coach Portal Credentials';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">Sports Academy Management System</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your academy administrator has provisioned your coach account. Use the credentials below to sign in:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Login URL</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;"><a href="${loginUrl}">${loginUrl}</a></td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${email}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Temporary Password</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;"><code>${temporaryPassword}</code></td></tr>
      </table>
      <p>Please change your password after your first login for security.</p>
      <p style="color: #6b7280; font-size: 12px;">This is an automated message from SAMS.</p>
    </div>
  `;

  const text = [
    `Hello ${name},`,
    '',
    'Your coach portal credentials:',
    `Login URL: ${loginUrl}`,
    `Email: ${email}`,
    `Temporary Password: ${temporaryPassword}`,
    '',
    'Please change your password after your first login.'
  ].join('\n');

  return sendMail({ to: email, subject, html, text });
};

export const sendAdminWelcomeEmail = async ({
  email,
  name,
  academyName,
  temporaryPassword
}) => {
  const loginUrl = process.env.APP_URL || 'http://localhost:5000';
  const subject = 'Welcome to SAMS — Your Academy Admin Credentials';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">Sports Academy Management System</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your academy <strong>${academyName}</strong> is ready.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Login URL</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;"><a href="${loginUrl}/login/admin">${loginUrl}/login/admin</a></td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${email}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Password</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;"><code>${temporaryPassword}</code></td></tr>
      </table>
      <p>Please change your password after your first login.</p>
    </div>
  `;

  const text = [
    `Hello ${name},`,
    `Academy: ${academyName}`,
    `Login: ${loginUrl}/login/admin`,
    `Email: ${email}`,
    `Password: ${temporaryPassword}`
  ].join('\n');

  return sendMail({ to: email, subject, html, text });
};

export const sendPasswordResetEmail = async ({ email, name, code, expiresMinutes }) => {
  const subject = 'SAMS — Password Reset Verification Code';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">Password Reset</h2>
      <p>Hello <strong>${name || 'there'}</strong>,</p>
      <p>Use this verification code to reset your password:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px;"><code>${code}</code></p>
      <p>This code expires in <strong>${expiresMinutes} minutes</strong>. If you did not request a reset, you can ignore this email.</p>
      <p style="color: #6b7280; font-size: 12px;">Automated message from SAMS.</p>
    </div>
  `;

  const text = [
    `Hello ${name || 'there'},`,
    '',
    `Your password reset verification code is: ${code}`,
    `It expires in ${expiresMinutes} minutes.`,
    '',
    'If you did not request this, ignore this email.'
  ].join('\n');

  return sendMail({ to: email, subject, html, text });
};

const attendanceMessageForStatus = (status, studentName) => {
  const normalized = String(status).toUpperCase();
  switch (normalized) {
    case 'PRESENT':
      return `Your child ${studentName} attended today's training session.`;
    case 'ABSENT':
      return `Your child ${studentName} was absent today.`;
    case 'LATE':
      return `Your child ${studentName} arrived late today.`;
    default:
      return `Attendance update for ${studentName}: ${normalized}.`;
  }
};

export const sendParentAttendanceEmail = async ({
  parentEmail,
  studentName,
  status,
  batchName,
  remarks,
  markedAt
}) => {
  const subject = `Attendance — ${studentName}`;
  const timestamp = markedAt.toISOString();
  const summary = attendanceMessageForStatus(status, studentName);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #047857;">Training Attendance</h2>
      <p>Dear Parent/Guardian,</p>
      <p>${summary}</p>
      <ul>
        <li><strong>Batch:</strong> ${batchName || 'N/A'}</li>
        <li><strong>Status:</strong> ${String(status).toUpperCase()}</li>
        <li><strong>Date:</strong> ${timestamp}</li>
        ${remarks ? `<li><strong>Remarks:</strong> ${remarks}</li>` : ''}
      </ul>
      <p style="color: #6b7280; font-size: 12px;">Automated notification from your Sports Academy.</p>
    </div>
  `;

  const text = ['Dear Parent/Guardian,', '', summary, `Batch: ${batchName || 'N/A'}`, `Date: ${timestamp}`];
  if (remarks) text.push(`Remarks: ${remarks}`);

  return sendMail({ to: parentEmail, subject, html, text: text.join('\n') });
};

export const sendParentDailyNoteEmail = async ({
  parentEmail,
  studentName,
  batchName,
  note
}) => {
  const subject = `Training Update — ${studentName}`;
  const sections = [
    ['Performance', note.performance_notes],
    ['Behaviour', note.behaviour_notes],
    ['Achievements', note.achievements],
    ['Areas to improve', note.improvement_areas]
  ].filter(([, value]) => value);

  const listHtml = sections
    .map(([label, value]) => `<li><strong>${label}:</strong> ${value}</li>`)
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">Coach Daily Notes</h2>
      <p>Dear Parent/Guardian,</p>
      <p>Your coach shared an update for <strong>${studentName}</strong>${batchName ? ` (${batchName})` : ''}:</p>
      <ul>${listHtml}</ul>
      <p style="color: #6b7280; font-size: 12px;">Automated message from your Sports Academy.</p>
    </div>
  `;

  const text = [
    `Daily notes for ${studentName}:`,
    ...sections.map(([label, value]) => `${label}: ${value}`)
  ].join('\n');

  return sendMail({ to: parentEmail, subject, html, text });
};

export const sendStudentExitEmail = async ({
  parentEmail,
  studentName,
  exitReason,
  exitNote
}) => {
  const subject = `Academy Exit — ${studentName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #b45309;">Student Exit Notice</h2>
      <p>Dear Parent/Guardian,</p>
      <p>This confirms that <strong>${studentName}</strong> has exited the academy program.</p>
      <p><strong>Reason:</strong> ${exitReason}</p>
      ${exitNote ? `<p><strong>Note:</strong> ${exitNote}</p>` : ''}
      <p>Thank you for being part of our academy.</p>
    </div>
  `;
  const text = [
    `${studentName} has exited the academy.`,
    `Reason: ${exitReason}`,
    exitNote ? `Note: ${exitNote}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  return sendMail({ to: parentEmail, subject, html, text });
};

export const sendCoachAbsenceAlertToAdmin = async ({
  adminEmail,
  coachName,
  date,
  batches
}) => {
  const subject = `Coach Absence Alert — ${coachName}`;
  const batchList =
    batches?.length > 0
      ? batches.map((b) => `<li>${b.name} (${b.timing || 'no time'})</li>`).join('')
      : '<li>No batches listed</li>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Coach Absent Today</h2>
      <p><strong>${coachName}</strong> marked absent on ${date}.</p>
      <p>Affected batches:</p>
      <ul>${batchList}</ul>
      <p>Please arrange coverage or manual attendance if needed.</p>
    </div>
  `;

  return sendMail({
    to: adminEmail,
    subject,
    html,
    text: `Coach ${coachName} is absent on ${date}. Check the admin dashboard for affected batches.`
  });
};
