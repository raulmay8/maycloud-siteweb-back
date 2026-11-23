import { Section, Text } from '@react-email/components';

import type { PartnerRegistrationAdminEmailData } from '../mail.types';
import { EmailLayout, styles } from './email-layout';

interface PartnerRegistrationAdminEmailProps {
  data: PartnerRegistrationAdminEmailData;
}

export function PartnerRegistrationAdminEmail({
  data,
}: PartnerRegistrationAdminEmailProps) {
  const copy = data.locale === 'en' ? en : es;

  const createdAt = new Intl.DateTimeFormat(
    data.locale === 'en' ? 'en-US' : 'es-MX',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Cancun',
    },
  ).format(data.createdAt);

  const clientFields: Array<[string, string]> = [
    [copy.company, data.company],
    [copy.contactName, data.contactName ?? copy.notProvided],
    [copy.contactEmail, data.contactEmail ?? copy.notProvided],
    [copy.contactPhone, data.contactPhone ?? copy.notProvided],
  ];

  const partnerFields: Array<[string, string]> = [
    [copy.name, data.partnerName],
    [copy.email, data.partnerEmail],
    [copy.phone, data.partnerPhone ?? copy.notProvided],
    [copy.country, data.partnerCountry ?? copy.notProvided],
  ];

  return (
    <EmailLayout
      preview={copy.preview}
      eyebrow={copy.eyebrow}
      title={copy.title}
      locale={data.locale}
    >
      <Text style={styles.paragraph}>{copy.introduction}</Text>

      {/* Fecha de registro */}
      <Section style={styles.panel}>
        <Text style={styles.panelTitle}>{copy.registrationDetails}</Text>

        <Text style={styles.label}>{copy.date}</Text>

        <Text style={styles.value}>{createdAt}</Text>
      </Section>

      {/* Empresa recomendada */}
      <Section style={styles.panel}>
        <Text style={styles.panelTitle}>{copy.clientDetails}</Text>

        {clientFields.map(([label, value]) => (
          <Section key={label}>
            <Text style={styles.label}>{label}</Text>

            <Text style={styles.value}>{value}</Text>
          </Section>
        ))}

        <Text style={styles.label}>{copy.description}</Text>

        <Text style={styles.message}>
          {data.description || copy.notProvided}
        </Text>
      </Section>

      {/* Datos del socio */}
      <Section style={styles.panel}>
        <Text style={styles.panelTitle}>{copy.partnerDetails}</Text>

        {partnerFields.map(([label, value]) => (
          <Section key={label}>
            <Text style={styles.label}>{label}</Text>

            <Text style={styles.value}>{value}</Text>
          </Section>
        ))}
      </Section>
    </EmailLayout>
  );
}

// =========================================================
// SPANISH
// =========================================================

const es = {
  preview: 'Nueva recomendación recibida en el Programa de Socios',

  eyebrow: 'Nueva recomendación',

  title: 'Nuevo cliente recomendado',

  introduction:
    'Se ha recibido una nueva recomendación a través del Programa de Socios de MayCloud. A continuación se muestra la información proporcionada.',

  registrationDetails: 'Información del registro',
  date: 'Fecha',

  clientDetails: 'Empresa recomendada',
  company: 'Empresa',
  contactName: 'Nombre del contacto',
  contactEmail: 'Correo del contacto',
  contactPhone: 'Teléfono del contacto',
  description: 'Descripción del proyecto',

  partnerDetails: 'Datos del socio',
  name: 'Nombre',
  email: 'Correo electrónico',
  phone: 'Teléfono',
  country: 'País',

  notProvided: 'No proporcionado',
};

// =========================================================
// ENGLISH
// =========================================================

const en = {
  preview: 'New referral received through the Partner Program',

  eyebrow: 'New referral',

  title: 'New referred client',

  introduction:
    'A new referral has been received through the MayCloud Partner Program. The submitted information is shown below.',

  registrationDetails: 'Registration information',
  date: 'Date',

  clientDetails: 'Referred company',
  company: 'Company',
  contactName: 'Contact name',
  contactEmail: 'Contact email',
  contactPhone: 'Contact phone',
  description: 'Project description',

  partnerDetails: 'Partner details',
  name: 'Name',
  email: 'Email address',
  phone: 'Phone',
  country: 'Country',

  notProvided: 'Not provided',
};
