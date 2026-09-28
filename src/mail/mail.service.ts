import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import nodemailer, { type Transporter } from 'nodemailer';
import { createElement } from 'react';
import type { ContactEmailData } from './mail.types';
import { ContactAdminEmail } from './templates/contact-admin.email';
import { ContactCustomerEmail } from './templates/contact-customer.email';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly enabled: boolean;
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<boolean>('MAIL_ENABLED') ?? false;
    this.transporter = this.enabled
      ? nodemailer.createTransport({
          host: this.config.getOrThrow<string>('SMTP_HOST'),
          port: this.config.getOrThrow<number>('SMTP_PORT'),
          secure: this.config.getOrThrow<boolean>('SMTP_SECURE'),
          auth: {
            user: this.config.getOrThrow<string>('SMTP_USER'),
            pass: this.config.getOrThrow<string>('SMTP_PASSWORD'),
          },
        })
      : null;
  }

  async onModuleInit() {
    if (!this.transporter) {
      this.logger.log('Email sending is disabled');
      return;
    }

    await this.transporter.verify();
    this.logger.log('SMTP connection verified');
  }

  async sendContactEmails(data: ContactEmailData): Promise<void> {
    if (!this.transporter) return;

    const from = {
      name: this.config.getOrThrow<string>('MAIL_FROM_NAME'),
      address: this.config.getOrThrow<string>('MAIL_FROM_ADDRESS'),
    };
    const adminAddress = this.config.getOrThrow<string>('MAIL_CONTACT_TO');
    const customerSubject =
      data.locale === 'en'
        ? 'We received your message | MayCloud'
        : 'Recibimos tu mensaje | MayCloud';
    const adminSubject =
      data.locale === 'en'
        ? `New contact: ${data.name}`
        : `Nuevo contacto: ${data.name}`;

    const [customerHtml, customerText, adminHtml, adminText] =
      await Promise.all([
        render(createElement(ContactCustomerEmail, { data })),
        render(createElement(ContactCustomerEmail, { data }), {
          plainText: true,
        }),
        render(createElement(ContactAdminEmail, { data })),
        render(createElement(ContactAdminEmail, { data }), {
          plainText: true,
        }),
      ]);

    const results = await Promise.allSettled([
      this.transporter.sendMail({
        from,
        to: data.email,
        replyTo: adminAddress,
        subject: customerSubject,
        html: customerHtml,
        text: customerText,
      }),
      this.transporter.sendMail({
        from,
        to: adminAddress,
        replyTo: { name: data.name, address: data.email },
        subject: adminSubject,
        html: adminHtml,
        text: adminText,
      }),
    ]);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const recipient = index === 0 ? 'customer' : 'administrator';
        this.logger.error(
          `Could not send contact email to ${recipient} (${data.reference})`,
          result.reason instanceof Error
            ? result.reason.stack
            : String(result.reason),
        );
      }
    });
  }
}
