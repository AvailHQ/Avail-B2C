import { LegalPage } from '../components/legal/LegalPage';

const LEGAL_EMAIL = 'yash.saxena1@outlook.com';

const termsSections = [
  {
    id: 'general',
    heading: '1. General',
    paragraphs: [
      'These Terms describe the rules for using the MyAvail website, joining the early access list, contacting us, and participating in any future early access or beta programme.',
      'The current website is a pre-launch experience. Product features, launch timing, pricing, and availability may change as the product develops.',
    ],
  },
  {
    id: 'not-medical-advice',
    heading: '2. Not medical advice',
    paragraphs: [
      'MyAvail is intended to provide training context and readiness insight. It is not a medical device, diagnostic tool, treatment service, fertility app, or substitute for professional medical advice.',
      'Users remain responsible for training decisions. If something feels medically concerning, users should speak with an appropriate qualified professional.',
    ],
  },
  {
    id: 'early-access',
    heading: '3. Early access and reservations',
    paragraphs: [
      'Joining the early access list does not guarantee access by a specific date. Access may be limited by product readiness, cohort size, geography, device compatibility, operational capacity, or safety review.',
      'If a paid reservation is introduced, it is a one-time, non-refundable payment. The checkout page should clearly explain the price, what the payment covers, whether it credits toward future subscription fees, and what happens if the product does not launch.',
      'Payment processing should be handled by Stripe or another payment provider. Additional provider terms may apply.',
    ],
  },
  {
    id: 'accounts',
    heading: '4. Accounts and beta participation',
    paragraphs: [
      'Future beta users may need to create an account and provide accurate information. Users are responsible for keeping account credentials secure.',
      'Beta features may be incomplete, experimental, unavailable, or changed without notice. Feedback may be used to improve the product.',
    ],
  },
  {
    id: 'acceptable-use',
    heading: '5. Acceptable use',
    paragraphs: [
      'Users must not misuse the website, interfere with its operation, attempt unauthorised access, submit malicious content, scrape the service in a way that harms availability, or use the service for unlawful purposes.',
    ],
  },
  {
    id: 'intellectual-property',
    heading: '6. Intellectual property',
    paragraphs: [
      'The MyAvail name, brand, website design, copy, graphics, software, and product concepts are owned by MyAvail or its licensors unless otherwise stated.',
      'Users may not copy, modify, distribute, or reverse engineer parts of the website or future product except where allowed by law or written permission.',
    ],
  },
  {
    id: 'liability',
    heading: '7. Availability and liability',
    paragraphs: [
      'The website and any beta product are provided on an as-available basis. We do not promise that the website will be uninterrupted, error-free, or always secure.',
      'To the fullest extent allowed by law, MyAvail is not liable for indirect, incidental, consequential, or special losses arising from use of the website, waitlist, or beta product.',
    ],
  },
  {
    id: 'changes-contact',
    heading: '8. Changes and contact',
    paragraphs: [
      'These Terms may be updated as MyAvail moves from pre-launch website to beta product. The last updated date should be revised when material changes are made.',
      `Questions about these Terms can be sent to ${LEGAL_EMAIL}.`,
    ],
  },
];

export function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="The terms for using the MyAvail website, early access list, and future beta access."
      updated="Last updated 10 August 2026"
      sections={termsSections}
    />
  );
}
