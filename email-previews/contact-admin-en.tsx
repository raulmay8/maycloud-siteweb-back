import { ContactAdminEmail } from '../src/mail/templates/contact-admin.email';
import { contactEn } from './fixtures/contact';

export default function ContactAdminEnglishPreview() {
  return <ContactAdminEmail data={contactEn} />;
}
