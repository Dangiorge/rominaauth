// path: lib/email.js (this is what actually sends emails in the app — already built, shown here for reference)

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const FROM = process.env.RESEND_FROM_EMAIL;

export async function sendVerificationEmail(toEmail, fullName, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: "Verify your Romina PLC account email",
    html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Hi ${fullName},</h2>
      <p>Please confirm your email address to finish setting up your Romina PLC account.</p>
      <a href="${link}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin:16px 0;">Verify Email</a>
      <p style="color:#64748b;font-size:13px;">This link expires in 60 minutes. If you didn't request this, you can ignore this email.</p>
    </div>`,
  });
}

export async function sendPasswordResetEmail(toEmail, fullName, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: "Reset your Romina PLC password",
    html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Hi ${fullName},</h2>
      <p>We received a request to reset your password. Click below to choose a new one.</p>
      <a href="${link}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin:16px 0;">Reset Password</a>
      <p style="color:#64748b;font-size:13px;">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password won't change.</p>
    </div>`,
  });
}
