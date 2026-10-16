/**
 * Edit / save / reopen pricing cycle.
 * A Super Admin override is a replacement price. Reopening Edit must not
 * change Grand Total, and a second save must not drop the other override.
 *
 * Run: npx --yes tsx src/utils/editPricingCycle.test.ts
 */

import { products } from '../data/products';
import { calculateCentralizedPricing } from './centralizedPricing';
import {
  applySavedPriceOverrides,
  buildPersistedDiscount,
  discountForQuotationSave,
  getControllerOverrideFromDiscount,
  getLedOverrideFromDiscount
} from './discountCalculator';
import { generateConfigurationHtml } from './docxGenerator';
import { buildExactPricingBreakdownForPdf, resolveDisplayedProductSubtotal } from './exactPricingBreakdownForPdf';
import {
  buildExactPricingBreakdownFromCartItem,
  chooseHydratedLinePricing,
  getQuotationDisplayTotal,
  normalizeQuotationLineItems,
  repriceCartLineItem,
  sumLineItemGrandTotals,
  syncSingleProductLineForSave,
  toPersistedLineItems
} from './quotationLineItems';
import { QuotationLineItem } from '../contexts/QuotationCartContext';

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

function money(value: unknown): number {
  return Math.round(Number(value) || 0);
}

function close(a: unknown, b: unknown): boolean {
  return Math.abs(money(a) - money(b)) <= 1;
}

function productById(id: string) {
  const product = products.find(p => p.id === id);
  if (!product) throw new Error(`Missing product ${id}`);
  return product;
}

function priceLine(
  productId: string,
  grid: { columns: number; rows: number; totalWidth: number; totalHeight: number },
  processor: string | null,
  discount?: QuotationLineItem['discount']
): QuotationLineItem {
  const product = productById(productId);
  const config = {
    width: grid.totalWidth,
    height: grid.totalHeight,
    unit: 'mm' as const,
    aspectRatio: null
  };
  return repriceCartLineItem({
    id: `line-${productId}`,
    configurationKey: '',
    product,
    config,
    cabinetGrid: grid,
    processor,
    mode: null,
    orderQuantity: 1,
    discount,
    userType: 'End User'
  }, 'endUser');
}

function quotationFrom(lines: QuotationLineItem[]) {
  const persisted = toPersistedLineItems(lines);
  const grand = sumLineItemGrandTotals(lines);
  const primaryBreakdown = buildExactPricingBreakdownFromCartItem(lines[0]) || {};
  return {
    totalPrice: grand,
    userType: 'endUser',
    exactPricingBreakdown: {
      ...primaryBreakdown,
      grandTotal: grand,
      customAddons: [],
      customAddonsTotal: 0,
      customAddonsIncludedInGrandTotal: true
    },
    quotationData: {
      lineItems: persisted,
      customAddons: []
    }
  };
}

function reopen(quotation: ReturnType<typeof quotationFrom>): QuotationLineItem[] {
  const normalized = normalizeQuotationLineItems(quotation);
  return normalized.map((li, index) => {
    const product = products.find(p => p.id === li.productId) || li.product;
    if (!product) throw new Error('Edit could not resolve a product');
    const repriced = repriceCartLineItem({
      id: li.id || `restored-${index}`,
      configurationKey: '',
      product,
      config: li.config,
      cabinetGrid: li.cabinetGrid,
      processor: li.processor || null,
      mode: li.mode || null,
      wireType: li.wireType,
      nexaAddons: li.nexaAddons || [],
      orderQuantity: li.orderQuantity,
      discount: li.discount,
      userType: 'End User'
    }, 'endUser');
    return chooseHydratedLinePricing(repriced, repriced.unitPricingSnapshot, quotation);
  });
}

/** Quote modal reopened with no edits: the visible type is the last saved side. */
function saveAgainUnchanged(lines: QuotationLineItem[]): QuotationLineItem[] {
  return lines.map(li => {
    const led = getLedOverrideFromDiscount(li.discount);
    const controller = getControllerOverrideFromDiscount(li.discount);
    const uiType = led ? 'led' as const : (controller ? 'controller' as const : null);
    const uiAmount = led?.amountPerUnit || controller?.amountPerUnit || 0;
    const discount = discountForQuotationSave(
      li.discount,
      uiType,
      uiAmount,
      true,
      li.product,
      li.cabinetGrid,
      li.config
    );
    return repriceCartLineItem({ ...li, discount }, 'endUser');
  });
}

