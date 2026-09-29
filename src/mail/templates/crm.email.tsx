import { Button, Section, Text } from '@react-email/components';
import { EmailLayout, styles } from './email-layout';

export interface CrmEmailTemplateProps {
  subject: string;
  content: string;
  locale: 'es' | 'en';
}

export function CrmEmailTemplate({
  subject,
  content,
  locale,
}: CrmEmailTemplateProps) {
  const copy =
    locale === 'en'
      ? {
          eyebrow: 'A message from MayCloud',
          invitation: 'Discover more about our digital solutions.',
          button: 'Visit MayCloud',
          closing: 'Thank you for your time.',
        }
      : {
          eyebrow: 'Un mensaje de MayCloud',
          invitation: 'Conoce más sobre nuestras soluciones digitales.',
          button: 'Visita MayCloud',
          closing: 'Gracias por tu tiempo.',
        };

  return (
    <EmailLayout
      preview={subject}
      eyebrow={copy.eyebrow}
      title={subject}
      locale={locale}
    >
      <Text style={styles.message}>{content}</Text>

      <Text style={styles.crmInvitation}>{copy.invitation}</Text>

      <Section style={styles.buttonContainer}>
        <Button href="https://maycloud.mx" style={styles.button}>
          {copy.button}
        </Button>
      </Section>

      <Text style={styles.crmClosing}>{copy.closing}</Text>
    </EmailLayout>
  );
}
