import { Injectable, Logger } from '@nestjs/common';

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
    messageId: string;
    timestamp: string;
    meta?: Record<string, unknown>;
  };
  error?: {
    code: string;
    description: string;
  };
}

/**
 * HTTP client for the standalone Vercel email service.
 *
 * Replaces direct Nodemailer usage in this backend.
 * All email sending now routes through the Vercel serverless function.
 */
@Injectable()
export class EmailClientService {
  private readonly logger = new Logger(EmailClientService.name);
  private readonly serviceUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.serviceUrl = process.env.EMAIL_SERVICE_URL || '';
    this.apiKey = process.env.EMAIL_API_KEY || '';

    if (!this.serviceUrl) {
      this.logger.warn(
        'EMAIL_SERVICE_URL not set — emails will fail. Set this to your Vercel deployment URL.',
      );
    }
    if (!this.apiKey) {
      this.logger.warn(
        'EMAIL_API_KEY not set — emails will fail. Set this to match the Vercel service key.',
      );
    }
  }

  /**
   * Send an email via the Vercel email service.
   *
   * Retries once on transient network errors (ECONNRESET, ETIMEDOUT).
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    if (!this.serviceUrl || !this.apiKey) {
      this.logger.error('Email service not configured — skipping send');
      return {
        success: false,
        message: 'Email service not configured',
        error: {
          code: 'SERVICE_NOT_CONFIGURED',
          description:
            'EMAIL_SERVICE_URL or EMAIL_API_KEY env vars are missing',
        },
      };
    }

    const url = `${this.serviceUrl.replace(/\/$/, '')}/api/send-email`;

    const body = {
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      meta: options.meta,
    };

    // Try once, retry once on transient errors
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000), // 10s timeout
        });

        const result: EmailSendResult = await response.json();

        if (result.success) {
          this.logger.log(
            `Email sent to ${options.to} (msgId: ${result.data?.messageId})`,
          );
        } else {
          this.logger.error(
            `Email failed to ${options.to}: ${result.error?.code} — ${result.error?.description}`,
          );

          // Don't retry auth failures — they won't succeed on retry
          if (result.error?.code === 'SMTP_AUTH_FAILED') {
            return result;
          }
        }

        return result;
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        const isTransient =
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND';

        if (isTransient && attempt < 2) {
          this.logger.warn(
            `Email request to Vercel failed (${error.code}), retrying in 1s...`,
          );
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        this.logger.error(`Email request to Vercel failed: ${error.message}`);
        return {
          success: false,
          message: 'Email service request failed',
          error: {
            code: error.code || 'NETWORK_ERROR',
            description: error.message || 'Could not reach email service',
          },
        };
      }
    }

    // Unreachable, but TypeScript needs it
    return {
      success: false,
      message: 'Email service request failed after retries',
      error: {
        code: 'MAX_RETRIES',
        description: 'Failed after 2 attempts',
      },
    };
  }
}
