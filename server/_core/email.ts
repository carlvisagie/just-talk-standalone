import nodemailer from 'nodemailer';
import { ENV } from './env';

const transporter = nodemailer.createTransport({
  host: ENV.smtpHost,
  port: ENV.smtpPort,
  secure: ENV.smtpPort === 465, // true for 465, false for other ports
  auth: {
    user: ENV.smtpUser,
    pass: ENV.smtpPass,
  },
});

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"Just Talk" <${ENV.smtpFromEmail}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