function pdfGrand(line: QuotationLineItem): number {
  const source = buildExactPricingBreakdownFromCartItem(line) || {};
  const breakdown = buildExactPricingBreakdownForPdf({
    ...source,
    customAddonsIncludedInGrandTotal: true,
    customAddonsTotal: 0
  });
  const html = generateConfigurationHtml(
    line.config,
    line.product,
    line.cabinetGrid,
    line.processor || undefined,
    undefined,
    { fullName: 'A', email: 'a@b.c', phoneNumber: '1', userType: 'End User' },
    null,
    'Q-TEST',
    undefined,
    breakdown as any
  );
  const match = html.match(/GRAND TOTAL[\s\S]{0,500}?₹([0-9,]+\.\d{2})/);
  if (!match) throw new Error('PDF grand total was not rendered');
  return Number(match[1].replace(/,/g, ''));
}

function assertStableCycle(label: string, line: QuotationLineItem) {
  const savedGrand = money(line.unitPricingSnapshot?.grandTotal);
  const saved = quotationFrom([line]);
  const firstEdit = reopen(saved);
  assert(
    `${label}: edit reopen keeps Grand Total`,
    close(firstEdit[0].unitPricingSnapshot?.grandTotal, savedGrand),
    `saved ${savedGrand}, edit ${firstEdit[0].unitPricingSnapshot?.grandTotal}`
  );
  const savedAgain = saveAgainUnchanged(firstEdit);
  const secondEdit = reopen(quotationFrom(savedAgain));
  assert(
    `${label}: second save and reopen keeps Grand Total`,
    close(secondEdit[0].unitPricingSnapshot?.grandTotal, savedGrand),
    `saved ${savedGrand}, second ${secondEdit[0].unitPricingSnapshot?.grandTotal}`
  );
  assert(
    `${label}: downloaded PDF matches the saved Grand Total`,
    close(pdfGrand(secondEdit[0]), savedGrand),
    `pdf ${pdfGrand(secondEdit[0])}, saved ${savedGrand}`
  );
  const displayed = getQuotationDisplayTotal(quotationFrom(secondEdit));
  assert(
    `${label}: dashboard total matches the saved Grand Total`,
    close(displayed, savedGrand),
    `dashboard ${displayed}, saved ${savedGrand}`
  );
  const components = secondEdit[0].unitPricingSnapshot!;
  const withoutGst = money(components.productTotal)
    + money(components.processorTotal)
    + money(components.structureTotal)
    + money(components.installationTotal)
    + money(components.addonsTotal);
  assert(
    `${label}: Grand Total is the component sum and does not add GST`,
    close(components.grandTotal, withoutGst)
  );
  return secondEdit[0];
}

const coreGrid = { columns: 3, rows: 3, totalWidth: 1800, totalHeight: 1012.5 };
const coreId = 'bellatrix-indoor-cob-p0.9';

console.log('Edit pricing cycle');

{
  const catalog = priceLine(coreId, coreGrid, 'TB40');
  const ledDiscount = discountForQuotationSave(undefined, 'led', 2000, true, catalog.product, coreGrid, catalog.config);
  const led = priceLine(coreId, coreGrid, 'TB40', ledDiscount);
  assert('LED override replaces the catalog unit price', led.unitPricingSnapshot?.unitPrice === 2000);
  assert('LED override changes Grand Total', !close(led.unitPricingSnapshot?.grandTotal, catalog.unitPricingSnapshot?.grandTotal));
  const reopened = assertStableCycle('LED override', led);
  assert('LED override is still on the line after two edit cycles', getLedOverrideFromDiscount(reopened.discount)?.amountPerUnit === 2000);
  const subtotal = resolveDisplayedProductSubtotal({
    unitPrice: 49300,
    quantity: reopened.unitPricingSnapshot?.quantity,
    orderQuantity: 1,
    subtotal: 49300 * (reopened.unitPricingSnapshot?.quantity || 0),
    productSubtotal: reopened.unitPricingSnapshot?.productSubtotal,
    discount: reopened.discount as any
  });
  assert(
    'dashboard product subtotal uses the LED replacement, not the catalog subtotal',
    close(subtotal, reopened.unitPricingSnapshot?.productSubtotal)
  );
}

{
  const controllerDiscount = discountForQuotationSave(undefined, 'controller', 10000, true, productById(coreId), coreGrid, {
    width: coreGrid.totalWidth,
    height: coreGrid.totalHeight,
    unit: 'mm'
  });
  const controller = priceLine(coreId, coreGrid, 'TB40', controllerDiscount);
  assert('controller override replaces the processor price', controller.unitPricingSnapshot?.processorTotal === 10000);
  assert('controller override leaves the catalog LED unit price', controller.unitPricingSnapshot?.unitPrice === productById(coreId).price);
  const reopened = assertStableCycle('controller override', controller);
  assert(
    'controller override survives two edit cycles',
    getControllerOverrideFromDiscount(reopened.discount)?.amountPerUnit === 10000
  );
}

