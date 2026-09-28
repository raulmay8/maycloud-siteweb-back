import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

interface EmailLayoutProps {
  preview: string;
  title: string;
  children: ReactNode;
}

export function EmailLayout({ preview, title, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.brand}>
            <Text style={styles.brandText}>MayCloud</Text>
          </Section>
          <Heading style={styles.heading}>{title}</Heading>
          {children}
          <Text style={styles.footer}>MayCloud · maycloud.mx</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const styles = {
  body: {
    backgroundColor: '#f4f7fb',
    color: '#172033',
    fontFamily: 'Arial, Helvetica, sans-serif',
    margin: '0',
    padding: '32px 12px',
  },
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e6eaf0',
    borderRadius: '12px',
    margin: '0 auto',
    maxWidth: '600px',
    padding: '32px',
  },
  brand: { marginBottom: '24px' },
  brandText: {
    color: '#2563eb',
    fontSize: '22px',
    fontWeight: '700',
    margin: '0',
  },
  heading: {
    color: '#111827',
    fontSize: '26px',
    lineHeight: '1.25',
    margin: '0 0 24px',
  },
  paragraph: { fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' },
  panel: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    margin: '24px 0',
    padding: '20px',
  },
  label: {
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.04em',
    margin: '16px 0 4px',
    textTransform: 'uppercase' as const,
  },
  value: { fontSize: '15px', lineHeight: '1.5', margin: '0' },
  message: {
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0',
    whiteSpace: 'pre-wrap' as const,
  },
  footer: {
    borderTop: '1px solid #e6eaf0',
    color: '#94a3b8',
    fontSize: '12px',
    margin: '28px 0 0',
    paddingTop: '20px',
  },
};
