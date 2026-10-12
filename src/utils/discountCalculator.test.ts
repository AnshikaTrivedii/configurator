/**
 * Regression tests for Super Admin price overrides.
 * Run: npx --yes tsx src/utils/discountCalculator.test.ts
 */

import {
  applyDiscount,
  applySavedPriceOverrides,
  rebuildGrandTotalFromComponents,
  DiscountInfo,
  getLedDiscountMode,
  getDiscountUnits,
  mergeUiDiscountIntoLine
} from './discountCalculator';
import { PricingCalculationResult } from './centralizedPricing';
import {
  getQuotationDisplayTotal,
  resolveLineItemDiscount,
  resolveQuotationLevelDiscount,
  toPersistedLineItems,
  normalizeQuotationLineItems
} from './quotationLineItems';

function makePricing(overrides: Partial<PricingCalculationResult> = {}): PricingCalculationResult {
  return {
    unitPrice: 8000,
    quantity: 100,
    orderQuantity: 1,
    unitGrandTotal: 1_200_000,
    productSubtotal: 800_000,
    productGST: 0,
    productTotal: 800_000,
    processorPrice: 50_000,
    processorGST: 0,
    processorTotal: 50_000,
    structureCost: 200_000,
    structureGST: 0,
    structureTotal: 200_000,
    installationCost: 150_000,
    installationGST: 0,
    installationTotal: 150_000,
    addonsCost: 0,
    addonsGST: 0,
    addonsTotal: 0,
    appliedAddons: [],
    customAddons: [],
    customAddonsTotal: 0,
    customAddonsIncludedInGrandTotal: true,
    grandTotal: 1_200_000,
    userType: 'End User',
    productName: 'Test LED',
    isAvailable: true,
    ...overrides
  };
}

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function almostEqual(a: number, b: number, tol = 1) {
  return Math.abs(a - b) <= tol;
}

console.log('Price override / Grand Total tests');

{
  const pricing = makePricing();
  const none = applyDiscount(pricing, null);
  assert('no override keeps catalog grand total', none.grandTotal === 1_200_000);
  assert('no override discountAmount is 0', none.discountAmount === 0);
}

{
  const pricing = makePricing();
  const led: DiscountInfo = {
    discountType: 'led',
    discountPercent: 0,
    discountAmountPerUnit: 5000,
    numberOfUnits: 100,
    ledDiscountMode: 'per_sqft'
  };
  const result = applyDiscount(pricing, led);
  const expectedProduct = 5000 * 100;
  const expectedGrand = expectedProduct + 50_000 + 200_000 + 150_000;
  assert('LED override replaces unit price', result.unitPrice === 5000);
  assert('LED override replaces product total', result.productTotal === expectedProduct);
  assert(
    'LED override rebuilds grand total from components',
    result.grandTotal === expectedGrand,
    `got ${result.grandTotal}, expected ${expectedGrand}`
  );
  assert('LED override is not subtracted from grand total', result.grandTotal > 0);
  assert('LED override does not change controller total', result.processorTotal === 50_000);
}

{
  const pricing = makePricing();
  const controller: DiscountInfo = {
    discountType: 'controller',
    discountPercent: 0,
    discountAmountPerUnit: 20_000,
    numberOfUnits: 1,
    ledDiscountMode: 'none'
  };
  const result = applyDiscount(pricing, controller);
  const expectedGrand = 800_000 + 20_000 + 200_000 + 150_000;
  assert('controller override replaces processor total', result.processorTotal === 20_000);
  assert(
    'controller override rebuilds grand total from components',
    result.grandTotal === expectedGrand,
    `got ${result.grandTotal}, expected ${expectedGrand}`
  );
}

{
  const pricing = makePricing();
  const led: DiscountInfo = {
    discountType: 'led',
    discountPercent: 0,
    discountAmountPerUnit: 4000,
    numberOfUnits: 100,
    ledDiscountMode: 'per_sqft'
  };
  const afterLed = applyDiscount(pricing, led);
  const controller: DiscountInfo = {
    discountType: 'controller',
    discountPercent: 0,
    discountAmountPerUnit: 15_000,
    numberOfUnits: 1,
    ledDiscountMode: 'none'
  };
  const both = applyDiscount(afterLed, controller);
  const expectedGrand = 4000 * 100 + 15_000 + 200_000 + 150_000;
  assert(
    'LED + controller overrides both replace and are not double-applied',
    both.grandTotal === expectedGrand && both.productTotal === 400_000 && both.processorTotal === 15_000,
    `got product=${both.productTotal} processor=${both.processorTotal} grand=${both.grandTotal}`
  );
}

