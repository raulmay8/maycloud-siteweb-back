import { Text } from '@react-email/components';
import { EmailLayout, styles } from './email-layout';

export interface CrmEmailTemplateProps {
  subject: string;
  content: string;
}

export function CrmEmailTemplate({ subject, content }: CrmEmailTemplateProps) {
  return (
    <EmailLayout preview={subject} title={subject} locale="es">
      <Text style={styles.message}>{content}</Text>
    </EmailLayout>
  );
}
