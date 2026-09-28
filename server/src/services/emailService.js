import nodemailer from 'nodemailer';

export const isSmtpConfigured = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return Boolean(
    host &&
    user &&
    pass &&
    user !== 'YOUR_SMTP_USERNAME' &&
    user !== 'your_smtp_username' &&
    pass !== 'YOUR_SMTP_PASSWORD'
  );
};

export const getTransporter = () => {
  if (!isSmtpConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send an email message. Skips gracefully if SMTP is not configured.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!isSmtpConfigured()) {
    console.log(`ℹ️  [Email Service] SMTP configuration is placeholder/missing. Skipping email dispatch to: ${to}`);
    return { success: false, skipped: true, message: 'SMTP not configured' };
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Infrastructure Asset Inventory" <noreply@infrastructure-assets.com>',
      to,
      subject,
      text,
      html
    });

    console.log(`📧 [Email Service] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`⚠️  [Email Service] Error sending email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

export default {
  isSmtpConfigured,
  sendEmail
};
