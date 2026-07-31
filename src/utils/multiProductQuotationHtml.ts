/**
 * Multi-product quotation layout (2+ items).
 * Layout: side-by-side product boxes, max 2 products per page.
 * Summary + Grand Total appear on the last product page only.
 * Single-product quotations must NOT use this.
 */

import { PdfQuotationLineItem } from './quotationLineItems';
import { normalizeOrderQuantity } from './orderQuantity';

/** How many product boxes appear on each quotation page. */
export const PRODUCTS_PER_QUOTATION_PAGE = 2;

const GST_RATE = '18%';
const METERS_TO_FEET = 3.2808399;

const formatIndianNumber = (x: number): string => {
  const n = Math.round(Number(x) || 0);
  return n.toLocaleString('en-IN');
};

const formatTotalWithDecimals = (x: number): string =>
  `${formatIndianNumber(x)}.00`;

const toDisplayUnit = (mm: number | undefined, unit: 'm' | 'ft'): string => {
  if (!mm || !Number.isFinite(mm)) return '—';
  const meters = mm / 1000;
  if (unit === 'ft') return (meters * METERS_TO_FEET).toFixed(2);
  return meters.toFixed(2);
};

const screenAreaSqFt = (widthMm?: number, heightMm?: number): number => {
  if (!widthMm || !heightMm) return 0;
  const area = (widthMm / 1000) * METERS_TO_FEET * ((heightMm / 1000) * METERS_TO_FEET);
  return Math.round(area * 100) / 100;
};

const sectionLabel = (index: number): string => {
  let result = '';
  let current = index + 1;
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
};

const seriesEnvironment = (item: PdfQuotationLineItem): string => {
  const environmentLabel = item.environment
    ? item.environment.charAt(0).toUpperCase() + item.environment.slice(1)
    : '';
  const seriesName = (item.productName || '')
    .replace(/\s+P\d+(\.\d+)?(-\d+(\.\d+)?)?(\s*\(.*\))?/i, '')
    .replace(/\s+(Indoor|Outdoor)/i, '')
    .replace(/\s+SMD/i, '')
    .trim();
  if (seriesName && environmentLabel) return `${seriesName}, ${environmentLabel}`;
  return seriesName || environmentLabel || item.productName || '—';
};

const dimensionLabel = (item: PdfQuotationLineItem): string => {
  if (item.isJumbo || item.isModuleGrid || (item.isCrystal && !item.productCategory?.toLowerCase().includes('standard')) || item.isFlexible) {
    return 'Module Dimension';
  }
  if (item.isDigitalStandee) return 'Frame Size';
  return 'Cabinet Dimension';
};

const dimensionValue = (item: PdfQuotationLineItem): string => {
  const useModule =
    item.isJumbo ||
    item.isModuleGrid ||
    item.isFlexible ||
    (item.isCrystal && !item.productCategory?.toLowerCase().includes('standard'));
  const dims = useModule ? item.moduleDimensions : item.cabinetDimensions;
  if (dims?.width && dims?.height) return `${dims.width} x ${dims.height} mm`;
  return '—';
};

const areaLabel = (item: PdfQuotationLineItem): string => {
  if (item.isDigitalStandee || item.isFixed) return 'Area Qty';
  if (item.isRental) return 'Cabinets';
  return 'Area';
};

const areaValue = (item: PdfQuotationLineItem): string => {
  const qty = item.pricing?.quantity;
  if (item.isDigitalStandee || item.isFixed) return '1';
  if (item.isRental) return `${Math.round(Number(qty) || 0)} Cabinets`;
  if (qty != null) return `${Math.round(Number(qty) * 100) / 100} Ft²`;
  const area = screenAreaSqFt(item.displayWidthMm, item.displayHeightMm);
  return area ? `${area} Ft²` : '—';
};

const row = (label: string, value: string): string => `
  <div style="display:grid; grid-template-columns:1fr auto; gap:4px; align-items:center; padding:2px 0; border-bottom:1px solid #eef0f2;">
    <span style="font-size:8px; font-weight:600; color:#374151;">${label}</span>
    <span style="font-size:8px; font-weight:600; color:#111; text-align:right; white-space:nowrap;">${value}</span>
  </div>`;

const sectionTitle = (text: string): string => `
  <div style="margin:4px 0 2px 0; padding:2px 0; border-bottom:1px solid #2563eb; color:#2563eb; font-size:9px; font-weight:700;">
    ${text}
  </div>`;

