import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { MailService } from './mail.service';
import {
  LOGO_CID,
  renderEmailLayout,
  renderOtpCode,
} from './templates/email-layout';

const LOGO_PATH = path.join(__dirname, 'assets/logo.png');

let LOGO_ATTACHMENT: {
  filename: string;
  content: Buffer;
  contentType: string;
  contentId: string;
} | null = null;
try {
  LOGO_ATTACHMENT = {
    filename: 'gobadi-logo.png',
    content: fs.readFileSync(LOGO_PATH),
    contentType: 'image/png',
    contentId: LOGO_CID,
  };
} catch {
  // Logo file not found in dist — emails will be sent without the logo attachment.
}

@Processor('mail-queue')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing email job ${job.id} of type ${job.name}...`);

    const attachments = LOGO_ATTACHMENT ? [LOGO_ATTACHMENT] : [];

    if (job.name === 'send-otp') {
      const { email, otp } = job.data;
      const subject = 'Your Gobadi Verification OTP Code';
      const text = `Hello,\n\nYour Gobadi verification OTP is: ${otp}.\nThis code is valid for 5 minutes.\n\nBest regards,\nGobadi App Team`;
      const html = renderEmailLayout({
        preheader: `Your Gobadi verification code is ${otp}`,
        heading: 'Verify your account',
        bodyHtml: `<p>Hello,</p><p>Use the code below to verify your Gobadi account. It's valid for 5 minutes.</p>${renderOtpCode(otp)}<p>If you didn't request this, you can safely ignore this email.</p>`,
      });

      const sent = await this.mailService.sendMail(
        email,
        subject,
        text,
        html,
        attachments,
      );
      if (!sent) throw new Error(`Failed to send OTP email to ${email}`);
      return { success: true, email };
    }

    if (job.name === 'send-booking-confirmation') {
      const { email, doctorName, date, time } = job.data;
      const subject = 'Gobadi Booking Confirmation';
      const text = `Hello,\n\nYour appointment with ${doctorName} has been successfully scheduled for:\nDate: ${date}\nTime: ${time}.\n\nThank you for choosing Gobadi!\n\nBest regards,\nGobadi App Team`;
      const html = renderEmailLayout({
        preheader: `Your appointment with ${doctorName} is confirmed`,
        heading: 'Booking confirmed',
        bodyHtml: `<p>Hello,</p><p>Your appointment with <strong>${doctorName}</strong> has been successfully scheduled:</p><ul><li><strong>Date:</strong> ${date}</li><li><strong>Time:</strong> ${time}</li></ul><p>Thank you for choosing Gobadi!</p>`,
      });

      const sent = await this.mailService.sendMail(
        email,
        subject,
        text,
        html,
        attachments,
      );
      if (!sent)
        throw new Error(
          `Failed to send booking confirmation email to ${email}`,
        );
      return { success: true, email };
    }

    if (job.name === 'send-appointment-reminder') {
      const { email, doctorName, date, time, windowLabel } = job.data;
      const subject = `Gobadi Appointment Reminder (${windowLabel})`;
      const text = `Hello,\n\nThis is a reminder that your appointment with ${doctorName} is coming up:\nDate: ${date}\nTime: ${time}.\n\nBest regards,\nGobadi App Team`;
      const html = renderEmailLayout({
        preheader: `Reminder: your appointment with ${doctorName} is coming up`,
        heading: `Appointment reminder (${windowLabel})`,
        bodyHtml: `<p>Hello,</p><p>This is a reminder that your appointment with <strong>${doctorName}</strong> is coming up:</p><ul><li><strong>Date:</strong> ${date}</li><li><strong>Time:</strong> ${time}</li></ul>`,
      });

      const sent = await this.mailService.sendMail(
        email,
        subject,
        text,
        html,
        attachments,
      );
      if (!sent)
        throw new Error(
          `Failed to send appointment reminder email to ${email}`,
        );
      return { success: true, email };
    }

    if (job.name === 'send-payment-confirmation') {
      const { email, orderId, totalPrice, transactionId } = job.data;
      const subject = `Gobadi Order Payment Confirmed - ${orderId}`;
      const text = `Hello,\n\nPayment for your order ${orderId} has been successfully verified!\nAmount: BDT ${totalPrice}\nTransaction ID: ${transactionId}.\n\nThank you for shopping on Gobadi!\n\nBest regards,\nGobadi App Team`;
      const html = renderEmailLayout({
        preheader: `Payment confirmed for order ${orderId}`,
        heading: 'Payment confirmed',
        bodyHtml: `<p>Hello,</p><p>Payment for your order <strong>${orderId}</strong> has been successfully verified!</p><ul><li><strong>Amount:</strong> BDT ${totalPrice}</li><li><strong>Transaction ID:</strong> ${transactionId}</li></ul><p>Thank you for shopping on Gobadi!</p>`,
      });

      const sent = await this.mailService.sendMail(
        email,
        subject,
        text,
        html,
        attachments,
      );
      if (!sent)
        throw new Error(
          `Failed to send payment confirmation email to ${email}`,
        );
      return { success: true, email };
    }
  }
}
