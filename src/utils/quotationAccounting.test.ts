/** Cross-surface quotation invariants. Run with npm run test:quotation-edit. */
import { products } from '../data/products';
import { calculateCentralizedPricing, getCatalogUnitPrice } from './centralizedPricing';
import { applySavedPriceOverrides } from './discountCalculator';
import { buildQuotationAccounting, getQuotationDisplayTotal, persistedLinesForPdfSave } from './quotationLineItems';
import { billableAreaSqFt, cabinetCountForTarget, formatDimensionInput, formatDimensionLabel, parseDimensionInput } from './displayMeasurements';
import { buildMultiProductQuotationBodyHtml } from './multiProductQuotationHtml';
import { calculateQuantity as calculatePdfQuantity } from './pdfPriceCalculator';
import { SHORT_LED_WARRANTY, STANDARD_LED_WARRANTY, warrantyForProduct } from './productSeries';
import { generateConfigurationHtml } from './docxGenerator';

let passed = 0;
function assert(name: string, condition: boolean) {
  if (!condition) throw new Error(`FAIL ${name}`);
  passed += 1;
  console.log(`  PASS ${name}`);
}

console.log('Quotation accounting and dimensions');
const heightMm = 1012.5;
for (const unit of ['m', 'ft'] as const) {
  const displayed = formatDimensionInput(heightMm, unit);
  const parsed = parseDimensionInput(Number(displayed), unit);
  assert(`${unit} dimension input round-trips in millimetres`, parsed === heightMm);
  assert(`${unit} input keeps all three cabinet rows`, cabinetCountForTarget(parsed, 337.5) === 3);
}
assert('feet labels show two decimal places', formatDimensionLabel(heightMm, 'ft') === '3.32');
assert('feet labels keep the stored millimetres exact', formatDimensionInput(heightMm, 'ft') === '3.32185');

const competitiveProducts: Array<[string, number]> = [
  ['bellatrix-indoor-smd-p1.8', 8500],
  ['bellatrix-indoor-smd-p2.5', 6500],
  ['bellatrix-outdoor-smd-p3', 7800],
  ['bellatrix-outdoor-smd-p4', 4800],
  ['orion-module-grid-p18', 7920],
  ['orion-module-grid-p25', 5800]
];
for (const [productId, expected] of competitiveProducts) {
  const pricedProduct = products.find(item => item.id === productId);
  if (!pricedProduct) throw new Error(`Missing ${productId}`);
  assert(`${productId} proposed competitive price`, getCatalogUnitPrice(pricedProduct, 'competitive') === expected);
  const quoted = calculateCentralizedPricing(
    pricedProduct,
    { columns: 1, rows: 1, totalWidth: pricedProduct.cabinetDimensions.width, totalHeight: pricedProduct.cabinetDimensions.height },
    null,
    'competitive',
    { width: pricedProduct.cabinetDimensions.width, height: pricedProduct.cabinetDimensions.height, unit: 'mm' }
  );
  assert(`${productId} quotation uses the proposed competitive unit price`, quoted.isAvailable && quoted.unitPrice === expected);
  assert(`${productId} end user price is unchanged`, getCatalogUnitPrice(pricedProduct, 'End User') !== expected);
}
const coreWithoutCompetitive = products.find(item => item.id === 'bellatrix-indoor-cob-p0.9');
if (!coreWithoutCompetitive) throw new Error('Missing Sigma Core P0.9');
assert(
  'pitches without a proposed competitive price stay unavailable',
  getCatalogUnitPrice(coreWithoutCompetitive, 'competitive') === null
);

