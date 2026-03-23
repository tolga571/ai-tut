/**
 * Mock Email Service
 *
 * Test ortamında @/lib/email yerine bu dosya kullanılır.
 * Gerçek e-posta gönderilmez; gönderim tarihi kaydedilir.
 */

interface SentEmail {
  to: string;
  type: 'password-reset' | 'generic';
  token?: string;
  sentAt: Date;
}

// ─── Sent emails log (testlerde incelenebilir) ────────────────────────────────

export const sentEmails: SentEmail[] = [];

/** Test'ler arası izolasyon */
export function resetEmailState() {
  sentEmails.length = 0;
}

// ─── Mock implementations ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  sentEmails.push({ to, type: 'password-reset', token, sentAt: new Date() });
}

export async function sendEmail(to: string, _subject: string, _body: string): Promise<void> {
  sentEmails.push({ to, type: 'generic', sentAt: new Date() });
}
