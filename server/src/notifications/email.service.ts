import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { createError } from '../middleware/error.middleware';

interface EmailOptions {
  to: string;
  subject: string;
  heading: string;
  message: string;
  code: string;
}

let gmailTransporter: nodemailer.Transporter | null = null;

function getGmailTransporter(): nodemailer.Transporter {
  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.email.gmailUser,
        pass: env.email.gmailPass,
      },
    });
  }
  return gmailTransporter;
}

export async function sendCodeEmail(options: EmailOptions): Promise<void> {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4361EE; margin: 0; font-size: 24px;">Insplit</h1>
      </div>
      <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 12px;">${options.heading}</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">${options.message}</p>
      <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; margin: 28px 0; padding: 16px; background-color: #f1f5f9; text-align: center; border-radius: 8px; color: #4361EE; border: 1px dashed #cbd5e1;">
        ${options.code}
      </div>
      <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
        This code is valid for 10 minutes. If you did not request this code, you can safely ignore this email.
      </p>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Insplit - Split expenses seamlessly.
      </div>
    </div>
  `;

  if (!env.email.configured) {
    if (env.nodeEnv !== 'production') {
      console.info(`\n📧 [EMAIL OTP - DEV MODE] ------------------------`);
      console.info(`To: ${options.to}`);
      console.info(`Subject: ${options.subject}`);
      console.info(`OTP Code: >>> ${options.code} <<<`);
      console.info(`---------------------------------------------------\n`);
      return;
    }
    throw createError('Email delivery is not configured', 503, 'EMAIL_NOT_CONFIGURED');
  }

  // 1. If Gmail / SMTP is configured
  if (env.email.type === 'gmail') {
    try {
      const transporter = getGmailTransporter();
      await transporter.sendMail({
        from: env.email.from,
        to: options.to,
        subject: options.subject,
        html: htmlContent,
      });
      console.info(`[email sent via Gmail] ${options.subject} to ${options.to}`);
      return;
    } catch (err) {
      console.error('Gmail SMTP delivery failed:', err);
      throw createError('Unable to send email right now', 502, 'EMAIL_DELIVERY_FAILED');
    }
  }

  // 2. If Resend is configured
  if (env.email.type === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.email.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.email.from,
        to: [options.to],
        subject: options.subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      console.error('Resend email delivery failed:', response.status, await response.text());
      throw createError('Unable to send email right now', 502, 'EMAIL_DELIVERY_FAILED');
    }
    console.info(`[email sent via Resend] ${options.subject} to ${options.to}`);
  }
}
