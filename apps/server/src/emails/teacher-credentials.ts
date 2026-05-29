import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendTeacherCredentialsEmail(params: {
  to: string;
  teacherName: string;
  schoolName: string;
  email: string;
  tempPassword: string;
}) {
  if (!resend) {
    console.log('[Email] Resend not configured. Teacher credentials:', params);
    return;
  }

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: params.to,
    subject: `Welcome to ${params.schoolName} - Your Teacher Account`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #111;">Welcome, ${params.teacherName}!</h1>
        <p>Your teacher account has been created for <strong>${params.schoolName}</strong>.</p>
        <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0 0 8px;"><strong>Login URL:</strong> <a href="${env.APP_URL}/login">${env.APP_URL}/login</a></p>
          <p style="margin: 0 0 8px;"><strong>Email:</strong> ${params.email}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> <code>${params.tempPassword}</code></p>
        </div>
        <p style="color: #666;">Please change your password after your first login.</p>
      </div>
    `,
  });
}
