import { registerDecorator, ValidationOptions } from 'class-validator';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

/**
 * Curated allowlist of mainstream email providers. Only addresses whose
 * domain matches one of these exactly (case-insensitive) are accepted —
 * disposable/unknown domains such as "18lover.com" are rejected even though
 * they may have valid MX records.
 */
export const ALLOWED_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
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

export function isAllowedEmailDomain(value: string): boolean {
  const atIndex = value.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === value.length - 1) return false;
  const domain = value.slice(atIndex + 1).toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.has(domain);
}

export function isValidEmail(value: string): boolean {
  return isValidEmailSyntax(value) && isAllowedEmailDomain(value);
}

export function isPhone(value: string): boolean {
  return PHONE_REGEX.test(value);
}

export function isPhoneOrEmailValue(value: unknown): value is string {
  return typeof value === 'string' && (isPhone(value) || isValidEmail(value));
}

export function IsPhoneOrEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneOrEmail',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a valid phone number or an email from a supported provider (Gmail, Yahoo, Hotmail, Outlook, etc.)`,
        ...validationOptions,
      },
      validator: {
        validate: isPhoneOrEmailValue,
      },
    });
  };
}
