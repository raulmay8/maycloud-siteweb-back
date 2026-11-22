import { Button, Section, Text } from '@react-email/components';

import type { PartnerRegistrationEmailData } from '../mail.types';
import { EmailLayout, styles } from './email-layout';

interface PartnerRegistrationEmailProps {
  data: PartnerRegistrationEmailData;
}

export function PartnerRegistrationEmail({
  data,
}: PartnerRegistrationEmailProps) {
  const copy = data.locale === 'en' ? en : es;

  return (
    <EmailLayout
      preview={copy.preview}
      eyebrow={copy.eyebrow}
      title={copy.title}
      locale={data.locale}
    >
      {/* Saludo */}
      <Text style={styles.paragraph}>{copy.greeting(data.partnerName)}</Text>

      <Text style={styles.paragraph}>{copy.introduction}</Text>

      {/* Siguientes pasos */}
      <Section style={styles.stepsPanel}>
        <Text style={styles.panelTitle}>{copy.nextTitle}</Text>

        <Section style={styles.step}>
          <Text style={styles.stepTitle}>1. {copy.reviewTitle}</Text>

          <Text style={styles.stepDescription}>{copy.reviewDescription}</Text>
        </Section>

        <Section style={styles.step}>
          <Text style={styles.stepTitle}>2. {copy.contactTitle}</Text>

          <Text style={styles.stepDescription}>{copy.contactDescription}</Text>
        </Section>

        <Section style={styles.stepLast}>
          <Text style={styles.stepTitle}>3. {copy.followUpTitle}</Text>

          <Text style={styles.stepDescription}>{copy.followUpDescription}</Text>
        </Section>
      </Section>

      {/* Información importante */}
      <Section style={styles.panel}>
        <Text style={styles.panelTitle}>{copy.importantTitle}</Text>

        <Text style={styles.paragraph}>{copy.importantDescription}</Text>
      </Section>

      {/* Contacto */}
      <Section style={styles.responsePanel}>
        <Text style={styles.responseTitle}>{copy.contactUsTitle}</Text>

        <Text style={styles.responseText}>{copy.contactUsDescription}</Text>
      </Section>

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

// =========================================================
// SPANISH
// =========================================================

const es = {
  preview:
    'Hemos recibido su recomendación en el Programa de Socios de MayCloud',

  eyebrow: 'Programa de Socios',

  title: 'Hemos recibido su recomendación',

  greeting: (name: string) =>
    `Hola ${name}, gracias por participar en nuestro Programa de Socios.`,

  introduction:
    'Hemos recibido correctamente su recomendación. Agradecemos la confianza que ha depositado en MayCloud al compartir una nueva oportunidad de colaboración.',

  nextTitle: '¿Qué sucede ahora?',

  reviewTitle: 'Revisaremos la información',

  reviewDescription:
    'Nuestro equipo revisará los datos proporcionados y evaluará la oportunidad comercial.',

  contactTitle: 'Nos pondremos en contacto si es necesario',

  contactDescription:
    'Si necesitamos información adicional o apoyo para presentar al cliente, nos comunicaremos con usted por correo electrónico.',

  followUpTitle: 'Le informaremos sobre los avances',

  followUpDescription:
    'Cuando exista información relevante sobre su recomendación, nuestro equipo podrá comunicársela directamente.',

  importantTitle: 'Información importante',

  importantDescription:
    'Este correo confirma únicamente la recepción de su recomendación. Su aceptación definitiva y cualquier comisión correspondiente estarán sujetas a las condiciones del Programa de Socios de MayCloud.',

  contactUsTitle: '¿Necesita comunicarse con nosotros?',

  contactUsDescription:
    'Puede escribirnos a contacto@maycloud.mx si tiene alguna consulta relacionada con el programa.',

  visitWebsite: 'Visitar MayCloud',

  closing:
    'Gracias por ayudarnos a conectar con nuevas oportunidades. Esperamos construir una relación de colaboración duradera.',
};

// =========================================================
// ENGLISH
// =========================================================

const en = {
  preview: 'We received your referral through the MayCloud Partner Program',

  eyebrow: 'Partner Program',

  title: 'We received your referral',

  greeting: (name: string) =>
    `Hello ${name}, thank you for participating in our Partner Program.`,

  introduction:
    'We have successfully received your referral. We appreciate your trust in MayCloud and your willingness to share a new business opportunity with us.',

  nextTitle: 'What happens next?',

  reviewTitle: 'We will review the information',

  reviewDescription:
    'Our team will review the submitted details and evaluate the business opportunity.',

  contactTitle: 'We will contact you if needed',

  contactDescription:
    'If we need additional information or your assistance introducing the client, we will contact you by email.',

  followUpTitle: 'We will keep you informed',

  followUpDescription:
    'Our team may contact you when relevant updates about your referral become available.',

  importantTitle: 'Important information',

  importantDescription:
    'This email confirms receipt of your referral only. Final acceptance and any applicable commission are subject to the terms of the MayCloud Partner Program.',

  contactUsTitle: 'Need to get in touch?',

  contactUsDescription:
    'You can contact us at contacto@maycloud.mx if you have any questions about the program.',

  visitWebsite: 'Visit MayCloud',

  closing:
    'Thank you for helping us connect with new opportunities. We look forward to building a lasting partnership.',
};