{
  const ledDiscount = discountForQuotationSave(undefined, 'led', 2000, true, productById(coreId), coreGrid, {
    width: coreGrid.totalWidth,
    height: coreGrid.totalHeight,
    unit: 'mm'
  });
  const bothDiscount = discountForQuotationSave(ledDiscount, 'controller', 10000, true, productById(coreId), coreGrid, {
    width: coreGrid.totalWidth,
    height: coreGrid.totalHeight,
    unit: 'mm'
  });
  const both = priceLine(coreId, coreGrid, 'TB40', bothDiscount);
  assert('both overrides set the LED unit price', both.unitPricingSnapshot?.unitPrice === 2000);
  assert('both overrides set the controller price', both.unitPricingSnapshot?.processorTotal === 10000);
  assert(
    'saving as controller does not drop the LED override',
    getLedOverrideFromDiscount(both.discount)?.amountPerUnit === 2000
      && getControllerOverrideFromDiscount(both.discount)?.amountPerUnit === 10000
  );
  const reopened = assertStableCycle('LED and controller overrides', both);
  assert(
    'both overrides are still independent after two edit cycles',
    getLedOverrideFromDiscount(reopened.discount)?.amountPerUnit === 2000
      && getControllerOverrideFromDiscount(reopened.discount)?.amountPerUnit === 10000
  );
}

{
  const ledDiscount = discountForQuotationSave(undefined, 'led', 2000, true, productById(coreId), coreGrid, {
    width: coreGrid.totalWidth,
    height: coreGrid.totalHeight,
    unit: 'mm'
  });
  const led = priceLine(coreId, coreGrid, 'TB40', ledDiscount);
  const nextGrid = { columns: 4, rows: 3, totalWidth: 2400, totalHeight: 1012.5 };
  const resized = syncSingleProductLineForSave(
    [led],
    { width: nextGrid.totalWidth, height: nextGrid.totalHeight, unit: 'mm' },
    nextGrid,
    'endUser'
  )[0];
  const qty = resized.unitPricingSnapshot?.quantity || 0;
  const expectedSubtotal = Math.round(2000 * qty * 100) / 100;
  assert('matrix change keeps the LED replacement unit price', resized.unitPricingSnapshot?.unitPrice === 2000);
  assert(
    'matrix change recalculates the product subtotal from the replacement unit price',
    close(resized.unitPricingSnapshot?.productSubtotal, expectedSubtotal),
    `subtotal ${resized.unitPricingSnapshot?.productSubtotal}, expected ${expectedSubtotal}`
  );
  const snap = resized.unitPricingSnapshot!;
  const expectedGrand = money(snap.productTotal) + money(snap.processorTotal) + money(snap.structureTotal) + money(snap.installationTotal);
  assert(
    'matrix change Grand Total follows the new subtotal',
    close(snap.grandTotal, expectedGrand) && !close(snap.grandTotal, led.unitPricingSnapshot?.grandTotal)
  );
  assertStableCycle('LED override after a matrix change', resized);
}

{
  const otherId = 'bellatrix-indoor-cob-p1.25';
  const otherGrid = { columns: 2, rows: 2, totalWidth: 1200, totalHeight: 675 };
  const ledDiscount = discountForQuotationSave(undefined, 'led', 1500, true, productById(coreId), coreGrid, {
    width: coreGrid.totalWidth,
    height: coreGrid.totalHeight,
    unit: 'mm'
  });
  const first = priceLine(coreId, coreGrid, 'TB40', ledDiscount);
  const second = priceLine(otherId, otherGrid, 'TB40');
  const savedGrand = sumLineItemGrandTotals([first, second]);
  const edited = reopen(quotationFrom([first, second]));
  assert('multi-product edit keeps the quotation Grand Total', close(sumLineItemGrandTotals(edited), savedGrand));
  assert('multi-product edit does not copy the LED override onto the second product', !getLedOverrideFromDiscount(edited[1].discount));
  assert('the second product stays on its catalog Grand Total', close(edited[1].unitPricingSnapshot?.grandTotal, second.unitPricingSnapshot?.grandTotal));
  const savedAgain = saveAgainUnchanged(edited);
  const secondEdit = reopen(quotationFrom(savedAgain));
  assert('multi-product second edit keeps the quotation Grand Total', close(sumLineItemGrandTotals(secondEdit), savedGrand));
}

