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

  async onModuleInit(): Promise<void> {
    if (!this.transporter) {
      this.logger.log('Email sending is disabled');
      return;
    }

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified');
    } catch (error) {
      this.logger.error(
        'SMTP connection could not be verified',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendContactEmails(data: ContactEmailData): Promise<void> {
    if (!this.transporter) {
      return;
    }

    const fromAddress = this.config.getOrThrow<string>('MAIL_FROM_ADDRESS');

    const from = {
      name: this.config.getOrThrow<string>('MAIL_FROM_NAME'),
      address: fromAddress,
    };

    const adminRecipients = this.config.getOrThrow<string>('MAIL_CONTACT_TO');

    const customerSubject =
      data.locale === 'en'
        ? 'We received your message | MayCloud'
        : 'Recibimos tu mensaje | MayCloud';

    const adminSubject =
      data.locale === 'en'
        ? `New contact: ${data.name}`
        : `Nuevo contacto: ${data.name}`;

    const customerElement = createElement(ContactCustomerEmail, { data });

    const adminElement = createElement(ContactAdminEmail, { data });

    const [customerHtml, customerText, adminHtml, adminText] =
      await Promise.all([
        render(customerElement),

        render(customerElement, {
          plainText: true,
        }),

        render(adminElement),

        render(adminElement, {
          plainText: true,
        }),
      ]);

    const results = await Promise.allSettled([
      // Correo de confirmación al cliente
      this.transporter.sendMail({
        from,
        to: data.email,

        // Si el cliente responde, llegará a contacto@maycloud.mx
        replyTo: fromAddress,

        subject: customerSubject,
        html: customerHtml,
        text: customerText,
      }),

      // Notificación interna
      this.transporter.sendMail({
        from,

        // contacto@maycloud.mx + Gmail + Hotmail
        to: adminRecipients,

        // Al responder, irá directamente al prospecto
        replyTo: {
          name: data.name,
          address: data.email,
        },

        subject: adminSubject,
        html: adminHtml,
        text: adminText,
      }),
    ]);

    results.forEach((result, index) => {
      if (result.status !== 'rejected') {
        return;
      }

      const recipient = index === 0 ? 'customer' : 'administrator';

      this.logger.error(
        `Could not send contact email to ${recipient} (${data.reference})`,
        result.reason instanceof Error
          ? result.reason.stack
          : String(result.reason),
      );
    });
  }
}
