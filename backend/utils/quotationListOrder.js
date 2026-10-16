/** Newest createdAt first. Invalid dates sort last. Ties use quotation ID descending. */
export function compareQuotationsByCreatedAtDesc(a, b) {
  const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : NaN;
  const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : NaN;
  const aValid = Number.isFinite(aTime);
  const bValid = Number.isFinite(bTime);
  if (!aValid && !bValid) {
    return String(b?.quotationId || '').localeCompare(String(a?.quotationId || ''));
  }
  if (!aValid) return 1;
  if (!bValid) return -1;
  if (aTime !== bTime) return bTime - aTime;
  return String(b?.quotationId || '').localeCompare(String(a?.quotationId || ''));
}

export function sortCustomersByNewestQuotation(customers) {
  return [...customers]
    .map(customer => ({
      ...customer,
      quotations: [...(customer.quotations || [])].sort(compareQuotationsByCreatedAtDesc)
    }))
    .sort((a, b) => {
      const byQuote = compareQuotationsByCreatedAtDesc(a.quotations[0] || {}, b.quotations[0] || {});
      if (byQuote !== 0) return byQuote;
      return String(a.customerName || '').localeCompare(String(b.customerName || ''));
    });
}
