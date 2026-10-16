import test from 'node:test';
import assert from 'node:assert/strict';
import { sortCustomersByNewestQuotation } from './quotationListOrder.js';

test('newest createdAt is first and updatedAt does not reorder', () => {
  const customers = sortCustomersByNewestQuotation([
    {
      customerName: 'Older client',
      quotations: [
        {
          quotationId: 'ORION/2026/10/ANSHIKA/001',
          createdAt: '2026-10-10T06:13:11.359Z',
          updatedAt: '2026-10-16T12:00:00.000Z'
        }
      ]
    },
    {
      customerName: 'Newest client',
      quotations: [
        {
          quotationId: 'ORION/2026/10/ANSHIKA/012',
          createdAt: '2026-10-13T08:00:00.000Z'
        },
        {
          quotationId: 'ORION/2026/10/ANSHIKA/013',
          createdAt: '2026-10-13T09:46:13.424Z'
        },
        {
          quotationId: 'ORION/2026/10/ANSHIKA/013B',
          createdAt: '2026-10-13T09:46:13.424Z'
        },
        {
          quotationId: 'ORION/2026/10/ANSHIKA/000',
          createdAt: null
        }
      ]
    }
  ]);

  assert.equal(customers[0].customerName, 'Newest client');
  assert.deepEqual(
    customers[0].quotations.map(quotation => quotation.quotationId),
    [
      'ORION/2026/10/ANSHIKA/013B',
      'ORION/2026/10/ANSHIKA/013',
      'ORION/2026/10/ANSHIKA/012',
      'ORION/2026/10/ANSHIKA/000'
    ]
  );
  assert.equal(customers[1].quotations[0].quotationId, 'ORION/2026/10/ANSHIKA/001');
});
