/**
 * Sales-entered quotation add-ons (Controller, HDMI Extender, etc.).
 * These are quotation-level flat amounts. They are not Nexa product add-ons
 * and are not multiplied by order quantity.
 */

export interface QuotationAddon {
  description: string;
  price: number;
}

export interface QuotationAddonDraft {
  description: string;
  price: string;
}

export function sanitizeQuotationAddons(input: unknown): QuotationAddon[] {
  if (!Array.isArray(input)) return [];

  const addons: QuotationAddon[] = [];
  for (const row of input) {
    if (!row || typeof row !== 'object') continue;
    const description = String((row as { description?: unknown }).description ?? '').trim();
    const rawPrice = (row as { price?: unknown }).price;
    const priceMissing = rawPrice === '' || rawPrice === null || rawPrice === undefined;
    if (!description || priceMissing) continue;

    const price = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice);
    if (!Number.isFinite(price) || price < 0) continue;

    addons.push({
      description,
      price: Math.round(price * 100) / 100
    });
  }
  return addons;
}

/** First array wins, including an explicit empty list. */
export function readQuotationAddons(...sources: unknown[]): QuotationAddon[] {
  for (const source of sources) {
    if (Array.isArray(source)) return sanitizeQuotationAddons(source);
  }
  return [];
}

export function sumQuotationAddons(addons: QuotationAddon[]): number {
  const sum = addons.reduce((total, addon) => total + addon.price, 0);
  return Math.round(sum * 100) / 100;
}

/** Add a flat add-on total without changing a total that has no add-ons. */
export function addQuotationAddonsToTotal(total: number, addonsTotal: number): number {
  if (!addonsTotal) return total;
  return Math.round((total + addonsTotal) * 100) / 100;
}

export function validateQuotationAddonDrafts(rows: QuotationAddonDraft[]): string | null {
  for (const row of rows) {
    const description = row.description.trim();
    const priceText = row.price.trim();
    if (!description && !priceText) continue;
    if (!description) return 'Enter a description for each add-on that has a price.';
    if (!priceText) return 'Enter a price for each add-on.';
    const price = Number(priceText);
    if (!Number.isFinite(price)) return 'Add-on price must be a number.';
    if (price < 0) return 'Add-on price cannot be negative.';
  }
  return null;
}

export function draftsToQuotationAddons(rows: QuotationAddonDraft[]): QuotationAddon[] {
  return sanitizeQuotationAddons(
    rows.map((row) => ({
      description: row.description,
      price: row.price.trim() === '' ? '' : Number(row.price)
    }))
  );
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatQuotationAmount(amount: number): string {
  return (Number(amount) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function buildQuotationAddonsSectionHtml(addons: QuotationAddon[]): string {
  if (!addons.length) return '';
  const total = sumQuotationAddons(addons);
  const rows = addons.map((addon) => `
    <div class="quotation-addon-row" style="display:grid; grid-template-columns:1fr auto; gap:8px; align-items:start; padding:6px 8px; border-bottom:1px solid rgba(233,236,239,0.75); background:rgba(255,255,255,0.98);">
      <span style="font-weight:600; color:#333; font-size:11px; text-align:left; word-break:break-word; overflow-wrap:anywhere;">${escapeHtml(addon.description)}</span>
      <span style="font-weight:700; color:#333; font-size:11px; text-align:right; white-space:nowrap;">₹${formatQuotationAmount(addon.price)}</span>
    </div>`).join('');

  return `
    <div class="quotation-section quotation-addons" style="background:rgba(255,255,255,0.96); padding:5px 6px; border-radius:3px; margin:0 0 5px 0; border:1px solid rgba(233,236,239,0.9);">
      <h2 style="color:#2563eb; margin:0 0 5px 0; font-size:14px; border-bottom:2px solid #2563eb; padding-bottom:3px; font-weight:bold;">
        ADD-ONS
      </h2>
      <div class="quotation-card quotation-addon-card" style="display:flex; flex-direction:column; padding:0; overflow:hidden;">
        <div class="quotation-addon-header" style="display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; padding:5px 8px; background:rgba(37,99,235,0.08); border-bottom:1px solid rgba(37,99,235,0.18);">
          <span style="font-weight:700; color:#333; font-size:11px; text-align:left;">Description</span>
          <span style="font-weight:700; color:#333; font-size:11px; text-align:right;">Amount</span>
        </div>
        ${rows}
        <div class="quotation-addon-total" style="display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; padding:7px 8px; background:rgba(248,249,250,0.98);">
          <span style="font-weight:800; color:#111; font-size:12px; text-align:left;">Add-ons Total</span>
          <span style="font-weight:800; color:#111; font-size:12px; text-align:right; white-space:nowrap;">₹${formatQuotationAmount(total)}</span>
        </div>
      </div>
    </div>`;
}