const chunkProducts = (items: PdfQuotationLineItem[]): PdfQuotationLineItem[][] => {
  const chunks: PdfQuotationLineItem[][] = [];
  for (let i = 0; i < items.length; i += PRODUCTS_PER_QUOTATION_PAGE) {
    chunks.push(items.slice(i, i + PRODUCTS_PER_QUOTATION_PAGE));
  }
  return chunks;
};

const buildProductBox = (item: PdfQuotationLineItem, index: number): string => {
  const letter = sectionLabel(index);
  const productNumber = index + 1;
  const orderQty = normalizeOrderQuantity(item.orderQuantity);
  const pricing = item.pricing || {};
  const productTotal = pricing.productTotal ?? pricing.productSubtotal ?? 0;
  const subtotal = pricing.productSubtotal ?? productTotal;
  const processorTotal = pricing.processorTotal ?? pricing.processorPrice ?? 0;
  const controllerUnit = orderQty > 0 ? Math.round((processorTotal / orderQty) * 100) / 100 : processorTotal;
  const structureTotal = pricing.structureTotal ?? pricing.structureCost ?? 0;
  const installationTotal = pricing.installationTotal ?? pricing.installationCost ?? 0;
  const productGrand = pricing.grandTotal ?? 0;
  const area = screenAreaSqFt(item.displayWidthMm, item.displayHeightMm);

  const showController = !item.isJumbo && !item.isDigitalStandee && !item.isFixed;
  const showStructureInstall = !item.isRental && !item.isDigitalStandee && !item.isFixed;
  const showStructure = showStructureInstall && !item.isCrystal;

  return `
    <div class="multi-product-block" style="background:#fff; border:1px solid #c5d0dc; border-radius:4px; padding:5px 6px; display:flex; flex-direction:column; min-width:0; height:100%; box-sizing:border-box;">
      <div style="color:#2563eb; margin:0 0 3px 0; font-size:11px; border-bottom:2px solid #2563eb; padding-bottom:2px; font-weight:800; line-height:1.2;">
        ${letter}. PRODUCT ${productNumber}
      </div>
      <div style="font-size:9px; font-weight:700; color:#111; margin:0 0 3px 0; line-height:1.2;">
        ${item.productName}
      </div>

      ${sectionTitle('PRODUCT SPECIFICATIONS')}
      ${row('Series/Environment:', seriesEnvironment(item))}
      ${row('Pixel Pitch:', item.pixelPitch != null ? `P${item.pixelPitch}` : '—')}
      ${!item.isFixed ? `
        ${row(`${dimensionLabel(item)}:`, dimensionValue(item))}
        ${row('Display Size (m):', `${toDisplayUnit(item.displayWidthMm, 'm')} x ${toDisplayUnit(item.displayHeightMm, 'm')}`)}
        ${row('Display Size (ft):', `${toDisplayUnit(item.displayWidthMm, 'ft')} x ${toDisplayUnit(item.displayHeightMm, 'ft')}`)}
      ` : ''}
      ${row('Resolution:', item.resolution?.width && item.resolution?.height ? `${item.resolution.width} x ${item.resolution.height}` : '—')}
      ${row('Matrix:', item.cabinetGrid?.columns && item.cabinetGrid?.rows ? `${item.cabinetGrid.columns} x ${item.cabinetGrid.rows}` : '—')}

      ${sectionTitle('PRICING DETAILS')}
      ${row('Unit Price:', `₹${formatIndianNumber(pricing.unitPrice || 0)}`)}
      ${row(`${areaLabel(item)}:`, areaValue(item))}
      ${row('Quantity (Units):', String(orderQty))}
      ${!item.isDigitalStandee ? row('Subtotal:', `₹${formatIndianNumber(subtotal)}${orderQty > 1 ? ` (× ${orderQty})` : ''}`) : ''}
      ${row('GST', GST_RATE)}
      ${row('Product Total:', `₹${formatTotalWithDecimals(productTotal)}`)}

      ${showController ? `
        ${sectionTitle('CONTROL SYSTEM')}
        ${row('Controller Model:', item.processor || 'Nova TB40')}
        ${row('Quantity:', String(orderQty))}
        ${row('UOM:', 'Nos.')}
        ${row('Controller Unit Price:', `₹${formatIndianNumber(controllerUnit)}`)}
        ${row('Controller Total:', `₹${formatTotalWithDecimals(processorTotal)}`)}
      ` : ''}

      ${showStructureInstall ? `
        ${sectionTitle('STRUCTURE & INSTALLATION')}
        ${showStructure ? row('Structure Cost:', `₹${formatIndianNumber(structureTotal)}`) : ''}
        ${row('Installation Cost:', `₹${formatIndianNumber(installationTotal)}`)}
        ${row('Area:', `${area.toFixed(2)} Ft²`)}
        ${row(showStructure ? 'Structure + Install Total:' : 'Installation Total:', `₹${formatTotalWithDecimals(showStructure ? structureTotal + installationTotal : installationTotal)}`)}
      ` : ''}

      <div style="margin-top:auto; padding-top:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 6px; border-radius:3px; background:#edf5ff; border:1px solid #b8d7ff;">
          <span style="font-weight:800; color:#111; font-size:9px;">PRODUCT ${productNumber} TOTAL</span>
          <span style="font-weight:800; color:#111; font-size:9px;">₹${formatTotalWithDecimals(productGrand)}</span>
        </div>
      </div>
    </div>`;
};

