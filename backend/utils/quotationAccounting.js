/** Validate client accounting against the immutable line-price snapshots being saved. */
export function validateQuotationAccounting(incoming, previous = {}) {
  const pricingTouched = !previous ||
    incoming.totalPrice !== undefined || incoming.originalTotalPrice !== undefined ||
    incoming.exactPricingBreakdown !== undefined || incoming.originalPricingBreakdown !== undefined ||
    incoming.quotationData?.lineItems !== undefined || incoming.quotationData?.customAddons !== undefined;
  if (!pricingTouched) return null;

  const oldData = previous?.quotationData || {};
  const newData = incoming.quotationData || {};
  const lines = newData.lineItems ?? oldData.lineItems;
  const breakdown = incoming.exactPricingBreakdown ?? previous?.exactPricingBreakdown;
  const addons = newData.customAddons ?? oldData.customAddons ?? breakdown?.customAddons ?? [];
  if (!Array.isArray(addons)) return 'Quotation add-ons must be a list.';
  let addonsTotal = 0;
  for (const addon of addons) {
    if (typeof addon?.price !== 'number' || !Number.isFinite(addon.price) || addon.price < 0) {
      return 'A quotation add-on has an invalid price.';
    }
    addonsTotal += addon.price;
  }
  addonsTotal = Math.round(addonsTotal * 100) / 100;

  const total = incoming.totalPrice ?? previous?.totalPrice;
  if (!Array.isArray(lines) || lines.length === 0) {
    // Legacy single-product/PDF saves have no line snapshots. Reconcile every
    // component available, while allowing unpriced public quote requests.
    if (!breakdown) return null;
    if (typeof total !== 'number' || !Number.isFinite(total) ||
        typeof breakdown.grandTotal !== 'number' || !Number.isFinite(breakdown.grandTotal) ||
        Math.abs(total - breakdown.grandTotal) > 0.01) {
      return 'Quotation total does not match its pricing breakdown.';
    }
    const fields = ['productTotal', 'processorTotal', 'structureTotal', 'installationTotal', 'addonsTotal'];
    if (fields.some(field => breakdown[field] !== undefined && !Number.isFinite(breakdown[field]))) {
      return 'Quotation breakdown has an invalid pricing component.';
    }
    if (fields.every(field => typeof breakdown[field] === 'number')) {
      const components = fields.reduce((sum, field) => sum + breakdown[field], 0);
      const expected = Math.round(components) +
        (breakdown.customAddonsIncludedInGrandTotal ? addonsTotal : 0);
      if (Math.abs(total - expected) > 0.01) return 'Quotation total does not match its pricing components.';
    }
    return null;
  }

  let lineTotal = 0;
  let originalLineTotal = 0;
  let productSubtotal = 0;
  let completeSubtotals = true;
  for (const line of lines) {
    const price = line?.pricing?.grandTotal;
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || line?.pricing?.isAvailable === false) {
      return 'A quotation line has no valid grand total.';
    }
    if (line.pricing.customAddonsIncludedInGrandTotal && line.pricing.customAddonsTotal > 0) {
      return 'Quotation-level add-ons must not be included in a line item price.';
    }
    lineTotal += price;
    const componentFields = ['productTotal', 'processorTotal', 'structureTotal', 'installationTotal', 'addonsTotal'];
    if (componentFields.some(field => line.pricing[field] !== undefined && !Number.isFinite(line.pricing[field]))) {
      return 'A quotation line has an invalid pricing component.';
    }
    if (componentFields.every(field => typeof line.pricing[field] === 'number')) {
      const componentTotal = Math.round(componentFields.reduce((sum, field) => sum + line.pricing[field], 0));
      if (Math.abs(componentTotal - price) > 0.01) return 'A quotation line total does not match its components.';
    }
    if (typeof line.pricing.productSubtotal === 'number' && Number.isFinite(line.pricing.productSubtotal)) productSubtotal += line.pricing.productSubtotal;
    else completeSubtotals = false;
    const original = line?.discount?.originalGrandTotal;
    if (original !== undefined && (typeof original !== 'number' || !Number.isFinite(original) || original < 0)) {
      return 'A quotation line has an invalid original total.';
    }
    originalLineTotal += original ?? price;
  }
  const expected = Math.round(lineTotal) + addonsTotal;
  const originalExpected = Math.round(originalLineTotal) + addonsTotal;
  if (typeof total !== 'number' || !Number.isFinite(total) || Math.abs(total - expected) > 0.01) {
    return `Quotation total does not match the line items and add-ons (expected ${expected}).`;
  }
  if (breakdown?.grandTotal !== undefined &&
      (typeof breakdown.grandTotal !== 'number' || !Number.isFinite(breakdown.grandTotal) ||
        Math.abs(breakdown.grandTotal - expected) > 0.01)) {
    return 'Quotation breakdown grand total does not match the line items.';
  }
  if (lines.length > 1 && incoming.exactPricingBreakdown && breakdown?.pricingScope !== 'quotation') {
    return 'Multi-product breakdown must describe the whole quotation, not one product.';
  }
  if (completeSubtotals && breakdown?.subtotal !== undefined &&
      (typeof breakdown.subtotal !== 'number' || !Number.isFinite(breakdown.subtotal) ||
        Math.abs(breakdown.subtotal - productSubtotal) > 0.01)) {
    return 'Quotation subtotal does not match the line items.';
  }
  const originalTotal = incoming.originalTotalPrice ?? previous?.originalTotalPrice;
  if (originalTotal !== undefined &&
      (typeof originalTotal !== 'number' || !Number.isFinite(originalTotal) ||
        Math.abs(originalTotal - originalExpected) > 0.01)) {
    return `Original quotation total does not match the original line prices (expected ${originalExpected}).`;
  }
  const originalBreakdown = incoming.originalPricingBreakdown ?? previous?.originalPricingBreakdown;
  if (originalBreakdown?.grandTotal !== undefined &&
      (typeof originalBreakdown.grandTotal !== 'number' || !Number.isFinite(originalBreakdown.grandTotal) ||
        Math.abs(originalBreakdown.grandTotal - originalExpected) > 0.01)) {
    return 'Original quotation breakdown does not match the original line prices.';
  }
  return null;
}

/** Read-time repair for historical quotes with complete line snapshots. Does not modify the database. */
export function getQuotationAccountingTotal(quotation) {
  const lines = quotation?.quotationData?.lineItems;
  if (!Array.isArray(lines) || lines.length === 0 || !lines.every(line =>
    typeof line?.pricing?.grandTotal === 'number' && Number.isFinite(line.pricing.grandTotal) &&
    line.pricing.grandTotal >= 0 &&
    !(line.pricing.customAddonsIncludedInGrandTotal && line.pricing.customAddonsTotal > 0)
  )) return Number(quotation?.totalPrice) || 0;

  const addons = Array.isArray(quotation?.quotationData?.customAddons)
    ? quotation.quotationData.customAddons
    : (Array.isArray(quotation?.exactPricingBreakdown?.customAddons)
      ? quotation.exactPricingBreakdown.customAddons : []);
  if (!addons.every(addon => typeof addon?.price === 'number' && Number.isFinite(addon.price) && addon.price >= 0)) {
    return Number(quotation?.totalPrice) || 0;
  }
  const lineSum = Math.round(lines.reduce((sum, line) => sum + line.pricing.grandTotal, 0));
  const addonSum = Math.round(addons.reduce((sum, addon) => sum + addon.price, 0) * 100) / 100;
  return Math.round((lineSum + addonSum) * 100) / 100;
}