for (const productId of ['orion-module-grid-p18', 'orion-module-grid-p25']) {
  const gridProduct = products.find(item => item.id === productId);
  if (!gridProduct) throw new Error(`Missing ${productId}`);
  const gridQuote = calculateCentralizedPricing(
    gridProduct,
    { columns: 2, rows: 2, totalWidth: gridProduct.cabinetDimensions.width * 2, totalHeight: gridProduct.cabinetDimensions.height * 2 },
    'TB40',
    'endUser',
    { width: gridProduct.cabinetDimensions.width * 2, height: gridProduct.cabinetDimensions.height * 2, unit: 'mm' }
  );
  assert(`${productId} hides structure and installation`, gridQuote.isAvailable && gridQuote.structureTotal === 0 && gridQuote.installationTotal === 0);
  assert(`${productId} total excludes structure and installation`, gridQuote.grandTotal === Math.round(gridQuote.productTotal + gridQuote.processorTotal));
}
const gridP4 = products.find(item => item.id === 'orion-module-grid-p4');
if (!gridP4) throw new Error('Missing Module/Grid P4');
const gridP4Quote = calculateCentralizedPricing(
  gridP4,
  { columns: 1, rows: 1, totalWidth: gridP4.cabinetDimensions.width, totalHeight: gridP4.cabinetDimensions.height },
  null,
  'endUser',
  { width: gridP4.cabinetDimensions.width, height: gridP4.cabinetDimensions.height, unit: 'mm' }
);
assert('Module/Grid P4 still includes structure and installation', gridP4Quote.structureTotal > 0 && gridP4Quote.installationTotal > 0);

for (const productId of ['orion-module-grid-p18', 'orion-module-grid-p25']) {
  const gridProduct = products.find(item => item.id === productId);
  if (!gridProduct) throw new Error(`Missing ${productId}`);
  const grid = {
    columns: 2,
    rows: 2,
    totalWidth: gridProduct.cabinetDimensions.width * 2,
    totalHeight: gridProduct.cabinetDimensions.height * 2
  };
  const config = { width: grid.totalWidth, height: grid.totalHeight, unit: 'mm' as const };
  const lowCost = calculateCentralizedPricing(
    gridProduct,
    grid,
    'TB40',
    'Low Cost Model Price',
    config,
    { enabled: true, structurePrice: 50000, installationPrice: 12000 }
  );
  assert(`${productId} low cost structure stays zero`, lowCost.structureTotal === 0 && lowCost.structureCost === 0);
  assert(`${productId} low cost installation is entered once`, lowCost.installationTotal === 12000);
  assert(
    `${productId} low cost grand total is product + controller + installation`,
    lowCost.grandTotal === Math.round(lowCost.productTotal + lowCost.processorTotal + 12000)
  );
  const changed = calculateCentralizedPricing(
    gridProduct,
    grid,
    'TB40',
    'competitive',
    config,
    { enabled: true, structurePrice: 50000, installationPrice: 8000 }
  );
  assert(`${productId} edited installation updates the grand total`, changed.grandTotal === lowCost.grandTotal - 4000);
  const endUserCustom = calculateCentralizedPricing(
    gridProduct,
    grid,
    'TB40',
    'endUser',
    config,
    { enabled: true, structurePrice: 50000, installationPrice: 12000 }
  );
  assert(`${productId} end user still omits both charges`, endUserCustom.structureTotal === 0 && endUserCustom.installationTotal === 0);

  const html = generateConfigurationHtml(
    config,
    gridProduct,
    grid,
    'TB40',
    undefined,
    { fullName: 'A', email: 'a@b.c', phoneNumber: '1', userType: 'Low Cost Model Price' },
    null,
    'Q-GRID',
    { enabled: true, structurePrice: 50000, installationPrice: 12000 },
    {
      grandTotal: lowCost.grandTotal + 50000,
      structureCost: 50000,
      structureTotal: 50000,
      installationCost: 12000,
      installationTotal: 12000,
      productTotal: lowCost.productTotal,
      processorTotal: lowCost.processorTotal,
      unitPrice: lowCost.unitPrice,
      quantity: lowCost.quantity,
      orderQuantity: 1,
      customPricing: { enabled: true, structurePrice: 50000, installationPrice: 12000 }
    }
  );
  assert(`${productId} PDF shows the installation price`, html.includes('INSTALLATION PRICE') && html.includes('12,000.00'));
  assert(
    `${productId} PDF does not show a structure charge`,
    !html.includes('STRUCTURE AND INSTALLATION') && !html.includes('Structure Cost') && !html.includes('STRUCTURE + INSTALLATION')
  );
  const pdfGrand = Number((html.match(/GRAND TOTAL[\s\S]{0,400}?₹([0-9,]+\.\d{2})/) || [])[1]?.replace(/,/g, ''));
  assert(`${productId} PDF grand total includes installation once and drops structure`, pdfGrand === lowCost.grandTotal);
  assert(`${productId} PDF keeps GST extra`, html.includes('GST Extra'));
}
const astraLowCost = products.find(item => item.id === 'bellatrix-indoor-smd-p1.8');
if (!astraLowCost) throw new Error('Missing Astra Core-I P1.8');
const astraQuote = calculateCentralizedPricing(
  astraLowCost,
  { columns: 1, rows: 1, totalWidth: astraLowCost.cabinetDimensions.width, totalHeight: astraLowCost.cabinetDimensions.height },
  null,
  'competitive',
  { width: astraLowCost.cabinetDimensions.width, height: astraLowCost.cabinetDimensions.height, unit: 'mm' }
);
assert('Astra Core low cost still prices structure', astraQuote.structureTotal > 0);

