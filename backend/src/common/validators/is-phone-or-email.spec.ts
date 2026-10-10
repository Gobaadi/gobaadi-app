import {
  isAllowedEmailDomain,
  isPhone,
  isPhoneOrEmailValue,
  isValidEmail,
  isValidEmailSyntax,
} from './is-phone-or-email.validator';

describe('is-phone-or-email.validator', () => {
  describe('isValidEmailSyntax', () => {
    it('accepts an address with @ and a dot', () => {
      expect(isValidEmailSyntax('user@example.com')).toBe(true);
    });

    it('rejects addresses without @', () => {
      expect(isValidEmailSyntax('userexample.com')).toBe(false);
    });

    it('rejects addresses without a dot after @', () => {
      expect(isValidEmailSyntax('user@localhost')).toBe(false);
    });

    it('rejects addresses with spaces', () => {
      expect(isValidEmailSyntax('us er@example.com')).toBe(false);
    });
  });

  describe('isAllowedEmailDomain', () => {
    it('accepts major providers', () => {
      expect(isAllowedEmailDomain('a@gmail.com')).toBe(true);
      expect(isAllowedEmailDomain('a@yahoo.com')).toBe(true);
      expect(isAllowedEmailDomain('a@hotmail.com')).toBe(true);
      expect(isAllowedEmailDomain('a@outlook.com')).toBe(true);
      expect(isAllowedEmailDomain('a@yahoo.co.uk')).toBe(true);
    });

    it('is case-insensitive on the domain', () => {
      expect(isAllowedEmailDomain('USER@GMAIL.COM')).toBe(true);
      expect(isAllowedEmailDomain('a@Hotmail.com')).toBe(true);
    });

    it('rejects disposable or unknown domains', () => {
      expect(isAllowedEmailDomain('hihomar218@18lover.com')).toBe(false);
      expect(isAllowedEmailDomain('a@random-company.com')).toBe(false);
      expect(isAllowedEmailDomain('a@b.co')).toBe(false);
    });

    it('rejects lookalike subdomains', () => {
      expect(isAllowedEmailDomain('a@notgmail.com')).toBe(false);
      expect(isAllowedEmailDomain('a@evilgmail.com')).toBe(false);
    });

    it('requires a local part and a domain', () => {
      expect(isAllowedEmailDomain('@gmail.com')).toBe(false);
      expect(isAllowedEmailDomain('a@')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('accepts a syntax-valid allowlisted address', () => {
      expect(isValidEmail('user@gmail.com')).toBe(true);
      expect(isValidEmail('user+tag@yahoo.com')).toBe(true);
    });

    it('rejects the reported disposable address', () => {
      expect(isValidEmail('hihomar218@18lover.com')).toBe(false);
    });
  });

  describe('isPhone', () => {
    it('accepts phone numbers', () => {
      expect(isPhone('+8801712345678')).toBe(true);
      expect(isPhone('01712345678')).toBe(true);
    });

    it('rejects non-phone values', () => {
      expect(isPhone('not-a-phone')).toBe(false);
      expect(isPhone('123')).toBe(false);
    });
  });

  describe('isPhoneOrEmailValue', () => {
    it('accepts phones and allowlisted emails only', () => {
      expect(isPhoneOrEmailValue('+8801712345678')).toBe(true);
      expect(isPhoneOrEmailValue('user@gmail.com')).toBe(true);
      expect(isPhoneOrEmailValue('hihomar218@18lover.com')).toBe(false);
      expect(isPhoneOrEmailValue('plainstring')).toBe(false);
      expect(isPhoneOrEmailValue(42)).toBe(false);
      expect(isPhoneOrEmailValue(null)).toBe(false);
    });
  });
});
