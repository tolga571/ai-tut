# Skill — Email System

## Core Rule

> Every project with user accounts needs transactional email.
> At minimum: welcome email, password reset, and critical action confirmations.
> Never send emails directly from a controller — always use a queue or service layer.

---

## Stack Options

```
Nodemailer + Gmail/SMTP  → Simple projects, low volume
SendGrid                 → Production, high volume, analytics
Resend                   → Modern, developer-friendly, generous free tier (recommended)
Mailgun                  → Good for transactional + marketing
```

---

## Setup (Resend — Recommended)

```bash
npm install resend
```

```typescript
// src/config/email.ts
import { Resend } from 'resend';
import { env } from './env';

export const resend = new Resend(env.RESEND_API_KEY);

// .env
// RESEND_API_KEY=re_xxxxxxxxxxxx
// EMAIL_FROM=noreply@yourdomain.com
// CLIENT_URL=http://localhost:3000
```

---

## Email Service

```typescript
// src/services/emailService.ts
import { resend } from '@/config/email';
import { env } from '@/config/env';
import { welcomeTemplate } from '@/emails/templates/welcome';
import { passwordResetTemplate } from '@/emails/templates/passwordReset';
import { orderConfirmTemplate } from '@/emails/templates/orderConfirm';
import logger from '@/config/logger';

export class EmailService {
  private from = env.EMAIL_FROM;

  private async send(to: string, subject: string, html: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.from, to, subject, html,
      });
      if (error) throw new Error(error.message);
      logger.info('Email sent', { to, subject });
      return data;
    } catch (error) {
      // Email failure should NEVER crash the main flow
      logger.error('Email send failed', { to, subject, error });
    }
  }

  async sendWelcome(to: string, name: string) {
    await this.send(to, 'Welcome! 🎉', welcomeTemplate({ name, clientUrl: env.CLIENT_URL }));
  }

  async sendPasswordReset(to: string, resetToken: string) {
    const resetUrl = `${env.CLIENT_URL}/auth/reset-password?token=${resetToken}`;
    await this.send(to, 'Reset Your Password', passwordResetTemplate({ resetUrl, expiresIn: '1 hour' }));
  }

  async sendEmailVerification(to: string, verifyToken: string) {
    const verifyUrl = `${env.CLIENT_URL}/auth/verify-email?token=${verifyToken}`;
    await this.send(to, 'Verify Your Email', `<a href="${verifyUrl}">Click to verify your email</a>`);
  }

  async sendOrderConfirmation(to: string, order: OrderSummary) {
    await this.send(to, `Order Confirmed — #${order.id}`, orderConfirmTemplate(order));
  }

  async sendOrderShipped(to: string, order: OrderSummary & { trackingUrl: string }) {
    await this.send(to, `Your order is on its way! 📦`, orderShippedTemplate(order));
  }

  async sendPasswordChanged(to: string, name: string) {
    await this.send(to, 'Your password was changed', `
      <p>Hi ${name},</p>
      <p>Your password was recently changed. If this wasn't you, contact support immediately.</p>
    `);
  }
}

export const emailService = new EmailService();
```

---

## Password Reset Flow (Complete)

```typescript
// Backend — token generation
// src/modules/auth/auth.service.ts
import crypto from 'crypto';

async forgotPassword(email: string) {
  const user = await userRepository.findByEmail(email);

  // Always return success — never reveal if email exists (security)
  if (!user) return;

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await userRepository.setPasswordResetToken(user._id.toString(), hashedToken, expiresAt);
  await emailService.sendPasswordReset(user.email, resetToken); // send raw token
}

async resetPassword(token: string, newPassword: string) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await userRepository.findByResetToken(hashedToken);

  if (!user || user.passwordResetExpires < new Date()) {
    throw new ValidationError('Token is invalid or has expired');
  }

  await userRepository.updatePassword(user._id.toString(), await hashPassword(newPassword));
  await userRepository.clearResetToken(user._id.toString());
  await emailService.sendPasswordChanged(user.email, user.name);
}
```

---

## Email Templates

```typescript
// src/emails/templates/welcome.ts
export const welcomeTemplate = ({ name, clientUrl }: { name: string; clientUrl: string }) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #3b82f6; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">Welcome!</h1>
  </div>
  <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your account has been created successfully.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${clientUrl}/dashboard"
        style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        Get Started
      </a>
    </div>
    <p style="color: #6b7280; font-size: 12px;">If you didn't create this account, please ignore this email.</p>
  </div>
</body>
</html>
`;

// src/emails/templates/passwordReset.ts
export const passwordResetTemplate = ({ resetUrl, expiresIn }: { resetUrl: string; expiresIn: string }) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Password Reset Request</h2>
  <p>You requested a password reset. Click the button below to reset your password.</p>
  <p>This link expires in <strong>${expiresIn}</strong>.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${resetUrl}"
      style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
      Reset Password
    </a>
  </div>
  <p style="color: #6b7280; font-size: 12px;">If you didn't request this, please ignore this email. Your password will not change.</p>
</body>
</html>
`;
```

---

## Required Email Routes

```typescript
// src/modules/auth/auth.routes.ts
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password',  validate(resetPasswordSchema),  resetPassword);
router.get('/verify-email',     verifyEmail);
```

---

## Frontend — Forgot Password Pages

```
Pages required when email system is set up:
/auth/forgot-password  → email input form
/auth/reset-password   → new password form (reads token from URL)
/auth/verify-email     → handles verification link click
```

---

## Email Checklist

- [ ] Welcome email on registration?
- [ ] Password reset flow complete (request + reset + confirmation)?
- [ ] Email verification flow (if required)?
- [ ] Order confirmation email (e-commerce)?
- [ ] Email failures never crash the main request?
- [ ] Reset tokens hashed in DB (never store raw)?
- [ ] Reset tokens expire (max 1 hour)?
- [ ] Frontend pages exist for all email flows?
- [ ] "Email already exists" never revealed to prevent enumeration attacks?
