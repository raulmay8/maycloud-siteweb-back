import { Button, Section, Text } from '@react-email/components';

import type { ContactEmailData } from '../mail.types';
import { EmailLayout, styles } from './email-layout';

interface ContactCustomerEmailProps {
  data: ContactEmailData;
}

export function ContactCustomerEmail({ data }: ContactCustomerEmailProps) {
  const copy = data.locale === 'en' ? en : es;

  const fields: Array<[string, string]> = [
    [copy.company, data.companyOrProject ?? copy.notProvided],
    [copy.stage, data.projectStage],
    [copy.options, data.developmentOptions.join(', ')],
    [copy.phone, data.phone ?? copy.notProvided],
  ];

  return (
    <EmailLayout
      preview={copy.preview}
      eyebrow={copy.eyebrow}
      title={copy.title}
      locale={data.locale}
    >
      <Text style={styles.paragraph}>{copy.greeting(data.name)}</Text>

      <Text style={styles.paragraph}>{copy.introduction}</Text>

      {/* Qué sigue */}
      <Section style={styles.stepsPanel}>
        <Text style={styles.panelTitle}>{copy.nextTitle}</Text>

        <Section style={styles.step}>
          <Text style={styles.stepTitle}>1. {copy.reviewTitle}</Text>

          <Text style={styles.stepDescription}>{copy.reviewDescription}</Text>
        </Section>

        <Section style={styles.step}>
          <Text style={styles.stepTitle}>2. {copy.replyTitle}</Text>

          <Text style={styles.stepDescription}>{copy.replyDescription}</Text>
        </Section>

        <Section style={styles.stepLast}>
          <Text style={styles.stepTitle}>3. {copy.callTitle}</Text>

          <Text style={styles.stepDescription}>{copy.callDescription}</Text>
        </Section>
      </Section>

      {/* Resumen */}
      <Section style={styles.panel}>
        <Text style={styles.panelTitle}>{copy.summaryTitle}</Text>

        {fields.map(([label, value]) => (
          <Section key={label}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </Section>
        ))}

        <Text style={styles.label}>{copy.message}</Text>

        <Text style={styles.message}>{data.message}</Text>
      </Section>

      {/* Tiempo de respuesta */}
      <Section style={styles.responsePanel}>
        <Text style={styles.responseTitle}>{copy.responseTime}</Text>

        <Text style={styles.responseText}>{copy.responseDescription}</Text>
      </Section>

      {/* Referencia */}
      <Text style={styles.reference}>
        {copy.reference}: <strong>{data.reference}</strong>
      </Text>

      {/* CTA */}
      <Section style={styles.buttonContainer}>
        <Button href="https://maycloud.mx" style={styles.button}>
          {copy.visitWebsite}
        </Button>
      </Section>

      <Text style={styles.paragraph}>{copy.closing}</Text>
    </EmailLayout>
  );
}

const es = {
  preview: 'Hemos recibido tu mensaje en MayCloud',

  eyebrow: 'Confirmación de contacto',

  title: 'Hemos recibido tu mensaje',

  greeting: (name: string) => `Hola ${name}, gracias por escribirnos.`,

  introduction:
    'Hemos recibido la información de tu proyecto y nuestro equipo la revisará para responderte lo antes posible.',

  nextTitle: '¿Qué sigue?',

  reviewTitle: 'Revisaremos tu solicitud',
  reviewDescription:
    'Nuestro equipo analizará la información que nos compartiste.',

  replyTitle: 'Te responderemos por correo',
  replyDescription:
    'Recibirás nuestra respuesta en la dirección de correo que nos proporcionaste.',

  callTitle: 'Si es necesario, coordinaremos una llamada',
  callDescription:
    'Nos pondremos en contacto contigo para definir los siguientes pasos.',

  summaryTitle: 'Resumen de tu mensaje',

  company: 'Empresa o proyecto',
  stage: 'Etapa del proyecto',
  options: 'Servicios de interés',
  phone: 'Teléfono',
  message: 'Tu mensaje',

  notProvided: 'No proporcionado',

  responseTime: 'Tiempo estimado de respuesta: 1 día hábil',

  responseDescription:
    'Nuestro equipo revisará tu solicitud y te responderá lo antes posible.',

  reference: 'Referencia',

  visitWebsite: 'Visitar maycloud.mx',

  closing: 'Gracias por considerar a MayCloud para tu proyecto.',
};

const en = {
  preview: 'We received your message at MayCloud',

  eyebrow: 'Contact confirmation',

  title: 'We received your message',

  greeting: (name: string) => `Hi ${name}, thank you for contacting us.`,

  introduction:
    'We have received your project information and our team will review it so we can get back to you as soon as possible.',

  nextTitle: 'What happens next?',

  reviewTitle: 'We will review your request',
  reviewDescription:
    'Our team will analyze the information you shared with us.',

  replyTitle: 'We will reply by email',
  replyDescription:
    'You will receive our response at the email address you provided.',

  callTitle: 'If needed, we will schedule a call',
  callDescription:
    'We will get in touch with you to coordinate the next steps.',

  summaryTitle: 'Summary of your message',

  company: 'Company or project',
  stage: 'Project stage',
  options: 'Services of interest',
  phone: 'Phone',
  message: 'Your message',

  notProvided: 'Not provided',

  responseTime: 'Estimated response time: 1 business day',

  responseDescription:
    'Our team will review your request and get back to you as soon as possible.',

  reference: 'Reference',

  visitWebsite: 'Visit maycloud.mx',

  closing: 'Thank you for considering MayCloud for your project.',
};
