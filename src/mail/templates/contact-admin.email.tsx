import { Button, Section, Text } from '@react-email/components';

import type { ContactEmailData } from '../mail.types';
import { EmailLayout, styles } from './email-layout';

export function ContactAdminEmail({ data }: { data: ContactEmailData }) {
  const copy = data.locale === 'en' ? en : es;

  const createdAt = new Intl.DateTimeFormat(
    data.locale === 'en' ? 'en-US' : 'es-MX',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Cancun',
    },
  ).format(data.createdAt);

  const fields: Array<[string, string]> = [
    [copy.reference, data.reference],
    [copy.date, createdAt],
    [copy.name, data.name],
    [copy.email, data.email],
    [copy.phone, data.phone ?? copy.notProvided],
    [copy.company, data.companyOrProject ?? copy.notProvided],
    [copy.stage, data.projectStage],
    [copy.options, data.developmentOptions.join(', ')],
  ];

  const replySubject =
    data.locale === 'en'
      ? `Re: Your MayCloud inquiry - ${data.reference}`
      : `Re: Tu solicitud en MayCloud - ${data.reference}`;

  const mailtoUrl = `mailto:${data.email}?subject=${encodeURIComponent(replySubject)}`;

  return (
    <EmailLayout
      preview={copy.preview}
      eyebrow={copy.eyebrow}
      title={copy.title}
      locale={data.locale}
    >
      <Text style={styles.paragraph}>{copy.introduction}</Text>

      <Section style={styles.panel}>
        <Text style={styles.panelTitle}>{copy.contactDetails}</Text>

        {fields.map(([label, value]) => (
          <Section key={label}>
            <Text style={styles.label}>{label}</Text>

            <Text style={styles.value}>{value}</Text>
          </Section>
        ))}

        <Text style={styles.label}>{copy.message}</Text>

        <Text style={styles.message}>{data.message}</Text>
      </Section>

      <Section style={styles.responsePanel}>
        <Text style={styles.responseTitle}>{copy.actionTitle}</Text>

        <Text style={styles.responseText}>{copy.actionDescription}</Text>
      </Section>

      <Section style={styles.buttonContainer}>
        <Button href={mailtoUrl} style={styles.button}>
          {copy.reply}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const es = {
  preview: 'Nuevo mensaje de contacto recibido',
  eyebrow: 'Nuevo prospecto',
  title: 'Nuevo contacto desde el sitio web',

  introduction: 'Se recibió una nueva solicitud de contacto en MayCloud.',

  contactDetails: 'Datos del contacto',

  reference: 'Referencia',
  date: 'Fecha',
  name: 'Nombre',
  email: 'Correo',
  phone: 'Teléfono',
  company: 'Empresa o proyecto',
  stage: 'Etapa del proyecto',
  options: 'Servicios de interés',
  message: 'Mensaje',

  notProvided: 'No proporcionado',

  actionTitle: 'Siguiente acción',
  actionDescription:
    'Puedes responder directamente a este correo o contactar al prospecto usando los datos proporcionados.',

  reply: 'Responder al prospecto',
};

const en = {
  preview: 'New contact message received',
  eyebrow: 'New lead',
  title: 'New contact from the website',

  introduction: 'A new contact request was received through MayCloud.',

  contactDetails: 'Contact details',

  reference: 'Reference',
  date: 'Date',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company or project',
  stage: 'Project stage',
  options: 'Services of interest',
  message: 'Message',

  notProvided: 'Not provided',

  actionTitle: 'Next action',
  actionDescription:
    'You can reply directly to this email or contact the lead using the information provided.',

  reply: 'Reply to lead',
};
