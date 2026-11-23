import type { ContactLocale } from '../contact/dto/create-contact-message.dto';

export interface ContactEmailData {
  reference: string;
  locale: ContactLocale;
  name: string;
  companyOrProject: string | null;
  email: string;
  phone: string | null;
  projectStage: string;
  developmentOptions: string[];
  message: string;
  createdAt: Date;
}

export interface PartnerRegistrationEmailData {
  locale: 'es' | 'en';
  partnerName: string;
  partnerEmail: string;
  company: string;
  createdAt: Date;
}

export interface PartnerRegistrationAdminEmailData {
  locale: 'es' | 'en';
  createdAt: Date;

  // Datos del socio (partners)
  partnerName: string;
  partnerEmail: string;
  partnerPhone: string | null;
  partnerCountry: string | null;

  // Datos del prospecto (crm_leads)
  company: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;

  // Datos relacionados con el prospecto
  description: string | null;
}
