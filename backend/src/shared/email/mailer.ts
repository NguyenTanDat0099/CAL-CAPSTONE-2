import nodemailer from 'nodemailer';

const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpFrom = process.env.SMTP_FROM || smtpUser;

const isEmailConfigured = Boolean(smtpUser && smtpPass && smtpFrom);

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

export const emailSenderConfigured = isEmailConfigured;

export const sendOtpEmail = async (to: string, subject: string, heading: string, code: string) => {
  if (!transporter) {
    return false;
  }

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; background:#111; color:#fff; padding:32px;">
        <div style="max-width:480px; margin:0 auto; background:#1f1f1f; border-radius:16px; padding:32px; border:1px solid rgba(255,255,255,0.08);">
          <h1 style="margin:0 0 20px; font-size:34px; text-align:center;">
            <span style="color:#ff9060;">Cal</span>AI
          </h1>
          <p style="margin:0 0 12px; color:#ff9060; font-size:14px; font-weight:700;">${heading}</p>
          <p style="margin:0 0 20px; color:#d9d9d9; font-size:14px; line-height:1.6;">
            Use the verification code below to continue. This code will expire in 10 minutes.
          </p>
          <div style="margin:24px 0; text-align:center;">
            <span style="display:inline-block; background:#2f2f2f; color:#fff; font-size:28px; letter-spacing:8px; font-weight:800; padding:14px 20px; border-radius:12px;">
              ${code}
            </span>
          </div>
          <p style="margin:20px 0 0; color:#8a8a8a; font-size:12px;">
            If you did not request this code, you can ignore this email.
          </p>
        </div>
      </div>
    `,
  });

  return true;
};
