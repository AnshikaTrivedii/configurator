/**
 * DISCOUNT CALCULATION UTILITY
 * 
 * This utility applies discounts to pricing breakdowns silently.
 * Discounts are applied internally but never shown in PDF/Word output.
 * 
 * Discount Types:
 * - 'led': Apply discount to LED Screen Price (Product Total A)
 *   → For Rental products: discount is per-cabinet (amount × number of cabinets)
 *   → For Jumbo/Standee products: discount is NOT allowed
 *   → For all other products: discount is per-sqft (amount × total sqft)
 * - 'controller': Apply discount to Controller Price (Processor Total B) — percentage based
 */

import { PricingCalculationResult } from './centralizedPricing';
import { Product } from '../types';

/**
 * Determines which discount mode the LED option should use based on product type.
 * - 'per_cabinet': Rental products — discount entered as ₹ per cabinet
 * - 'per_sqft': Standard products — discount entered as ₹ per sq ft
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
  // For 'controller': percentage-based (0-100)
  discountPercent: number;
  // For 'led': unit price override value (₹ per cabinet or ₹ per sqft)
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
  discountAmount: number; // Total discount amount applied
}

/**
 * Apply discount to pricing breakdown
 * 
 * @param pricingResult - Original pricing calculation result
 * @param discountInfo - Discount type and parameters
 * @returns Discounted pricing result with original and discounted values
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

  const originalProductTotal = (pricingResult as any).originalProductTotal || pricingResult.productTotal;
  const originalProcessorTotal = (pricingResult as any).originalProcessorTotal || pricingResult.processorTotal;
  const originalGrandTotal = (pricingResult as any).originalGrandTotal || pricingResult.grandTotal;

  let discountedProductTotal = originalProductTotal;
  let discountedProcessorTotal = originalProcessorTotal;
  let discountedGrandTotal = originalGrandTotal;
  let discountAmount = 0;

  const sumOfComponents = originalProductTotal + originalProcessorTotal + pricingResult.structureTotal + pricingResult.installationTotal;
  const unaccountedDifference = originalGrandTotal - sumOfComponents;

  switch (discountInfo.discountType) {
    case 'led': {
      // LED override: entered value is NEW UNIT PRICE
      const { discountAmountPerUnit, numberOfUnits, ledDiscountMode } = discountInfo;

      if (ledDiscountMode === 'none' || discountAmountPerUnit <= 0 || numberOfUnits <= 0) {
        // No override for jumbo/standee or invalid values
        break;
      }

      const quantityForRecalc = pricingResult.quantity > 0 ? pricingResult.quantity : numberOfUnits;
      const gstRate = pricingResult.productSubtotal > 0
        ? (pricingResult.productGST / pricingResult.productSubtotal)
        : 0;

      const overriddenUnitPrice = Math.round(discountAmountPerUnit * 100) / 100;
      const overriddenSubtotal = Math.round((quantityForRecalc * overriddenUnitPrice) * 100) / 100;
      const overriddenGst = Math.round((overriddenSubtotal * gstRate) * 100) / 100;
      discountedProductTotal = Math.round((overriddenSubtotal + overriddenGst) * 100) / 100;

      // Keep discountAmount for compatibility with existing stored payloads/UI.
      discountAmount = Math.round((originalProductTotal - discountedProductTotal) * 100) / 100;

      discountedGrandTotal = Math.round(
        discountedProductTotal +
        originalProcessorTotal +
        pricingResult.structureTotal +
        pricingResult.installationTotal +
        unaccountedDifference
      );

      return {
        ...pricingResult,
        unitPrice: overriddenUnitPrice,
        quantity: quantityForRecalc,
        productSubtotal: overriddenSubtotal,
        productGST: overriddenGst,
        productTotal: discountedProductTotal,
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

    case 'controller': {
      // Controller override: entered value is NEW CONTROLLER PRICE
      const { discountAmountPerUnit } = discountInfo;

      if (discountAmountPerUnit <= 0) {
        break;
      }

      discountedProcessorTotal = Math.round(discountAmountPerUnit * 100) / 100;
      discountAmount = Math.round((originalProcessorTotal - discountedProcessorTotal) * 100) / 100;

      discountedGrandTotal = Math.round(
        originalProductTotal +
        discountedProcessorTotal +
        pricingResult.structureTotal +
        pricingResult.installationTotal +
        unaccountedDifference
      );
      break;
    }

    default:
      discountAmount = 0;
      break;
  }

  return {
    ...pricingResult,

    productTotal: discountedProductTotal,
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
