import { LegalPage } from '../components/legal/LegalPage';

const PRIVACY_EMAIL = 'yash.saxena1@outlook.com';

const privacySections = [
  {
    id: 'general',
    heading: '1. General',
    paragraphs: [
      'This Privacy Policy explains how MyAvail collects, stores, and uses personal information when someone visits this website, joins the early access list, contacts us, or later participates in a beta.',
      'MyAvail is being developed as a cycle-aware readiness app for women who train. Because the product may involve health-adjacent and cycle-related information, privacy should be treated as a core product requirement.',
      'This policy is written for the current pre-launch website and early access stage. It should be reviewed by a qualified privacy professional before production health, wearable, payment, or sensitive user data is processed.',
    ],
  },
  {
    id: 'information-collected',
    heading: '2. Information we collect',
    paragraphs: [
      'At the current website stage, MyAvail may collect contact information such as name, email address, and messages sent to us.',
      'If payment is later connected through Stripe, payment details should be processed by Stripe. MyAvail should receive payment status, customer identifiers, receipts, and related checkout metadata rather than full card details.',
      'In a future beta, MyAvail may ask for optional onboarding and check-in information such as training background, sleep, fatigue, soreness, perceived readiness, period start or end taps, and wearable signals where a user chooses to connect them.',
    ],
  },
  {
    id: 'legal-basis',
    heading: '3. Legal basis for processing',
    paragraphs: [
      'Where UK GDPR or GDPR applies, MyAvail should identify an appropriate legal basis before processing personal data. At the website and early access stage, this may include consent, contract-related steps requested by the user, and legitimate interests such as operating the website and managing demand.',
      'If future beta features process health-adjacent, cycle, contraception, wearable, or other special-category data, MyAvail should rely on explicit consent or another appropriate special-category condition before that processing begins.',
      'This section reflects the intended pre-launch approach and should be reviewed before production sensitive data is collected.',
    ],
  },
  {
    id: 'how-we-use',
    heading: '4. How we use information',
    paragraphs: [
      'We use website and early access information to manage the waitlist, understand demand, respond to users, detect duplicate signups, and plan beta access.',
      'If payment reservations are enabled, we may use payment status to confirm early access reservations, send receipts or confirmations, and manage refunds or credits where applicable.',
      'Future product information should be used to provide readiness context, improve personal baseline modelling, and make the product more useful. It should not be used to diagnose, treat, or replace professional advice.',
    ],
  },
  {
    id: 'sharing',
    heading: '5. Sharing and processors',
    paragraphs: [
      'We do not sell identifiable personal data.',
      'We may use service providers for hosting, analytics, email, forms, payments, infrastructure, security, and product operations. These providers should only process information needed to provide their services.',
      'If aggregated or anonymised information is used for product learning or research-grade insight, it should be handled so it no longer identifies an individual user.',
    ],
  },
  {
    id: 'cookies',
    heading: '6. Cookies, local storage, and analytics',
    paragraphs: [
      'This website may use essential local storage or cookies to keep the site working, remember preferences, and support early access form behaviour.',
      'With consent, this website uses Vercel Web Analytics to understand aggregated page views and selected interactions such as early-access actions, FAQ opens, audience selections, and contact clicks.',
      'Analytics are disabled unless a visitor accepts them. We do not send names, email addresses, health information, cycle data, or free-text form content to analytics.',
    ],
  },
  {
    id: 'sensitive-data',
    heading: '7. Health-adjacent and cycle data',
    paragraphs: [
      'Cycle, contraception, wearable, and readiness information can be sensitive. Any future collection of this information should be optional, clearly explained, and limited to what is needed for the product.',
      'MyAvail should present readiness as context and insight. It should not automatically expose sensitive cycle or health-adjacent information to another person without explicit permission.',
    ],
  },
  {
    id: 'retention',
    heading: '8. Data retention',
    paragraphs: [
      'MyAvail should keep personal data only for as long as needed for the purpose it was collected, including website operation, early access management, communications, payment reservation records, legal obligations, security, and product improvement.',
      'Waitlist and early access records should be reviewed periodically and deleted or anonymised when they are no longer needed. Future production retention periods should be documented before beta launch.',
      'Where data has been anonymised and aggregated so that it no longer identifies an individual, it may not be possible to remove one person\'s contribution from that aggregate record.',
    ],
  },
  {
    id: 'security',
    heading: '9. Security',
    paragraphs: [
      'MyAvail should use appropriate technical and organisational measures to protect personal data, including encrypted transmission, access controls, limited internal access, and careful separation of sensitive user inputs from public or marketing systems.',
      'Before processing production health-adjacent or wearable data, MyAvail should complete appropriate security, privacy, and data protection review.',
    ],
  },
  {
    id: 'international-transfers',
    heading: '10. International data transfers',
    paragraphs: [
      'Some service providers, such as hosting, payment, analytics, email, or infrastructure providers, may process data outside the United Kingdom or European Economic Area.',
      'Where international transfers occur, MyAvail should use appropriate safeguards required by applicable data protection law, such as adequacy decisions, standard contractual clauses, or equivalent transfer mechanisms.',
    ],
  },
  {
    id: 'age',
    heading: '11. Age and children',
    paragraphs: [
      'The current early access website is intended for adults. MyAvail should not knowingly collect personal data from children through the early access flow.',
      'Before launching any product experience for younger users, MyAvail should define the minimum age, parental or guardian consent approach, and any additional safeguards required for health-adjacent data.',
    ],
  },
  {
    id: 'rights',
    heading: '12. Your rights',
    paragraphs: [
      'Depending on applicable law, users may have rights to access, correct, delete, restrict, object to, or receive a copy of their personal information.',
      'Where processing relies on consent, users should be able to withdraw consent. Withdrawal does not affect processing that happened lawfully before withdrawal.',
      `Privacy requests can be sent to ${PRIVACY_EMAIL}.`,
    ],
  },
  {
    id: 'changes',
    heading: '13. Changes to this policy',
    paragraphs: [
      'MyAvail may update this Privacy Policy as the product moves from pre-launch website to beta and production services.',
      'When material changes are made, the last updated date above should be revised and, where appropriate, users should be notified through the website, email, or product experience.',
    ],
  },
  {
    id: 'contact',
    heading: '14. Contact',
    paragraphs: [
      `For privacy questions, data requests, or concerns, contact MyAvail at ${PRIVACY_EMAIL}.`,
    ],
  },
];

export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="How MyAvail handles website, early access, payment-reservation, and future readiness-app data."
      updated="Last updated 10 August 2026"
      sections={privacySections}
    />
  );
}