{
  const rental = productById('rental-outdoor-p4.8');
  const grid = { columns: 4, rows: 1, totalWidth: 2304, totalHeight: 576 };
  const catalog = calculateCentralizedPricing(rental, grid, 'TB40', 'endUser', {
    width: grid.totalWidth,
    height: grid.totalHeight,
    unit: 'mm',
    aspectRatio: null
  });
  assert('Bellatrix rental catalog excludes structure and installation', catalog.structureTotal === 0 && catalog.installationTotal === 0);
  const led = priceLine('rental-outdoor-p4.8', grid, 'TB40', discountForQuotationSave(
    undefined,
    'led',
    20000,
    true,
    rental,
    grid,
    { width: grid.totalWidth, height: grid.totalHeight, unit: 'mm' }
  ));
  assert('Bellatrix rental override still excludes structure and installation', led.unitPricingSnapshot?.structureTotal === 0 && led.unitPricingSnapshot?.installationTotal === 0);
  assertStableCycle('Bellatrix rental LED override', led);

  const html = generateConfigurationHtml(
    { width: 2304, height: 576, unit: 'mm', aspectRatio: null },
    rental,
    grid,
    'TB40',
    undefined,
    { fullName: 'A', email: 'a@b.c', phoneNumber: '1', userType: 'End User' },
    null,
    'Q-RENT',
    undefined,
    {
      unitPrice: 28125,
      quantity: 4,
      orderQuantity: 1,
      subtotal: 112500,
      productSubtotal: 112500,
      productTotal: 112500,
      processorPrice: 35000,
      processorTotal: 35000,
      structureCost: 0,
      structureTotal: 0,
      installationCost: 0,
      installationTotal: 0,
      grandTotal: 90000,
      customAddonsIncludedInGrandTotal: true,
      customAddonsTotal: 0,
      discount: {
        discountType: 'controller',
        discountAmountPerUnit: 10000,
        ledOverride: { amountPerUnit: 20000, numberOfUnits: 4, ledDiscountMode: 'per_cabinet' },
        controllerOverride: { amountPerUnit: 10000 },
        discountedProcessorTotal: 10000,
        discountedGrandTotal: 90000
      }
    } as any
  );
  const match = html.match(/GRAND TOTAL[\s\S]{0,500}?₹([0-9,]+\.\d{2})/);
  const rendered = Number((match?.[1] || '0').replace(/,/g, ''));
  assert(
    'a controller-typed discount does not drop the LED override from the rental PDF Grand Total',
    rendered === 90000,
    `pdf ${rendered}`
  );
}

{
  const nexa = productById('nexa-p125-108');
  const grid = {
    columns: 1,
    rows: 1,
    totalWidth: nexa.cabinetDimensions.width,
    totalHeight: nexa.cabinetDimensions.height
  };
  const overridden = priceLine('nexa-p125-108', grid, null, discountForQuotationSave(
    undefined,
    'led',
    500000,
    true,
    nexa,
    grid,
    { width: grid.totalWidth, height: grid.totalHeight, unit: 'mm' }
  ));
  assert('Nexa quantity stays 1', overridden.unitPricingSnapshot?.quantity === 1);
  assert('Nexa override replaces the unit price once', overridden.unitPricingSnapshot?.productSubtotal === 500000);
  assert('Nexa Grand Total excludes processor, structure, and installation', overridden.unitPricingSnapshot?.processorTotal === 0 && overridden.unitPricingSnapshot?.structureTotal === 0 && overridden.unitPricingSnapshot?.grandTotal === 500000);
  assertStableCycle('Nexa LED override', overridden);
}

{
  const product = productById(coreId);
  const grid = coreGrid;
  const config = { width: grid.totalWidth, height: grid.totalHeight, unit: 'mm' as const, aspectRatio: null };
  const catalog = calculateCentralizedPricing(product, grid, 'TB40', 'endUser', config);
  const priced = applySavedPriceOverrides(catalog, {
    discountType: 'led',
    ledOverride: { amountPerUnit: 2000, ledDiscountMode: 'per_sqft' },
    controllerOverride: { amountPerUnit: 10000 }
  }, product, grid, config);
  const persisted = buildPersistedDiscount({
    ledOverride: { amountPerUnit: 2000, ledDiscountMode: 'per_sqft' },
    controllerOverride: { amountPerUnit: 10000 }
  }, priced, product, grid, config);
  assert(
    'persisted discount keeps both replacements when the type is led',
    persisted?.discountType === 'led'
      && persisted.ledOverride?.amountPerUnit === 2000
      && persisted.controllerOverride?.amountPerUnit === 10000
  );
  assert(
    'applying both replacements once matches the repriced Grand Total',
    close(priced.grandTotal, priced.productTotal + priced.processorTotal + priced.structureTotal + priced.installationTotal)
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
