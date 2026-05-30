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
 * - 'none': Jumbo & Standee products — no discount allowed
 */
export type LedDiscountMode = 'per_cabinet' | 'per_sqft' | 'none';

export function getLedDiscountMode(product: Product | any): LedDiscountMode {
  const category = (product?.category || '').toLowerCase();
  const name = (product?.name || '').toLowerCase();
  const id = (product?.id || '').toLowerCase();

  // Jumbo Series — no discount
  if (category.includes('jumbo') || id.startsWith('jumbo-') || name.includes('jumbo series')) {
    return 'none';
  }

  // Digital Standee — no discount
  if (category.includes('digital standee')) {
    return 'none';
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

  return 0; // 'none' mode — no discount
}

/**
 * Returns a human-readable label for the discount unit.
 */
export function getDiscountUnitLabel(product: Product | any): string {
  const mode = getLedDiscountMode(product);
  if (mode === 'per_cabinet') return 'per Cabinet';
  if (mode === 'per_sqft') return 'per Sq Ft';
  return '';
}

export interface DiscountInfo {
  discountType: 'led' | 'controller' | null;
  // For 'controller': percentage-based (0-100)
  discountPercent: number;
  // For 'led': amount-based per unit (₹ per cabinet or ₹ per sqft)
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
      // LED discount: amount-based per unit
      const { discountAmountPerUnit, numberOfUnits, ledDiscountMode } = discountInfo;

      if (ledDiscountMode === 'none' || discountAmountPerUnit <= 0 || numberOfUnits <= 0) {
        // No discount for jumbo/standee or invalid values
        break;
      }

      discountAmount = Math.round((discountAmountPerUnit * numberOfUnits) * 100) / 100;
      discountedProductTotal = Math.round((originalProductTotal - discountAmount) * 100) / 100;

      // Don't let product total go below 0
      if (discountedProductTotal < 0) {
        discountAmount = originalProductTotal;
        discountedProductTotal = 0;
      }

      discountedGrandTotal = Math.round(
        discountedProductTotal +
        originalProcessorTotal +
        pricingResult.structureTotal +
        pricingResult.installationTotal +
        unaccountedDifference
      );
      break;
    }

    case 'controller': {
      // Controller discount: percentage-based (unchanged from original)
      const { discountPercent } = discountInfo;

      if (discountPercent <= 0 || discountPercent > 100) {
        break;
      }

      discountAmount = Math.round((originalProcessorTotal * discountPercent / 100) * 100) / 100;
      discountedProcessorTotal = Math.round((originalProcessorTotal - discountAmount) * 100) / 100;

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
