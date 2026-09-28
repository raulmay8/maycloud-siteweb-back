import { Section, Text } from '@react-email/components';
import type { ContactEmailData } from '../mail.types';
import { EmailLayout, styles } from './email-layout';

export function ContactAdminEmail({ data }: { data: ContactEmailData }) {
  const copy = data.locale === 'en' ? en : es;
  const fields = [
    [copy.reference, data.reference],
    [copy.name, data.name],
    [copy.email, data.email],
    [copy.phone, data.phone ?? copy.notProvided],
    [copy.company, data.companyOrProject ?? copy.notProvided],
    [copy.stage, data.projectStage],
    [copy.options, data.developmentOptions.join(', ')],
  ];

  return (
    <EmailLayout preview={copy.preview} title={copy.title}>
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
    </EmailLayout>
  );
}

const es = {
  preview: 'Nuevo mensaje de contacto',
  title: 'Nuevo prospecto desde el sitio web',
  reference: 'Referencia',
  name: 'Nombre',
  email: 'Correo',
  phone: 'Tel\u00e9fono',
  company: 'Empresa o proyecto',
  stage: 'Etapa del proyecto',
  options: 'Servicios de inter\u00e9s',
  message: 'Mensaje',
  notProvided: 'No proporcionado',
};

const en = {
  preview: 'New contact message',
  title: 'New lead from the website',
  reference: 'Reference',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company or project',
  stage: 'Project stage',
  options: 'Services of interest',
  message: 'Message',
  notProvided: 'Not provided',
};
