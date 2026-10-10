const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mainstream email providers accepted for registration/login/OTP.
 * Must stay in sync with the backend validator
 * (backend/src/common/validators/is-phone-or-email.validator.ts).
 */
const ALLOWED_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'ymail.com',
  'rocketmail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'gmx.com',
  'yandex.com',
]);

export function isValidEmailSyntax(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export function isAllowedEmail(value: string): boolean {
  const atIndex = value.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === value.length - 1) return false;
  const domain = value.slice(atIndex + 1).toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.has(domain);
}