for (const productId of [
  'bellatrix-indoor-smd-p1.8',
  'bellatrix-indoor-smd-p2.5',
  'bellatrix-outdoor-smd-p3',
  'bellatrix-outdoor-smd-p4',
  'orion-module-grid-p18',
  'orion-module-grid-p25'
]) {
  const warrantyProduct = products.find(item => item.id === productId);
  if (!warrantyProduct) throw new Error(`Missing ${productId}`);
  assert(
    `${productId} uses the 12/13 month warranty`,
    warrantyForProduct(undefined, warrantyProduct) === SHORT_LED_WARRANTY
      && warrantyForProduct(STANDARD_LED_WARRANTY, warrantyProduct) === SHORT_LED_WARRANTY
  );
}
assert(
  'other products keep the 24/25 month warranty',
  warrantyForProduct(undefined, products.find(item => item.id === 'bellatrix-indoor-cob-p0.9')) === STANDARD_LED_WARRANTY
);
assert(
  'an edited warranty is left unchanged',
  warrantyForProduct('Custom warranty text', products.find(item => item.id === 'bellatrix-indoor-smd-p1.8')) === 'Custom warranty text'
);
assert('an intentionally smaller target changes the grid', cabinetCountForTarget(1010, 337.5) === 2);
assert('billable area uses the precise grid', billableAreaSqFt(1800, 1012.5) === 19.62);

const product = products.find(p => p.id === 'modular-outdoor-p3.91');
if (!product) throw new Error('Missing test product');
const grid = { columns: 2, rows: 3, totalWidth: 1800, totalHeight: 1012.5 };
const config = { width: 1800, height: 1012.5, unit: 'm' };
const priced = calculateCentralizedPricing(product, grid, 'TB40', 'endUser', config, undefined, 'copper');
assert('pricing quantity matches displayed billable area', priced.isAvailable && priced.quantity === 19.62);
assert('PDF quantity uses the same billable area', calculatePdfQuantity(product, grid, config) === priced.quantity);
assert('central total matches its components', priced.grandTotal === Math.round(
  priced.productTotal + priced.processorTotal + priced.structureTotal + priced.installationTotal + priced.addonsTotal
));

const fractional = calculateCentralizedPricing(product, grid, null, 'endUser', config,
  { enabled: true, structurePrice: 0.25, installationPrice: 0.25 }, 'copper', undefined, 3);
assert('fractional component totals reconcile after quantity scaling', fractional.grandTotal === Math.round(
  fractional.productTotal + fractional.processorTotal + fractional.structureTotal + fractional.installationTotal + fractional.addonsTotal
));
const unavailable = calculateCentralizedPricing({ ...product, id: 'test-invalid', category: 'Standard', price: 'not a price' }, grid, null, 'endUser', config);
assert('malformed catalog price cannot become a saleable fallback quote', !unavailable.isAvailable && unavailable.grandTotal === 0);

