import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

interface EmailLayoutProps {
  preview: string;
  title: string;
  eyebrow?: string;
  locale?: 'es' | 'en';
  children: ReactNode;
}

const MAYCLOUD_LOGO_URL =
  'https://res.cloudinary.com/h1obbkau/image/upload/v1787624724/logo-mauricio_jpg_578x528.jpg';

export function EmailLayout({
  preview,
  title,
  eyebrow,
  locale = 'es',
  children,
}: EmailLayoutProps) {
  const copy =
    locale === 'en'
      ? {
          taglineLine1: 'Digital solutions',
          taglineLine2: 'to help your business grow',
          footerSecondary: 'Custom digital solutions.',
        }
      : {
          taglineLine1: 'Soluciones digitales',
          taglineLine2: 'para hacer crecer tu negocio',
          footerSecondary: 'Soluciones digitales hechas a la medida.',
        };

  return (
    <Html lang={locale}>
      <Head />

      <Preview>{preview}</Preview>

      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Row>
              <Column style={styles.logoColumn}>
                <Img
                  src={MAYCLOUD_LOGO_URL}
                  alt="MayCloud"
                  width="105"
                  style={styles.logo}
                />
              </Column>

              <Column style={styles.taglineColumn}>
                <Text style={styles.tagline}>
                  {copy.taglineLine1}
                  <br />
                  {copy.taglineLine2}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Main content */}
          <Section style={styles.content}>
            {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}

            <Heading style={styles.heading}>{title}</Heading>

            {children}
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              MayCloud · contacto@maycloud.mx · maycloud.mx
            </Text>

            <Text style={styles.footerSecondary}>{copy.footerSecondary}</Text>
          </Section>
        </Container>

        <Text style={styles.outsideFooter}>
          © {new Date().getFullYear()} MayCloud
        </Text>
      </Body>
    </Html>
  );
}

export const styles = {
  body: {
    margin: '0',
    padding: '40px 12px',
    backgroundColor: '#f3f6fa',
    color: '#0f172a',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },

  container: {
    maxWidth: '640px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    overflow: 'hidden',
  },

  /* Header */

  header: {
    padding: '20px 32px',
    borderBottom: '1px solid #e2e8f0',
  },

  logoColumn: {
    width: '50%',
    verticalAlign: 'middle' as const,
  },

  taglineColumn: {
    width: '50%',
    verticalAlign: 'middle' as const,
    textAlign: 'right' as const,
  },

  logo: {
    display: 'block',
    width: '105px',
    maxWidth: '100%',
    height: 'auto',
  },

  tagline: {
    margin: '0',
    color: '#64748b',
    fontSize: '11px',
    lineHeight: '1.45',
    textAlign: 'right' as const,
  },

  /* Main content */

  content: {
    padding: '34px 32px 12px',
  },

  eyebrow: {
    display: 'inline-block',
    margin: '0 0 16px',
    padding: '7px 12px',
    borderRadius: '999px',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontSize: '13px',
    fontWeight: '700',
  },

  heading: {
    margin: '0 0 18px',
    color: '#0f172a',
    fontSize: '30px',
    lineHeight: '1.2',
    fontWeight: '700',
  },

  paragraph: {
    margin: '0 0 16px',
    color: '#475569',
    fontSize: '16px',
    lineHeight: '1.65',
  },

  /* Generic panel */

  panel: {
    margin: '24px 0',
    padding: '22px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
  },

  panelTitle: {
    margin: '0 0 18px',
    color: '#0f172a',
    fontSize: '19px',
    lineHeight: '1.4',
    fontWeight: '700',
  },

  /* Contact summary */

  label: {
    margin: '16px 0 4px',
    color: '#64748b',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },

  value: {
    margin: '0',
    color: '#0f172a',
    fontSize: '15px',
    lineHeight: '1.5',
  },

  message: {
    margin: '0',
    color: '#0f172a',
    fontSize: '15px',
    lineHeight: '1.65',
    whiteSpace: 'pre-wrap' as const,
  },

  /* What's next */

  stepsPanel: {
    margin: '24px 0',
    padding: '22px',
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: '12px',
  },

  step: {
    margin: '0 0 18px',
  },

  stepLast: {
    margin: '0',
  },

  stepTitle: {
    margin: '0 0 4px',
    color: '#0f172a',
    fontSize: '15px',
    fontWeight: '700',
    lineHeight: '1.5',
  },

  stepDescription: {
    margin: '0',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: '1.55',
  },

  /* Response time */

  responsePanel: {
    margin: '24px 0',
    padding: '18px 20px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    borderRadius: '12px',
  },

  responseTitle: {
    margin: '0 0 5px',
    color: '#166534',
    fontSize: '15px',
    fontWeight: '700',
    lineHeight: '1.5',
  },

  responseText: {
    margin: '0',
    color: '#475569',
    fontSize: '14px',
    lineHeight: '1.55',
  },

  /* Reference */

  reference: {
    margin: '20px 0 0',
    color: '#64748b',
    fontSize: '13px',
    lineHeight: '1.5',
  },

  crmInvitation: {
    margin: '30px 0 8px',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: '1.55',
    textAlign: 'center' as const,
  },

  crmClosing: {
    margin: '18px 0 12px',
    color: '#64748b',
    fontSize: '13px',
    lineHeight: '1.5',
    textAlign: 'center' as const,
  },

  /* CTA */

  buttonContainer: {
    margin: '28px 0 8px',
    textAlign: 'center' as const,
  },

  button: {
    display: 'inline-block',
    padding: '14px 28px',
    backgroundColor: '#0f3b82',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    textDecoration: 'none',
  },

  /* Footer */

  footer: {
    padding: '24px 32px 30px',
  },

  footerText: {
    margin: '0',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
    color: '#64748b',
    fontSize: '12px',
    lineHeight: '1.5',
    textAlign: 'center' as const,
  },

  footerSecondary: {
    margin: '6px 0 0',
    color: '#94a3b8',
    fontSize: '11px',
    lineHeight: '1.5',
    textAlign: 'center' as const,
  },

  outsideFooter: {
    margin: '18px auto 0',
    color: '#94a3b8',
    fontSize: '11px',
    textAlign: 'center' as const,
  },
};
