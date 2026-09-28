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
