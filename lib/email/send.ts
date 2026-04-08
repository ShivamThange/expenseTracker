import { Resend } from 'resend';
import VerificationEmail from './templates/verification';
import PasswordResetEmail from './templates/password-reset';
import * as React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev'; // Use Resend test email locally

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const verificationLink = `${APP_URL}/verify-email?token=${token}`;
  
  try {
    const data = await resend.emails.send({
      from: `Smart Expense Splitter <${fromEmail}>`,
      to: email,
      subject: 'Verify your email address',
      react: VerificationEmail({ name, verificationLink }) as React.ReactElement,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return { success: false, error };
  }
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetLink = `${APP_URL}/reset-password?token=${token}`;
  
  try {
    const data = await resend.emails.send({
      from: `Smart Expense Splitter <${fromEmail}>`,
      to: email,
      subject: 'Reset your password',
      react: PasswordResetEmail({ name, resetLink }) as React.ReactElement,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error };
  }
}
