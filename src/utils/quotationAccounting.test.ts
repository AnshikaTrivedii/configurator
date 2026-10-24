/** Cross-surface quotation invariants. Run with npm run test:quotation-edit. */
import { products } from '../data/products';
import { calculateCentralizedPricing } from './centralizedPricing';
import { applySavedPriceOverrides } from './discountCalculator';
import { buildQuotationAccounting, getQuotationDisplayTotal, persistedLinesForPdfSave } from './quotationLineItems';
import { billableAreaSqFt, cabinetCountForTarget, formatDimensionInput, formatDimensionLabel, parseDimensionInput } from './displayMeasurements';
import { buildMultiProductQuotationBodyHtml } from './multiProductQuotationHtml';
import { calculateQuantity as calculatePdfQuantity } from './pdfPriceCalculator';

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
