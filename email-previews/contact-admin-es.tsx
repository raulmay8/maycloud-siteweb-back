import { ContactAdminEmail } from '../src/mail/templates/contact-admin.email';
import { contactEs } from './fixtures/contact';

export default function ContactAdminSpanishPreview() {
  return <ContactAdminEmail data={contactEs} />;
}
