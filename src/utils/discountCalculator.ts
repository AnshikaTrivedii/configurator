/**
 * PRICE OVERRIDE UTILITY
 *
 * Super Admin "discount" inputs are replacement prices, not amounts to subtract
 * and not percentages (except leftover stored percentage fields).
 *
 * - 'led': entered value replaces the LED unit price (per Ft² / cabinet / unit)
 * - 'controller': entered value replaces the controller price per display unit
 *
 * Grand Total is always rebuilt from the current components after replacement.
 * The override value must never be subtracted from Grand Total.
 */

import { PricingCalculationResult } from './centralizedPricing';
import { Product } from '../types';
import { normalizeOrderQuantity } from './orderQuantity';

/**
 * Determines which discount mode the LED option should use based on product type.
 * - 'per_cabinet': Rental products — override is entered as ₹ per cabinet
 * - 'per_sqft': Standard products — override is entered as ₹ per sq ft
 * - 'per_unit': Fixed/Standee products — override is applied on a single unit
 * - 'none': Jumbo products — no override allowed
 */
export type LedDiscountMode = 'per_cabinet' | 'per_sqft' | 'per_unit' | 'none';

export function getLedDiscountMode(product: Product | any): LedDiscountMode {
  const category = (product?.category || '').toLowerCase();
  const name = (product?.name || '').toLowerCase();
  const id = (product?.id || '').toLowerCase();

  // Jumbo Series — no discount
  if (category.includes('jumbo') || id.startsWith('jumbo-') || name.includes('jumbo series')) {
    return 'none';
  }

  // Digital Standee — unit-level override
  if (category.includes('digital standee')) {
    return 'per_unit';
  }

  // Rental — per cabinet
  if (category.includes('rental')) {
    return 'per_cabinet';
  }

  // Fixed / Nexa — one unit, so the override replaces that unit price
  if (
    product?.isFixed === true ||
    category.includes('nexa') ||
    id.startsWith('nexa-') ||
    name.includes('nexa series')
  ) {
    return 'per_unit';
  }

  // Everything else — per sqft
  return 'per_sqft';
}

/**
 * Calculate the number of units for discount calculation.
 * - Rental: number of cabinets (columns × rows)
 * - Others: screen area in sq ft
 */
export function getDiscountUnits(
  product: Product | any,
  cabinetGrid: { columns: number; rows: number } | null | undefined,
  config?: { width: number; height: number; unit: string }
): number {
  const mode = getLedDiscountMode(product);
  const METERS_TO_FEET = 3.2808399;

  if (mode === 'per_cabinet') {
    return cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
  }

  if (mode === 'per_sqft' && config) {
    const widthInMeters = config.width / 1000;
    const heightInMeters = config.height / 1000;
    const widthInFeet = widthInMeters * METERS_TO_FEET;
    const heightInFeet = heightInMeters * METERS_TO_FEET;
    return Math.round((widthInFeet * heightInFeet) * 100) / 100;
  }

  if (mode === 'per_unit') {
    return 1;
  }

  return 0; // 'none' mode — no discount
}

/**
 * Returns a human-readable label for the discount unit.
 */
export function getDiscountUnitLabel(product: Product | any): string {
  const mode = getLedDiscountMode(product);
  if (mode === 'per_cabinet') return 'per Cabinet';
  if (mode === 'per_sqft') return 'per Sq Ft';
  if (mode === 'per_unit') return 'per Unit';
  return '';
}

export interface DiscountInfo {
  discountType: 'led' | 'controller' | null;
  // For 'controller': leftover stored field (overrides use discountAmountPerUnit)
  discountPercent: number;
  // Replacement unit price (₹ per cabinet, per sqft, per unit, or per controller)
  discountAmountPerUnit: number;
  // For 'led': calculated number of units
  numberOfUnits: number;
  // For 'led': the mode used
  ledDiscountMode: LedDiscountMode;
}

export interface DiscountedPricingResult extends PricingCalculationResult {

  originalProductTotal: number;
  originalProcessorTotal: number;
  originalGrandTotal: number;

