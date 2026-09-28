import type { ContactEmailData } from '../../src/mail/mail.types';

const baseContact = {
  reference: 'MC-2026-00042',
  name: 'María López',
  companyOrProject: 'Plataforma MayTravel',
  email: 'maria@empresa.com',
  phone: '+52 998 123 4567',
  message:
    'Buscamos desarrollar una plataforma web para administrar reservaciones, pagos y comunicación con nuestros clientes.',
  createdAt: new Date('2026-09-27T15:30:00.000Z'),
} satisfies Omit<
  ContactEmailData,
  'locale' | 'projectStage' | 'developmentOptions'
>;

export const contactEs: ContactEmailData = {
  ...baseContact,
  locale: 'es',
  projectStage: 'Definición de requerimientos',
  developmentOptions: ['Desarrollo web', 'Diseño UX/UI'],
};

export const contactEn: ContactEmailData = {
  ...baseContact,
  locale: 'en',
  projectStage: 'Requirements definition',
  developmentOptions: ['Web development', 'UX/UI design'],
};
