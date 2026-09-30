import { Button, Section, Text } from '@react-email/components';
import type { IOptions } from 'sanitize-html';
import { EmailLayout, styles } from './email-layout';

export interface CrmEmailTemplateProps {
  subject: string;
  content: string;
  locale: 'es' | 'en';
}

const richTextOptions: IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'span',
    'div',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'h1',
    'h2',
    'h3',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'style'],
    '*': ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedStyles: {
    '*': {
      color: [/^#[0-9a-f]{3,8}$/i, /^rgb\([\d\s,.%]+\)$/i],
      'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb\([\d\s,.%]+\)$/i],
      'font-weight': [/^(normal|bold|[1-9]00)$/i],
      'font-style': [/^(normal|italic)$/i],
      'text-decoration': [/^(none|underline|line-through)$/i],
      'text-align': [/^(left|center|right|justify)$/i],
    },
  },
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
  },
};

export function sanitizeCrmEmailContent(content: string) {
  // Lazy loading keeps Jest's CommonJS runtime from eagerly parsing the
  // sanitizer's ESM-only parser when unrelated mail templates are tested.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const sanitizeHtml =
    require('sanitize-html') as typeof import('sanitize-html');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return sanitizeHtml(content, richTextOptions);
}

export function CrmEmailTemplate({
  subject,
  content,
  locale,
}: CrmEmailTemplateProps) {
  const sanitizedContent = sanitizeCrmEmailContent(content);
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
      <div
        style={styles.message}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />

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