const buildProductsRow = (pageItems: PdfQuotationLineItem[], startIndex: number): string => {
  const columns = pageItems.length === 1 ? '1fr' : '1fr 1fr';
  return `
    <div class="quotation-section multi-products-row" style="display:grid; grid-template-columns:${columns}; gap:6px; align-items:stretch; margin:0 0 4px 0;">
      ${pageItems.map((item, offset) => buildProductBox(item, startIndex + offset)).join('')}
    </div>`;
};

const buildSummaryAndGrandTotal = (allItems: PdfQuotationLineItem[]): string => {
  const grandTotal = allItems.reduce((sum, item) => sum + (item.pricing?.grandTotal || 0), 0);
  return `
    <div class="quotation-section multi-summary" style="background:rgba(255,255,255,0.96); padding:4px 6px; border-radius:3px; margin:0 0 3px 0; border:1px solid rgba(233,236,239,0.9);">
      <h2 style="color:#2563eb; margin:0 0 3px 0; font-size:12px; border-bottom:2px solid #2563eb; padding-bottom:2px; font-weight:bold;">
        QUOTATION SUMMARY
      </h2>
      ${allItems.map((item, index) => `
        <div style="display:flex; justify-content:space-between; gap:8px; padding:3px 4px; font-size:10px; border-bottom:1px solid #eef0f2;">
          <span style="font-weight:600; color:#333;">Product ${index + 1} — ${item.productName}</span>
          <span style="font-weight:700; color:#111; white-space:nowrap;">₹${formatTotalWithDecimals(item.pricing?.grandTotal || 0)}</span>
        </div>`).join('')}
    </div>

    <div class="quotation-section multi-grand-total-section" style="background:rgba(51,51,51,0.95); color:white; padding:5px 8px; border-radius:3px; margin:2px 0 0 40px; text-align:center; flex-shrink:0; box-shadow:0 2px 4px rgba(0,0,0,0.1); width:calc(100% - 40px); box-sizing:border-box;">
      <h2 style="margin:0 0 1px 0; font-size:13px; font-weight:bold; line-height:1.1;">GRAND TOTAL</h2>
      <p style="margin:0; font-size:15px; font-weight:bold; line-height:1.1;">₹${formatTotalWithDecimals(grandTotal)} (GST Extra)</p>
      <p style="margin:1px 0 0 0; font-size:8px; opacity:0.9; line-height:1.1;">(Sum of ${allItems.length} product totals)</p>
    </div>`;
};

/** First quotation page body: first 1–2 products (+ summary if this is the only page). */
export function buildMultiProductQuotationBodyHtml(items: PdfQuotationLineItem[]): string {
  const allItems = items.slice();
  const chunks = chunkProducts(allItems);
  const firstChunk = chunks[0] || [];
  const isOnlyPage = chunks.length <= 1;

  return `
    ${buildProductsRow(firstChunk, 0)}
    ${isOnlyPage ? buildSummaryAndGrandTotal(allItems) : ''}
  `;
}

