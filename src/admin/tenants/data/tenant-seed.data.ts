export interface SeedItem {
  name: string;
  description: string;
}

export const DEFAULT_DEPARTMENTS: SeedItem[] = [
  {
    name: 'Customer Support',
    description: 'General help desk and customer inquiries',
  },
  {
    name: 'Operations & Logistics',
    description: 'Package tracking, dispatch and delivery issues',
  },
  {
    name: 'Billing & Finance',
    description: 'Invoicing, COD remittance and payment issues',
  },
];

export const DEFAULT_TICKET_CATEGORIES: SeedItem[] = [
  {
    name: 'General Inquiry',
    description: 'Questions regarding platform services and general support',
  },
  {
    name: 'Delivery / Dispatch Issue',
    description: 'Delays, wrong address, lost or returned packages',
  },
  {
    name: 'COD & Payment Inquiry',
    description: 'COD reconciliation, payment remittance inquiries',
  },
  {
    name: 'Damaged / Missing Items',
    description: 'Damaged parcels or missing goods reporting',
  },
];

export const DEFAULT_KB_CATEGORIES: SeedItem[] = [
  {
    name: 'Frequently Asked Questions (FAQ)',
    description: 'Quick answers to common questions',
  },
  {
    name: 'Operational Policies',
    description: 'Guidelines on delivery terms, claims and returns',
  },
  {
    name: 'Integration & API Guides',
    description: 'Documentation for connecting external applications',
  },
];