{
  const catalogProduct = 3_000_000;
  const overrideProduct = 214_539;
  const pricing = makePricing({
    productSubtotal: catalogProduct,
    productTotal: catalogProduct,
    processorPrice: 0,
    processorTotal: 0,
    structureCost: 0,
    structureTotal: 0,
    installationCost: 0,
    installationTotal: 0,
    grandTotal: catalogProduct,
    quantity: 1,
    unitPrice: catalogProduct
  });
  (pricing as any).originalProductTotal = catalogProduct + (catalogProduct - overrideProduct);
  (pricing as any).originalGrandTotal = catalogProduct;
  const led: DiscountInfo = {
    discountType: 'led',
    discountPercent: 0,
    discountAmountPerUnit: overrideProduct,
    numberOfUnits: 1,
    ledDiscountMode: 'per_unit'
  };
  const result = applyDiscount(pricing, led);
  assert(
    'stale inflated originals do not produce a negative grand total',
    result.grandTotal === overrideProduct && result.grandTotal > 0,
    `got ${result.grandTotal}`
  );
  assert(
    'reproduced bug value is no longer emitted',
    result.grandTotal !== -2_570_922
  );
}

{
  const pricing = makePricing({
    addonsTotal: 75_000,
    grandTotal: 1_275_000
  });
  const led: DiscountInfo = {
    discountType: 'led',
    discountPercent: 0,
    discountAmountPerUnit: 5000,
    numberOfUnits: 100,
    ledDiscountMode: 'per_sqft'
  };
  const result = applyDiscount(pricing, led);
  assert(
    'Nexa add-ons stay in the rebuilt grand total',
    result.grandTotal === 5000 * 100 + 50_000 + 200_000 + 150_000 + 75_000,
    `got ${result.grandTotal}`
  );
}

{
  const pricing = makePricing({
    customAddons: [{ description: 'HDMI Extender', price: 12_000 }],
    customAddonsTotal: 12_000,
    customAddonsIncludedInGrandTotal: true,
    grandTotal: 1_212_000
  });
  const led: DiscountInfo = {
    discountType: 'led',
    discountPercent: 0,
    discountAmountPerUnit: 5000,
    numberOfUnits: 100,
    ledDiscountMode: 'per_sqft'
  };
  const result = applyDiscount(pricing, led);
  assert(
    'quotation add-ons stay in the rebuilt grand total',
    result.grandTotal === 5000 * 100 + 50_000 + 200_000 + 150_000 + 12_000,
    `got ${result.grandTotal}`
  );
}

{
  const structure = 200_000;
  const installation = 150_000;
  const gstExtraLabel = 0.18;
  void gstExtraLabel;
  const pricing = makePricing({
    structureTotal: structure,
    installationTotal: installation
  });
  const led: DiscountInfo = {
    discountType: 'led',
    discountPercent: 0,
    discountAmountPerUnit: 6000,
    numberOfUnits: 100,
    ledDiscountMode: 'per_sqft'
  };
  const result = applyDiscount(pricing, led);
  assert(
    'structure and installation stay GST-extra and are added once',
    result.structureTotal === structure &&
      result.installationTotal === installation &&
      result.grandTotal === 6000 * 100 + 50_000 + structure + installation
  );
}

{
  const rebuilt = rebuildGrandTotalFromComponents({
    productTotal: 214_539,
    processorTotal: 0,
    structureTotal: 0,
    installationTotal: 0,
    addonsTotal: 0,
    discount: { discountedProductTotal: 214_539 }
  });
  assert('component rebuild of the example override is positive', rebuilt === 214_539);
}

{
  const valid = getQuotationDisplayTotal({
    totalPrice: 1_200_000,
    exactPricingBreakdown: { grandTotal: 1_200_000, productTotal: 800_000 }
  });
  assert('valid existing quotation totals are preserved', valid === 1_200_000);
}

{
  const repaired = getQuotationDisplayTotal({
    totalPrice: -2_570_922,
    exactPricingBreakdown: {
      productTotal: 214_539,
      processorTotal: 0,
      structureTotal: 0,
      installationTotal: 0,
      addonsTotal: 0,
      customAddonsIncludedInGrandTotal: true,
      grandTotal: -2_570_922,
      discount: { discountedProductTotal: 214_539, discountAmount: 2_785_461 }
    }
  });
  assert(
    'negative stored totals are rebuilt from components',
    repaired === 214_539,
    `got ${repaired}`
  );
}