const bothOverrides = applySavedPriceOverrides(priced, {
  discountType: 'led',
  ledOverride: { amountPerUnit: 2000, ledDiscountMode: 'per_sqft' },
  controllerOverride: { amountPerUnit: 10000 }
}, product, grid, config);
assert('two overrides retain the undiscounted catalog baseline', bothOverrides.originalGrandTotal === priced.grandTotal);
const actualLineAccounting = buildQuotationAccounting([{
  unitPricingSnapshot: bothOverrides,
  discount: { originalGrandTotal: bothOverrides.originalGrandTotal,
    originalProductTotal: bothOverrides.originalProductTotal,
    originalProcessorTotal: bothOverrides.originalProcessorTotal }
}]);
assert('a real discounted line reconciles with the quote summary', actualLineAccounting.grandTotal === bothOverrides.grandTotal);
assert('its original summary retains the catalog total', actualLineAccounting.originalTotal === priced.grandTotal);

const savedDiscountedLine = {
  productId: product.id,
  productName: product.name,
  product,
  config: { ...config, unit: 'mm' as const, aspectRatio: null },
  cabinetGrid: grid,
  orderQuantity: 1,
  pricing: { grandTotal: bothOverrides.grandTotal },
  discount: { originalGrandTotal: priced.grandTotal }
};
const savedQuotation = { quotationData: { lineItems: [savedDiscountedLine] } };
const selectedSavedLines = persistedLinesForPdfSave([], savedQuotation);
assert('dashboard PDF save uses the saved discounted line when the cart is empty',
  selectedSavedLines === savedQuotation.quotationData.lineItems);
assert('dashboard PDF save keeps the saved original total',
  selectedSavedLines !== null && buildQuotationAccounting(selectedSavedLines).originalTotal === priced.grandTotal);
assert('dashboard PDF save ignores an unrelated configurator cart',
  persistedLinesForPdfSave([{ product, config, cabinetGrid: grid, orderQuantity: 1 } as any], savedQuotation)
    === savedQuotation.quotationData.lineItems);
assert('legacy dashboard PDF save cannot import an unrelated cart line',
  persistedLinesForPdfSave([{ product, config, cabinetGrid: grid, orderQuantity: 1 } as any], { quotationData: {} }) === null);

const lines = [
  { pricing: { grandTotal: 100, productSubtotal: 80, productTotal: 80, processorTotal: 20 },
    discount: { originalGrandTotal: 150, originalProductTotal: 130, originalProcessorTotal: 20 } },
  { pricing: { grandTotal: 200, productSubtotal: 180, productTotal: 180, processorTotal: 20 } }
];
const addons = [{ description: 'HDMI extender', price: 12.5 }];
const accounting = buildQuotationAccounting(lines, addons);
assert('multi-product total is lines plus flat add-ons', accounting.grandTotal === 312.5);
assert('original total uses pre-override line price', accounting.originalTotal === 362.5);
assert('multi-product subtotal aggregates all lines', accounting.breakdown.subtotal === 260);
assert('multi-product breakdown has no misleading single-product unit price', !('unitPrice' in accounting.breakdown));
const html = buildMultiProductQuotationBodyHtml([
  { productName: 'First', pricing: { grandTotal: 100, productTotal: 80 } },
  { productName: 'Second', pricing: { grandTotal: 200, productTotal: 180 } }
], addons);
assert('PDF summary displays the same fractional grand total', html.includes('₹312.50'));
assert('PDF summary displays fractional add-ons without rounding them up', html.includes('₹12.50'));
const fractionalHtml = buildMultiProductQuotationBodyHtml([
  { productName: 'First', pricing: { grandTotal: 100.4 } },
  { productName: 'Second', pricing: { grandTotal: 200.4 } }
], addons);
assert('PDF applies the same quote-level rounding as saved accounting', fractionalHtml.includes('₹313.50'));
assert('dashboard repairs a stale stored total from complete lines', getQuotationDisplayTotal({
  totalPrice: 999,
  exactPricingBreakdown: { grandTotal: 999 },
  quotationData: { lineItems: lines, customAddons: addons }
}) === accounting.grandTotal);
let rejected = false;
try { buildQuotationAccounting([{ pricing: { grandTotal: Number.NaN } }]); } catch { rejected = true; }
assert('invalid line totals cannot be saved', rejected);

console.log(`\n${passed} passed, 0 failed`);
