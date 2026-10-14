import test from 'node:test';
import assert from 'node:assert/strict';
import { getQuotationAccountingTotal, validateQuotationAccounting } from './quotationAccounting.js';

const valid = {
  totalPrice: 312.5,
  originalTotalPrice: 362.5,
  exactPricingBreakdown: { pricingScope: 'quotation', grandTotal: 312.5 },
  originalPricingBreakdown: { grandTotal: 362.5 },
  quotationData: {
    customAddons: [{ description: 'HDMI extender', price: 12.5 }],
    lineItems: [
      { pricing: { grandTotal: 100 }, discount: { originalGrandTotal: 150 } },
      { pricing: { grandTotal: 200 } }
    ]
  }
};

test('accepts a reconciled multi-product quotation', () => {
  assert.equal(validateQuotationAccounting(valid), null);
});
test('rejects a stale quote total', () => {
  assert.match(validateQuotationAccounting({ ...valid, totalPrice: 999 }), /does not match/);
});
test('rejects a false original total', () => {
  assert.match(validateQuotationAccounting({ ...valid, originalTotalPrice: 312.5 }), /Original quotation total/);
});
test('rejects a hybrid or stale breakdown total', () => {
  assert.match(validateQuotationAccounting({ ...valid, exactPricingBreakdown: { grandTotal: 100 } }), /breakdown/);
});
test('rejects a primary-line breakdown for a multi-product quote', () => {
  assert.match(validateQuotationAccounting({ ...valid, exactPricingBreakdown: { grandTotal: 312.5, subtotal: 80 } }), /whole quotation/);
});
test('rejects a line whose components do not sum to its total', () => {
  const quotationData = { ...valid.quotationData, lineItems: [
    { pricing: { grandTotal: 100, productTotal: 10, processorTotal: 20, structureTotal: 0, installationTotal: 0, addonsTotal: 0 } },
    valid.quotationData.lineItems[1]
  ] };
  assert.match(validateQuotationAccounting({ ...valid, quotationData }), /components/);
});
test('rejects invalid line prices', () => {
  const quotationData = { ...valid.quotationData, lineItems: [{ pricing: { grandTotal: null } }] };
  assert.match(validateQuotationAccounting({ ...valid, quotationData }), /no valid grand total/);
});
test('validates a partial price update against existing lines', () => {
  assert.match(validateQuotationAccounting({ totalPrice: 999 }, valid), /does not match/);
});
test('discounted PDF update must carry the selected quotation lines and original total', () => {
  const previous = {
    totalPrice: 1200000,
    originalTotalPrice: 8394112,
    quotationData: { lineItems: [{ pricing: { grandTotal: 1200000 }, discount: { originalGrandTotal: 8394112 } }] }
  };
  assert.match(validateQuotationAccounting({ totalPrice: 1200000, originalTotalPrice: 1200000 }, previous),
    /Original quotation total/);
  const updated = {
    totalPrice: 1200000,
    originalTotalPrice: 8394112,
    exactPricingBreakdown: { grandTotal: 1200000 },
    originalPricingBreakdown: { grandTotal: 8394112 },
    quotationData: { lineItems: previous.quotationData.lineItems }
  };
  assert.equal(validateQuotationAccounting(updated, previous), null);
});
test('dashboard read repairs an older stale stored total', () => {
  assert.equal(getQuotationAccountingTotal({ ...valid, totalPrice: 999 }), 312.5);
});
test('allows an unrelated update on a legacy quotation', () => {
  assert.equal(validateQuotationAccounting({ message: 'Updated note' }, valid), null);
});
test('reconciles a single-product PDF save without line snapshots', () => {
  const single = { totalPrice: 112.5, exactPricingBreakdown: {
    productTotal: 80, processorTotal: 20, structureTotal: 0, installationTotal: 0,
    addonsTotal: 0, customAddonsIncludedInGrandTotal: true, grandTotal: 112.5
  }, quotationData: { customAddons: [{ description: 'Cable', price: 12.5 }] } };
  assert.equal(validateQuotationAccounting(single), null);
  assert.match(validateQuotationAccounting({ ...single, totalPrice: 999 }), /pricing breakdown/);
});