{
  const product = { category: 'Core Series Indoor', name: 'Core P2.5' };
  assert('standard products use per_sqft override mode', getLedDiscountMode(product) === 'per_sqft');
  const units = getDiscountUnits(
    product,
    { columns: 3, rows: 3 },
    { width: 1800, height: 1012.5, unit: 'mm' }
  );
  assert('sqft units are positive for a real cabinet grid', units > 0);
}

{
  const qtyPricing = makePricing({
    orderQuantity: 2,
    productSubtotal: 1_600_000,
    productTotal: 1_600_000,
    processorPrice: 100_000,
    processorTotal: 100_000,
    structureTotal: 400_000,
    installationTotal: 300_000,
    grandTotal: 2_400_000
  });
  const led: DiscountInfo = {
    discountType: 'led',
    discountPercent: 0,
    discountAmountPerUnit: 5000,
    numberOfUnits: 100,
    ledDiscountMode: 'per_sqft'
  };
  const result = applyDiscount(qtyPricing, led);
  const expectedProduct = 5000 * 100 * 2;
  const expectedGrand = expectedProduct + 100_000 + 400_000 + 300_000;
  assert(
    'order quantity scales the replacement LED total once',
    almostEqual(result.productTotal, expectedProduct) && almostEqual(result.grandTotal, expectedGrand),
    `product=${result.productTotal} grand=${result.grandTotal}`
  );
}

{
  const catalog = makePricing();
  const product = { category: 'Core Series Indoor', name: 'Core P2.5' };
  const grid = { columns: 3, rows: 3 };
  const config = { width: 1800, height: 1012.5, unit: 'mm' };
  const restored = applySavedPriceOverrides(
    catalog,
    {
      discountType: 'led',
      discountAmountPerUnit: 5000,
      ledOverride: { amountPerUnit: 5000, ledDiscountMode: 'per_sqft' }
    },
    product,
    grid,
    config
  );
  assert('restored LED override replaces catalog unit price', restored.unitPrice === 5000);
  assert(
    'restored LED override does not keep catalog product total',
    restored.productTotal !== catalog.productTotal
  );
}

{
  const catalog = makePricing();
  const restored = applySavedPriceOverrides(
    catalog,
    {
      discountType: 'controller',
      discountAmountPerUnit: 20_000,
      controllerOverride: { amountPerUnit: 20_000 }
    },
    { category: 'Core Series Indoor' },
    { columns: 3, rows: 3 },
    { width: 1800, height: 1012.5, unit: 'mm' }
  );
  assert('restored controller override replaces processor total', restored.processorTotal === 20_000);
  assert('restored controller override keeps LED catalog total', restored.productTotal === catalog.productTotal);
}

{
  const catalog = makePricing();
  const product = { category: 'Core Series Indoor', name: 'Core P2.5' };
  const both = applySavedPriceOverrides(
    catalog,
    {
      discountType: 'led',
      discountAmountPerUnit: 4000,
      ledOverride: { amountPerUnit: 4000, ledDiscountMode: 'per_sqft' },
      controllerOverride: { amountPerUnit: 15_000 }
    },
    product,
    { columns: 3, rows: 3 },
    { width: 1800, height: 1012.5, unit: 'mm' }
  );
  assert('restored LED+controller keeps both overrides', both.unitPrice === 4000 && both.processorTotal === 15_000);
  const again = applySavedPriceOverrides(
    catalog,
    {
      discountType: 'led',
      discountAmountPerUnit: 4000,
      ledOverride: { amountPerUnit: 4000, ledDiscountMode: 'per_sqft' },
      controllerOverride: { amountPerUnit: 15_000 }
    },
    product,
    { columns: 3, rows: 3 },
    { width: 1800, height: 1012.5, unit: 'mm' }
  );
  assert('restored overrides are not applied twice', both.grandTotal === again.grandTotal && both.grandTotal > 0);
}

