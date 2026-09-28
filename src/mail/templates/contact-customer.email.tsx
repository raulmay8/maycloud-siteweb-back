import { Section, Text } from '@react-email/components';
import type { ContactEmailData } from '../mail.types';
import { EmailLayout, styles } from './email-layout';

export function ContactCustomerEmail({ data }: { data: ContactEmailData }) {
  const copy = data.locale === 'en' ? en : es;
  const fields = [
    [copy.company, data.companyOrProject ?? copy.notProvided],
    [copy.stage, data.projectStage],
    [copy.options, data.developmentOptions.join(', ')],
    [copy.phone, data.phone ?? copy.notProvided],
  ];

  return (
    <EmailLayout preview={copy.preview} title={copy.title}>
      <Text style={styles.paragraph}>{copy.greeting(data.name)}</Text>
      <Text style={styles.paragraph}>{copy.received}</Text>
      <Section style={styles.panel}>
        {fields.map(([label, value]) => (
          <Section key={label}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </Section>
        ))}
        <Text style={styles.label}>{copy.message}</Text>
        <Text style={styles.message}>{data.message}</Text>
      </Section>
      <Text style={styles.paragraph}>{copy.followUp}</Text>
      <Text style={styles.paragraph}>
        {copy.reference}: <strong>{data.reference}</strong>
      </Text>
      <Text style={styles.paragraph}>{copy.closing}</Text>
    </EmailLayout>
  );
}

const es = {
  preview: 'Recibimos tu mensaje en MayCloud',
  title: 'Gracias por contactarnos',
  greeting: (name: string) => `Hola ${name},`,
  received: 'Recibimos correctamente la informaci\u00f3n de tu proyecto.',
  followUp:
    'Nuestro equipo la revisar\u00e1 y se pondr\u00e1 en contacto contigo lo antes posible.',
  reference: 'Referencia',
  company: 'Empresa o proyecto',
  stage: 'Etapa del proyecto',
  options: 'Servicios de inter\u00e9s',
  phone: 'Tel\u00e9fono',
  message: 'Tu mensaje',
  notProvided: 'No proporcionado',
  closing: 'Gracias por considerar a MayCloud.',
};

const en = {
  preview: 'We received your message at MayCloud',
  title: 'Thank you for contacting us',
  greeting: (name: string) => `Hello ${name},`,
  received: 'We successfully received your project information.',
  followUp:
    'Our team will review it and get in touch with you as soon as possible.',
  reference: 'Reference',
  company: 'Company or project',
  stage: 'Project stage',
  options: 'Services of interest',
  phone: 'Phone',
  message: 'Your message',
  notProvided: 'Not provided',
  closing: 'Thank you for considering MayCloud.',
};
