import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
  meta?: Record<string, unknown>;
}

export interface EmailSendResult {
  success: boolean;
  message: string;
  data?: {
    recipient: string;
    subject: string;
    messageId?: string;
    timestamp: string;
    meta?: Record<string, unknown>;
  };
  error?: {
    code: string;
    description: string;
  };
}

interface ValidationError {
  field: string;
  message: string;
}

interface SmtpSendInfo {
  messageId?: string;
}

/**
 * Outbound email sender for OTP + transactional mail.
 *
 * Sends directly over Gmail SMTP from this backend (AWS EC2) via Nodemailer.
 * No external email microservice involved.
 */
@Injectable()
export class EmailClientService {
  private readonly logger = new Logger(EmailClientService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASS;

    if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });
    } else {
      this.logger.warn(
        'Gmail SMTP credentials missing — set GMAIL_USER and GMAIL_APP_PASS. Emails will fail until then.',
      );
    }

    this.from = gmailUser || '"Gobadi App" <no-reply@gobadi.com>';
  }

  private validate(options: SendEmailOptions): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!options || typeof options !== 'object') {
      errors.push({ field: 'body', message: 'Options must be an object' });
      return errors;
    }
    if (!options.to || typeof options.to !== 'string') {
      errors.push({ field: 'to', message: 'Missing required field: to' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.to)) {
      errors.push({ field: 'to', message: 'Invalid email address format' });
    }
    if (
      !options.subject ||
      typeof options.subject !== 'string' ||
      !options.subject.trim()
    ) {
      errors.push({ field: 'subject', message: 'Missing or empty subject' });
    }
    if (
      !options.html ||
      typeof options.html !== 'string' ||
      !options.html.trim()
    ) {
      errors.push({ field: 'html', message: 'Missing or empty html body' });
    }
    return errors;
  }

  /**
   * Send an email over Gmail SMTP.
   *
   * Retries once on transient network errors (ECONNRESET, ETIMEDOUT, ESOCKET).
   * Auth and envelope failures are not retried.
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const validation = this.validate(options);
    if (validation.length > 0) {
      const description = validation
        .map((e) => `${e.field}: ${e.message}`)
        .join('; ');
      this.logger.error(`Email validation failed → ${description}`);
      return {
        success: false,
        message: 'Validation failed',
        error: { code: 'VALIDATION_ERROR', description },
      };
    }

    const { to, subject, text, html, meta } = options;

    if (!this.transporter) {
      this.logger.error('Gmail SMTP not configured — skipping send');
      return {
        success: false,
        message: 'Email service not configured',
        error: {
          code: 'SERVICE_NOT_CONFIGURED',
          description: 'GMAIL_USER or GMAIL_APP_PASS env vars are missing',
        },
      };
    }

    const payload = {
      from: this.from,
      to,
      subject,
      text: text || subject,
      html,
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const info = (await this.transporter.sendMail(payload)) as SmtpSendInfo;
        this.logger.log(`Email sent to ${to} (msgId: ${info.messageId})`);
        return {
          success: true,
          message: 'Email delivered successfully',
          data: {
            recipient: to,
            subject,
            messageId: info.messageId || 'unknown',
            timestamp: new Date().toISOString(),
            ...(meta ? { meta } : {}),
          },
        };
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        const isTransient =
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ESOCKET' ||
          err.code === 'ECONNECTION';

        if (isTransient && attempt < 2) {
          this.logger.warn(
            `SMTP send to ${to} failed (${err.code}), retrying in 1s...`,
          );
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        this.logger.error(
          `SMTP failed to ${to}: ${err.message} | code: ${err.code}`,
        );

        let errorCode = 'SMTP_ERROR';
        let errorDesc = err.message || 'Unknown error occurred';
        if (err.code === 'EAUTH') {
          errorCode = 'SMTP_AUTH_FAILED';
          errorDesc =
            'Gmail app password invalid. Regenerate in Google Account > Security > App passwords.';
        } else if (err.code === 'ECONNREFUSED') {
          errorCode = 'SMTP_CONNECTION_REFUSED';
          errorDesc = 'Could not connect to Gmail SMTP server';
        } else if (err.code === 'ETIMEDOUT') {
          errorCode = 'SMTP_TIMEOUT';
          errorDesc = 'Connection to Gmail SMTP server timed out';
        } else if (err.code === 'EENVELOPE') {
          errorCode = 'INVALID_ENVELOPE';
          errorDesc = `Invalid recipient address: ${to}`;
        }

        return {
          success: false,
          message: 'Email delivery failed',
          error: { code: errorCode, description: errorDesc },
          data: {
            recipient: to,
            subject,
            timestamp: new Date().toISOString(),
            ...(meta ? { meta } : {}),
          },
        };
      }
    }

    return {
      success: false,
      message: 'Email delivery failed after retries',
      error: { code: 'MAX_RETRIES', description: 'Failed after 2 attempts' },
    };
  }
}
