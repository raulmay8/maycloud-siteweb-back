import { ContactCustomerEmail } from '../src/mail/templates/contact-customer.email';
import { contactEn } from './fixtures/contact';

export default function ContactCustomerEnglishPreview() {
  return <ContactCustomerEmail data={contactEn} />;
}
