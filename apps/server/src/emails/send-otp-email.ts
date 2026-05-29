import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendOtpEmail(params: { to: string; name: string; otp: string }) {
  if (!resend) {
    console.log('[Email] Resend not configured. OTP for', params.to, ':', params.otp);
    return;
  }

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: params.to,
    subject: 'Your password change verification code',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #111;">Password Change Request</h1>
        <p>Hi <strong>${params.name}</strong>,</p>
        <p>Use the verification code below to confirm your password change. It expires in <strong>10 minutes</strong>.</p>
        <div style="background: #f4f4f5; padding: 32px; border-radius: 8px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Your verification code</p>
          <p style="margin: 0; font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #1a73e8;">${params.otp}</p>
        </div>
        <p style="color: #666;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