/** Extra quotation pages for products 3+: each page has up to 2 product boxes. */
export function buildMultiProductContinuationPagesHtml(
  items: PdfQuotationLineItem[],
  quotationId?: string
): string {
  const allItems = items.slice();
  const chunks = chunkProducts(allItems);
  if (chunks.length <= 1) return '';

  return chunks.slice(1).map((chunk, chunkIndex) => {
    const startIndex = (chunkIndex + 1) * PRODUCTS_PER_QUOTATION_PAGE;
    const isLastPage = chunkIndex === chunks.length - 2;
    const pageNumber = chunkIndex + 2;
    const totalPages = chunks.length;

    return `
      <div class="page page-bg multi-quotation-page" data-page-kind="quotation"
           style="background-image: url('/Pages to JPG/6.png'); position: relative;">
        <div class="quotation-overlay">
          <div class="quotation-section" style="background: rgba(248, 249, 250, 0.95); padding: 5px 8px; border-radius: 3px; margin: 0 0 4px 0; border: 1px solid rgba(233, 236, 239, 0.8); flex-shrink: 0;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <p style="margin:0; font-size:11px; color:#333;">
                <strong>Quotation #:</strong> <span style="font-weight:bold;">${quotationId || ''}</span>
              </p>
              <p style="margin:0; font-size:10px; color:#555; font-weight:600;">
                MULTI-PRODUCT QUOTATION — CONTINUED (${pageNumber}/${totalPages})
              </p>
            </div>
          </div>
          ${buildProductsRow(chunk, startIndex)}
          ${isLastPage ? buildSummaryAndGrandTotal(allItems) : ''}
        </div>
      </div>`;
  }).join('');
}

/**
 * Legacy overflow helper for a single multi page with 2 products.
 * No-op when continuation pages already exist.
 */
export function fitMultiProductQuotationIfNeeded(root: ParentNode): boolean {
  const scope = root as Document | Element;
  const queryAll = (sel: string) =>
    'querySelectorAll' in scope ? scope.querySelectorAll(sel) : ([] as unknown as NodeListOf<Element>);

  const existingMultiPages = queryAll('.multi-quotation-page');
  // Only attempt overflow split when exactly one multi page was generated (≤2 products)
  if (existingMultiPages.length !== 1) return false;

  const page = existingMultiPages[0] as HTMLElement;
  const overlay = page.querySelector('.quotation-overlay') as HTMLElement | null;
  if (!overlay) return false;

  void overlay.offsetHeight;
  const available = overlay.clientHeight;
  if (!available) return false;

  const children = Array.from(overlay.children) as HTMLElement[];
  let totalHeight = 0;
  children.forEach((child, index) => {
    totalHeight += child.offsetHeight;
    if (index < children.length - 1) totalHeight += 3;
  });

  if (totalHeight <= available + 4) return false;

  const productsRow = overlay.querySelector('.multi-products-row') as HTMLElement | null;
  const productBlocks = Array.from(
    productsRow
      ? productsRow.querySelectorAll('.multi-product-block')
      : overlay.querySelectorAll('.multi-product-block')
  ) as HTMLElement[];
  const summary = overlay.querySelector('.multi-summary') as HTMLElement | null;
  const grandTotal = overlay.querySelector('.multi-grand-total-section') as HTMLElement | null;
  if (productBlocks.length < 2) return false;

  const quotationIdText =
    overlay.querySelector('.quotation-section strong')?.parentElement?.textContent?.replace(/\s+/g, ' ').trim() ||
    '';

  const page2 = document.createElement('div');
  page2.className = page.className;
  page2.setAttribute('data-page-kind', 'quotation');
  const pageStyle = page.getAttribute('style');
  if (pageStyle) page2.setAttribute('style', pageStyle);

  const overlay2 = document.createElement('div');
  overlay2.className = 'quotation-overlay';

  const continueHeader = document.createElement('div');
  continueHeader.className = 'quotation-section';
  continueHeader.setAttribute(
    'style',
    'background: rgba(248, 249, 250, 0.95); padding: 5px 8px; border-radius: 3px; margin: 0 0 4px 0; border: 1px solid rgba(233, 236, 239, 0.8); flex-shrink: 0;'
  );
  continueHeader.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <p style="margin:0; font-size:11px; color:#333;">${quotationIdText || 'Quotation continued'}</p>
      <p style="margin:0; font-size:10px; color:#555; font-weight:600;">MULTI-PRODUCT QUOTATION — CONTINUED</p>
    </div>`;

  const product2 = productBlocks[1];
  product2.style.height = 'auto';
  if (productsRow) productsRow.style.gridTemplateColumns = '1fr';

  overlay2.appendChild(continueHeader);
  overlay2.appendChild(product2);
  if (summary) overlay2.appendChild(summary);
  if (grandTotal) overlay2.appendChild(grandTotal);

  page2.appendChild(overlay2);
  page.after(page2);
  return true;
}
