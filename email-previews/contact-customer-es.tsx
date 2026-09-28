import { ContactCustomerEmail } from '../src/mail/templates/contact-customer.email';
import { contactEs } from './fixtures/contact';

export default function ContactCustomerSpanishPreview() {
  return <ContactCustomerEmail data={contactEs} />;
}
