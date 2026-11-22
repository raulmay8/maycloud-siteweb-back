import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import nodemailer, { type Transporter } from 'nodemailer';
import { createElement } from 'react';

import type {
  ContactEmailData,
  PartnerRegistrationAdminEmailData,
  PartnerRegistrationEmailData,
} from './mail.types';

import { ContactAdminEmail } from './templates/contact-admin.email';
import { ContactCustomerEmail } from './templates/contact-customer.email';
import { CrmEmailTemplate } from './templates/crm.email';

import { PartnerRegistrationEmail } from './templates/partner-registration.email';
import { PartnerRegistrationAdminEmail } from './templates/partner-registration-admin.email';

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

  // =========================================================
  // INITIALIZE SMTP
  // =========================================================

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

  // =========================================================
  // CONTACT EMAILS
  // =========================================================

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
        render(customerElement, { plainText: true }),
        render(adminElement),
        render(adminElement, { plainText: true }),
      ]);

    const results = await Promise.allSettled([
      this.transporter.sendMail({
        from,
        to: data.email,
        replyTo: fromAddress,
        subject: customerSubject,
        html: customerHtml,
        text: customerText,
      }),

      this.transporter.sendMail({
        from,
        to: adminRecipients,
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

  // =========================================================
  // CRM EMAIL RENDER
  // =========================================================

  async renderCrmEmail(
    subject: string,
    content: string,
    locale: 'es' | 'en' = 'es',
  ) {
    const element = createElement(CrmEmailTemplate, {
      subject,
      content,
      locale,
    });

    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);

    return { html, text };
  }

  // =========================================================
  // CRM EMAIL SEND
  // =========================================================

  async sendCrmEmail(input: {
    recipient: string;
    subject: string;
    content: string;
    locale: 'es' | 'en';
  }): Promise<{ messageId: string | null }> {
    if (!this.transporter) {
      throw new Error('El envío de correo está deshabilitado');
    }

    const fromAddress = this.config.getOrThrow<string>('MAIL_FROM_ADDRESS');

    const rendered = await this.renderCrmEmail(
      input.subject,
      input.content,
      input.locale,
    );

    const result = await this.transporter.sendMail({
      from: {
        name: this.config.getOrThrow<string>('MAIL_FROM_NAME'),
        address: fromAddress,
      },
      to: input.recipient,
      replyTo: fromAddress,
      subject: input.subject,
      html: rendered.html,
      text: rendered.text,
    });

    return {
      messageId: result.messageId || null,
    };
  }

  // =========================================================
  // PARTNER REGISTRATION CONFIRMATION
  // =========================================================

  async sendPartnerRegistrationEmail(
    data: PartnerRegistrationEmailData,
  ): Promise<{ messageId: string | null }> {
    if (!this.transporter) {
      return { messageId: null };
    }

    const fromAddress = this.config.getOrThrow<string>('MAIL_FROM_ADDRESS');

    const subject =
      data.locale === 'en'
        ? 'We received your referral | MayCloud'
        : 'Hemos recibido su recomendación | MayCloud';

    const element = createElement(PartnerRegistrationEmail, { data });

    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);

    const result = await this.transporter.sendMail({
      from: {
        name: this.config.getOrThrow<string>('MAIL_FROM_NAME'),
        address: fromAddress,
      },
      to: data.partnerEmail,
      replyTo: fromAddress,
      subject,
      html,
      text,
    });

    return {
      messageId: result.messageId || null,
    };
  }

  // =========================================================
  // PARTNER REGISTRATION ADMIN NOTIFICATION
  // =========================================================

  async sendPartnerRegistrationAdminEmail(
    data: PartnerRegistrationAdminEmailData,
  ): Promise<{ messageId: string | null }> {
    if (!this.transporter) {
      return { messageId: null };
    }

    const fromAddress = this.config.getOrThrow<string>('MAIL_FROM_ADDRESS');

    const adminRecipients = this.config.getOrThrow<string>('MAIL_CONTACT_TO');

    const subject =
      data.locale === 'en'
        ? `New partner referral: ${data.company} | MayCloud`
        : `Nueva recomendación: ${data.company} | MayCloud`;

    const element = createElement(PartnerRegistrationAdminEmail, { data });

    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);

    const result = await this.transporter.sendMail({
      from: {
        name: this.config.getOrThrow<string>('MAIL_FROM_NAME'),
        address: fromAddress,
      },
      to: adminRecipients,
      replyTo: {
        name: data.partnerName,
        address: data.partnerEmail,
      },
      subject,
      html,
      text,
    });

    return {
      messageId: result.messageId || null,
    };
  }
}