{
  const catalogSmall = makePricing({ quantity: 20, productSubtotal: 160_000, productTotal: 160_000, grandTotal: 560_000 });
  const catalogLarge = makePricing({ quantity: 80, productSubtotal: 640_000, productTotal: 640_000, grandTotal: 1_040_000 });
  const product = { category: 'Core Series Indoor', name: 'Core P2.5' };
  const discount = {
    discountType: 'led' as const,
    discountAmountPerUnit: 5000,
    ledOverride: { amountPerUnit: 5000, ledDiscountMode: 'per_sqft' }
  };
  const small = applySavedPriceOverrides(
    catalogSmall,
    discount,
    product,
    { columns: 1, rows: 1 },
    { width: 600, height: 337.5, unit: 'mm' }
  );
  const large = applySavedPriceOverrides(
    catalogLarge,
    discount,
    product,
    { columns: 4, rows: 4 },
    { width: 2400, height: 1350, unit: 'mm' }
  );
  assert('matrix change keeps the saved per-unit override', small.unitPrice === 5000 && large.unitPrice === 5000);
  assert('matrix change recalculates LED total from new area', large.productTotal > small.productTotal);
}

{
  const none = applySavedPriceOverrides(
    makePricing(),
    null,
    { category: 'Core Series Indoor' },
    { columns: 3, rows: 3 },
    { width: 1800, height: 1012.5, unit: 'mm' }
  );
  assert('new quotation without override uses catalog grand total', none.grandTotal === 1_200_000);
}

{
  const fromBreakdown = resolveQuotationLevelDiscount({
    exactPricingBreakdown: {
      discount: {
        discountType: 'led',
        discountAmountPerUnit: 4200,
        ledOverride: { amountPerUnit: 4200, ledDiscountMode: 'per_sqft' }
      }
    }
  });
  assert(
    'quotation-level breakdown discount is restored',
    fromBreakdown?.ledOverride?.amountPerUnit === 4200
  );

  const fromLine = resolveLineItemDiscount(
    { discount: { discountType: 'controller', controllerOverride: { amountPerUnit: 18000 } } } as any
  );
  assert(
    'line-item controller override is restored on edit',
    fromLine?.controllerOverride?.amountPerUnit === 18000
  );

  const fromLegacy = resolveLineItemDiscount(
    { productId: 'x', productName: 'x', config: { width: 1, height: 1, unit: 'mm' }, cabinetGrid: { columns: 1, rows: 1 }, orderQuantity: 1 } as any,
    {
      quotationData: {
        discountApplied: true,
        discountInfo: { type: 'led', amountPerUnit: 3900, numberOfUnits: 10, ledDiscountMode: 'per_sqft' }
      }
    }
  );
  assert(
    'legacy quotation-level discountInfo is restored onto a single line',
    fromLegacy?.ledOverride?.amountPerUnit === 3900
  );
}

{
  const persisted = toPersistedLineItems([
    {
      id: 'qli-1',
      configurationKey: 'k',
      product: { id: 'core-1', name: 'Core P2.5', category: 'Core Series Indoor' } as any,
      config: { width: 1800, height: 1012.5, unit: 'mm', aspectRatio: null },
      cabinetGrid: { columns: 3, rows: 3, totalWidth: 1800, totalHeight: 1012.5 },
      processor: 'VX400',
      mode: null,
      orderQuantity: 1,
      unitPricingSnapshot: makePricing({ unitPrice: 5000, productTotal: 100_000, grandTotal: 500_000 }),
      discount: {
        discountType: 'led',
        discountAmountPerUnit: 5000,
        ledOverride: { amountPerUnit: 5000, ledDiscountMode: 'per_sqft' },
        controllerOverride: { amountPerUnit: 15000 }
      }
    }
  ]);
  assert('persisted line items keep LED override', persisted[0].discount?.ledOverride?.amountPerUnit === 5000);
  assert('persisted line items keep controller override', persisted[0].discount?.controllerOverride?.amountPerUnit === 15000);

  const restored = normalizeQuotationLineItems({
    quotationData: { lineItems: persisted }
  });
  assert(
    'edit hydration restores both overrides from saved line items',
    restored[0].discount?.ledOverride?.amountPerUnit === 5000
      && restored[0].discount?.controllerOverride?.amountPerUnit === 15000
  );
}

{
  const merged = mergeUiDiscountIntoLine(
    { controllerOverride: { amountPerUnit: 12_000 } },
    'led',
    4500,
    { category: 'Core Series Indoor' },
    { columns: 3, rows: 3 },
    { width: 1800, height: 1012.5, unit: 'mm' }
  );
  assert(
    'UI LED override preserves an existing controller override',
    merged?.ledOverride?.amountPerUnit === 4500 && merged?.controllerOverride?.amountPerUnit === 12_000
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