  discountedProductTotal: number;
  discountedProcessorTotal: number;
  discountedGrandTotal: number;

  discountInfo: DiscountInfo;
  discountAmount: number; // Reporting only: original component minus replaced component
}

export type PricingComponentsSource = {
  productTotal?: number;
  productSubtotal?: number;
  subtotal?: number;
  processorTotal?: number;
  processorPrice?: number;
  structureTotal?: number;
  structureCost?: number;
  installationTotal?: number;
  installationCost?: number;
  addonsTotal?: number;
  customAddonsTotal?: number;
  customAddonsIncludedInGrandTotal?: boolean;
  discount?: {
    discountedProductTotal?: number;
    discountedProcessorTotal?: number;
  };
};

function asMoney(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function readOriginalAmount(result: PricingCalculationResult, key: 'originalProductTotal' | 'originalProcessorTotal' | 'originalGrandTotal', fallback: number): number {
  const value = (result as any)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Nexa add-ons plus quotation-level custom add-ons already folded into grandTotal. */
export function getPricingExtras(source: PricingComponentsSource): number {
  const addonsTotal = asMoney(source.addonsTotal);
  const customAddonsTotal = source.customAddonsIncludedInGrandTotal
    ? asMoney(source.customAddonsTotal)
    : 0;
  return addonsTotal + customAddonsTotal;
}

/**
 * Rebuild Grand Total from current components after a price replacement.
 * Never subtracts an override or a stored discountAmount from the total.
 */
export function rebuildGrandTotalFromComponents(source: PricingComponentsSource): number {
  const productTotal =
    asMoney(source.discount?.discountedProductTotal) ||
    asMoney(source.productTotal) ||
    asMoney(source.productSubtotal) ||
    asMoney(source.subtotal);
  const processorTotal =
    asMoney(source.discount?.discountedProcessorTotal) ||
    asMoney(source.processorTotal) ||
    asMoney(source.processorPrice);
  const structureTotal = source.structureTotal != null
    ? asMoney(source.structureTotal)
    : asMoney(source.structureCost);
  const installationTotal = source.installationTotal != null
    ? asMoney(source.installationTotal)
    : asMoney(source.installationCost);

  return Math.round(
    productTotal +
    processorTotal +
    structureTotal +
    installationTotal +
    getPricingExtras(source)
  );
}

/**
 * Apply a Super Admin price override to a pricing breakdown.
 *
 * The entered value replaces the LED unit price or the controller unit price.
 * Grand Total is rebuilt from the replaced components. The same override is
 * never subtracted from Grand Total, and stale original* fields are not used
 * in that arithmetic.
 */
export function applyDiscount(
  pricingResult: PricingCalculationResult,
  discountInfo: DiscountInfo | null
): DiscountedPricingResult {

  if (!discountInfo || !discountInfo.discountType) {
    return {
      ...pricingResult,
      originalProductTotal: pricingResult.productTotal,
      originalProcessorTotal: pricingResult.processorTotal,
      originalGrandTotal: pricingResult.grandTotal,
      discountedProductTotal: pricingResult.productTotal,
      discountedProcessorTotal: pricingResult.processorTotal,
      discountedGrandTotal: pricingResult.grandTotal,
      discountInfo: { discountType: null, discountPercent: 0, discountAmountPerUnit: 0, numberOfUnits: 0, ledDiscountMode: 'none' },
      discountAmount: 0
    };
  }

  const originalProductTotal = readOriginalAmount(pricingResult, 'originalProductTotal', pricingResult.productTotal);
  const originalProcessorTotal = readOriginalAmount(pricingResult, 'originalProcessorTotal', pricingResult.processorTotal);
  const originalGrandTotal = readOriginalAmount(pricingResult, 'originalGrandTotal', pricingResult.grandTotal);

  // Start from current totals so a second override (e.g. controller after LED) keeps the other component.
  let discountedProductTotal = pricingResult.productTotal;
  let discountedProcessorTotal = pricingResult.processorTotal;
  let unitPrice = pricingResult.unitPrice;
  let productSubtotal = pricingResult.productSubtotal;
  let productGST = pricingResult.productGST;
  let processorPrice = pricingResult.processorPrice;
  let processorGST = pricingResult.processorGST;
  let discountAmount = 0;
  let quantity = pricingResult.quantity;
  const orderQty = normalizeOrderQuantity(pricingResult.orderQuantity);

  switch (discountInfo.discountType) {
    case 'led': {
      const { discountAmountPerUnit, numberOfUnits, ledDiscountMode } = discountInfo;

      if (ledDiscountMode !== 'none' && discountAmountPerUnit > 0 && numberOfUnits > 0) {
        const quantityForRecalc = pricingResult.quantity > 0 ? pricingResult.quantity : numberOfUnits;
        const gstRate = pricingResult.productSubtotal > 0
          ? (pricingResult.productGST / pricingResult.productSubtotal)
          : 0;

        unitPrice = Math.round(discountAmountPerUnit * 100) / 100;
        quantity = quantityForRecalc;
        productSubtotal = Math.round((quantityForRecalc * unitPrice * orderQty) * 100) / 100;
        productGST = Math.round((productSubtotal * gstRate) * 100) / 100;
        discountedProductTotal = Math.round((productSubtotal + productGST) * 100) / 100;
        discountAmount = Math.round((originalProductTotal - discountedProductTotal) * 100) / 100;
      }
      break;
    }

    case 'controller': {
      const { discountAmountPerUnit } = discountInfo;

      if (discountAmountPerUnit > 0) {
        const overriddenControllerUnitPrice = Math.round(discountAmountPerUnit * 100) / 100;
        discountedProcessorTotal = Math.round((overriddenControllerUnitPrice * orderQty) * 100) / 100;
        processorPrice = discountedProcessorTotal;
        processorGST = 0;
        discountAmount = Math.round((originalProcessorTotal - discountedProcessorTotal) * 100) / 100;
      }
      break;
    }

    default:
      break;
  }

  const discountedGrandTotal = rebuildGrandTotalFromComponents({
    productTotal: discountedProductTotal,
    processorTotal: discountedProcessorTotal,
    structureTotal: pricingResult.structureTotal,
    installationTotal: pricingResult.installationTotal,
    addonsTotal: pricingResult.addonsTotal,
    customAddonsTotal: pricingResult.customAddonsTotal,
    customAddonsIncludedInGrandTotal: pricingResult.customAddonsIncludedInGrandTotal
  });

  const unitGrandTotal = orderQty > 0
    ? Math.round(discountedGrandTotal / orderQty)
    : discountedGrandTotal;

  return {
    ...pricingResult,
    unitPrice,
    quantity,
    orderQuantity: orderQty,
    unitGrandTotal,
    productSubtotal,
    productGST,
    productTotal: discountedProductTotal,
    processorPrice,
    processorGST,
    processorTotal: discountedProcessorTotal,
    grandTotal: discountedGrandTotal,
    originalProductTotal,
    originalProcessorTotal,
    originalGrandTotal,
    discountedProductTotal,
    discountedProcessorTotal,
    discountedGrandTotal,
    discountInfo,
    discountAmount
  };
}

/** Persisted Super Admin replacement-price override on a quotation line. */
export type SavedLineDiscount = {
  discountType?: string | null;
  discountPercent?: number;
  discountAmountPerUnit?: number;
  discountAmount?: number;
  numberOfUnits?: number;
  ledDiscountMode?: string;
  originalProductTotal?: number;
  originalProcessorTotal?: number;
  originalGrandTotal?: number;
  discountedProductTotal?: number;
  discountedProcessorTotal?: number;
  discountedGrandTotal?: number;
  ledOverride?: { amountPerUnit?: number; numberOfUnits?: number; ledDiscountMode?: string };
  controllerOverride?: { amountPerUnit?: number };
};

export type LedOverrideAmount = {
  amountPerUnit: number;
  numberOfUnits?: number;
  ledDiscountMode?: LedDiscountMode | string;
};

export type ControllerOverrideAmount = {
  amountPerUnit: number;
};

export function getLedOverrideFromDiscount(
  discount?: SavedLineDiscount | null
): LedOverrideAmount | null {
  if (!discount) return null;
  const amount =
    discount.ledOverride?.amountPerUnit ??
    (discount.discountType === 'led' ? discount.discountAmountPerUnit : 0) ??
    0;
  if (!(amount > 0)) return null;
  return {
    amountPerUnit: amount,
    numberOfUnits: discount.ledOverride?.numberOfUnits ?? discount.numberOfUnits,
    ledDiscountMode: discount.ledOverride?.ledDiscountMode ?? discount.ledDiscountMode
  };
}

export function getControllerOverrideFromDiscount(
  discount?: SavedLineDiscount | null
): ControllerOverrideAmount | null {
  if (!discount) return null;
  const amount =
    discount.controllerOverride?.amountPerUnit ??
    (discount.discountType === 'controller' ? discount.discountAmountPerUnit : 0) ??
    0;
  if (!(amount > 0)) return null;
  return { amountPerUnit: amount };
}

export function savedLineDiscountHasOverride(discount?: SavedLineDiscount | null): boolean {
  return !!(getLedOverrideFromDiscount(discount) || getControllerOverrideFromDiscount(discount));
}

/**
 * Apply persisted LED and/or controller replacement prices to a catalog breakdown.
 * LED is applied first, then controller, each at most once. Unit counts are
 * recomputed from the current matrix so a later size change keeps the saved
 * per-unit override without using the original catalog unit price.
 */
export function applySavedPriceOverrides(
  catalogPricing: PricingCalculationResult,
  discount: SavedLineDiscount | null | undefined,
  product: Product | any,
  cabinetGrid: { columns: number; rows: number } | null | undefined,
  config?: { width: number; height: number; unit: string }
): DiscountedPricingResult {
  const led = getLedOverrideFromDiscount(discount);
  const controller = getControllerOverrideFromDiscount(discount);

  if (!led && !controller) {
    return applyDiscount(catalogPricing, null);
  }

  let priced: PricingCalculationResult = catalogPricing;

  if (led) {
    const ledMode = (led.ledDiscountMode as LedDiscountMode) || getLedDiscountMode(product);
    const units = getDiscountUnits(product, cabinetGrid, config);
    priced = applyDiscount(priced, {
      discountType: 'led',
      discountPercent: 0,
      discountAmountPerUnit: led.amountPerUnit,
      numberOfUnits: units > 0 ? units : (led.numberOfUnits || 0),
      ledDiscountMode: ledMode
    });
  }

  if (controller) {
    priced = applyDiscount(priced, {
      discountType: 'controller',
      discountPercent: 0,
      discountAmountPerUnit: controller.amountPerUnit,
      numberOfUnits: 1,
      ledDiscountMode: 'none'
    });
  }

  const discounted = priced as DiscountedPricingResult;
  const units = led ? getDiscountUnits(product, cabinetGrid, config) : 0;
  const ledMode = led
    ? ((led.ledDiscountMode as LedDiscountMode) || getLedDiscountMode(product))
    : 'none';

  return {
    ...discounted,
    discountInfo: {
      discountType: led ? 'led' : 'controller',
      discountPercent: 0,
      discountAmountPerUnit: led?.amountPerUnit || controller?.amountPerUnit || 0,
      numberOfUnits: led ? (units > 0 ? units : (led.numberOfUnits || 0)) : 1,
      ledDiscountMode: ledMode
    }
  };
}

/** Rebuild the persistable discount blob after a catalog + override reprice. */
export function buildPersistedDiscount(
  discount: SavedLineDiscount | null | undefined,
  priced: DiscountedPricingResult,
  product: Product | any,
  cabinetGrid: { columns: number; rows: number } | null | undefined,
  config?: { width: number; height: number; unit: string }
): SavedLineDiscount | undefined {
  const led = getLedOverrideFromDiscount(discount);
  const controller = getControllerOverrideFromDiscount(discount);
  if (!led && !controller) return undefined;

  const units = led ? getDiscountUnits(product, cabinetGrid, config) : 0;
  const ledMode = led
    ? ((led.ledDiscountMode as LedDiscountMode) || getLedDiscountMode(product))
    : 'none';
  const numberOfUnits = led ? (units > 0 ? units : (led.numberOfUnits || 0)) : 1;

  return {
    discountType: led ? 'led' : 'controller',
    discountPercent: 0,
    discountAmountPerUnit: led?.amountPerUnit || controller?.amountPerUnit || 0,
    numberOfUnits,
    ledDiscountMode: ledMode,
    ledOverride: led
      ? {
          amountPerUnit: led.amountPerUnit,
          numberOfUnits,
          ledDiscountMode: ledMode
        }
      : undefined,
    controllerOverride: controller
      ? { amountPerUnit: controller.amountPerUnit }
      : undefined,
    originalProductTotal: priced.originalProductTotal,
    originalProcessorTotal: priced.originalProcessorTotal,
    originalGrandTotal: priced.originalGrandTotal,
    discountedProductTotal: priced.discountedProductTotal,
    discountedProcessorTotal: priced.discountedProcessorTotal,
    discountedGrandTotal: priced.discountedGrandTotal,
    discountAmount: priced.discountAmount
  };
}

/**
 * Merge a Super Admin QuoteModal UI override into a line's saved discount.
 * Selecting a type updates that override and preserves the other type.
 * Selecting "No Discount" (null) clears both overrides.
 */
export function mergeUiDiscountIntoLine(
  existing: SavedLineDiscount | null | undefined,
  uiType: 'led' | 'controller' | null,
  uiAmount: number,
  product: Product | any,
  cabinetGrid: { columns: number; rows: number } | null | undefined,
  config?: { width: number; height: number; unit: string }
): SavedLineDiscount | undefined {
  const existingLed = getLedOverrideFromDiscount(existing);
  const existingController = getControllerOverrideFromDiscount(existing);

  if (uiType === 'led' && uiAmount > 0) {
    const ledMode = getLedDiscountMode(product);
    const units = getDiscountUnits(product, cabinetGrid, config);
    return {
      discountType: 'led',
      discountPercent: 0,
      discountAmountPerUnit: uiAmount,
      numberOfUnits: units,
      ledDiscountMode: ledMode,
      ledOverride: {
        amountPerUnit: uiAmount,
        numberOfUnits: units,
        ledDiscountMode: ledMode
      },
      controllerOverride: existingController
        ? { amountPerUnit: existingController.amountPerUnit }
        : undefined
    };
  }

  if (uiType === 'controller' && uiAmount > 0) {
    return {
      discountType: 'controller',
      discountPercent: 0,
      discountAmountPerUnit: uiAmount,
      numberOfUnits: 1,
      ledDiscountMode: 'none',
      ledOverride: existingLed
        ? {
            amountPerUnit: existingLed.amountPerUnit,
            numberOfUnits: existingLed.numberOfUnits,
            ledDiscountMode: existingLed.ledDiscountMode
          }
        : undefined,
      controllerOverride: { amountPerUnit: uiAmount }
    };
  }

  return undefined;
}

/**
 * QuoteModal save merge.
 * Until the discount form has loaded the saved line, keep that line's override.
 * After it has loaded, "No Discount" clears both overrides and a positive
 * LED or controller value replaces only that side.
 */
export function discountForQuotationSave(
  existing: SavedLineDiscount | null | undefined,
  uiType: 'led' | 'controller' | null,
  uiAmount: number,
  formReady: boolean,
  product: Product | any,
  cabinetGrid: { columns: number; rows: number } | null | undefined,
  config?: { width: number; height: number; unit: string }
): SavedLineDiscount | undefined {
  if (!formReady) return existing || undefined;
  return mergeUiDiscountIntoLine(existing, uiType, uiAmount, product, cabinetGrid, config);
}
