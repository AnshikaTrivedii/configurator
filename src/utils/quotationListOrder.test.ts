/**
 * Sales dashboard quotation order and search.
 * Run: node --import tsx src/utils/quotationListOrder.test.ts
 */

import {
  compareQuotationsByCreatedAtDesc,
  expandCustomersByQuotationDate,
  filterCustomersByQuotationSearch,
  sortCustomersByNewestQuotation
} from './quotationLineItems';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error('FAIL:', message);
}

const older = {
  quotationId: 'ORION/2026/10/ANSHIKA/001',
  createdAt: '2026-10-10T06:13:11.359Z',
  updatedAt: '2026-10-16T12:00:00.000Z',
  discountApplied: true
};
const middle = {
  quotationId: 'ORION/2026/10/ANSHIKA/012',
  createdAt: '2026-10-13T08:00:00.000Z',
  updatedAt: '2026-10-13T08:00:00.000Z'
};
const newest = {
  quotationId: 'ORION/2026/10/ANSHIKA/013',
  createdAt: '2026-10-13T09:46:13.424Z',
  updatedAt: '2026-10-13T09:46:13.424Z'
};
const sameTimeLowerId = {
  quotationId: 'ORION/2026/10/ANSHIKA/010',
  createdAt: '2026-10-13T09:46:13.424Z'
};
const missingDate = {
  quotationId: 'ORION/2026/10/ANSHIKA/000',
  createdAt: 'not-a-date'
};

const customers = [
  {
    customerName: 'Anshiiii',
    customerEmail: 'anshiiii@example.com',
    customerPhone: '999',
    company: 'Orion Displays',
    quotations: [older, middle]
  },
  {
    customerName: 'meow',
    customerEmail: 'meow@example.com',
    customerPhone: '111',
    company: 'Acme Lighting',
    quotations: [newest, sameTimeLowerId, missingDate]
  }
];

const sorted = sortCustomersByNewestQuotation(customers);
assert(sorted[0].customerName === 'meow', 'customer with the newest quotation is first');
assert(
  sorted[0].quotations.map(q => q.quotationId).join(',') ===
    'ORION/2026/10/ANSHIKA/013,ORION/2026/10/ANSHIKA/010,ORION/2026/10/ANSHIKA/000',
  'newest createdAt first, quotation ID breaks ties, invalid dates last'
);
assert(
  sorted[1].quotations.map(q => q.quotationId).join(',') ===
    'ORION/2026/10/ANSHIKA/012,ORION/2026/10/ANSHIKA/001',
  'a later updatedAt does not move an older quotation above a newer one'
);
assert(compareQuotationsByCreatedAtDesc(older, newest) > 0, 'older createdAt sorts after newer createdAt');
assert(compareQuotationsByCreatedAtDesc(missingDate, older) > 0, 'invalid timestamp sorts after a valid one');

const byId = filterCustomersByQuotationSearch(customers, '  anshika/013  ', 'Anshika Trivedi');
assert(byId.length === 1 && byId[0].quotations.length === 1, 'quotation ID search returns only the matching quotation');
assert(byId[0].quotations[0].quotationId.endsWith('/013'), 'ID search is case-insensitive and trims spaces');

const byCustomer = filterCustomersByQuotationSearch(customers, 'MEOW', 'Anshika Trivedi');
assert(byCustomer.length === 1 && byCustomer[0].quotations.length === 3, 'customer name search keeps that customer quotations');
assert(byCustomer[0].quotations[0].quotationId.endsWith('/013'), 'filtered customer quotations stay newest first');

const byCompany = filterCustomersByQuotationSearch(customers, ' orion displays ', 'Anshika Trivedi');
assert(byCompany.length === 1 && byCompany[0].customerName === 'Anshiiii', 'company search matches the client company');

const bySales = filterCustomersByQuotationSearch(customers, 'anshika trivedi', 'Anshika Trivedi');
assert(bySales.length === 2, 'salesperson name search returns every quotation for that salesperson');
assert(bySales[0].quotations[0].quotationId.endsWith('/013'), 'salesperson search keeps newest-first order');

const none = filterCustomersByQuotationSearch(customers, 'does-not-exist', 'Anshika Trivedi');
assert(none.length === 0, 'unknown search returns no quotations');

const cleared = filterCustomersByQuotationSearch(customers, '   ', 'Anshika Trivedi');
assert(cleared.length === 2 && cleared[0].quotations.length === 3, 'blank search returns the full newest-first list');

const flat = expandCustomersByQuotationDate(customers);
assert(
  flat.map(row => row.quotations[0].quotationId).join(',') ===
    [
      'ORION/2026/10/ANSHIKA/013',
      'ORION/2026/10/ANSHIKA/010',
      'ORION/2026/10/ANSHIKA/012',
      'ORION/2026/10/ANSHIKA/001',
      'ORION/2026/10/ANSHIKA/000'
    ].join(','),
  'a customer with a new quotation does not keep that customer older quotations above newer quotations for other customers'
);
assert(flat.every(row => row.quotations.length === 1), 'each visible row is one quotation');

if (failed > 0) {
  console.error(`${passed} passed, ${failed} failed`);
  process.exit(1);
}
console.log(`${passed} passed`);
