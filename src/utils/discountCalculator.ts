/**
 * DISCOUNT CALCULATION UTILITY
 * 
 * This utility applies discounts to pricing breakdowns silently.
 * Discounts are applied internally but never shown in PDF/Word output.
 * 
 * Discount Types:
 * - 'led': Apply discount to LED Screen Price (Product Total A)
 * - 'controller': Apply discount to Controller Price (Processor Total B)
 * - 'total': Apply discount to Grand Total (A + B + C + D)
 */

import { PricingCalculationResult } from './centralizedPricing';

export interface DiscountInfo {
  discountType: 'led' | 'controller' | 'total' | null;
  discountPercent: number; // 0-100
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
 * @param discountInfo - Discount type and percentage
 * @returns Discounted pricing result with original and discounted values
 */
export function applyDiscount(
  pricingResult: PricingCalculationResult,
  discountInfo: DiscountInfo | null
): DiscountedPricingResult {

  if (!discountInfo || !discountInfo.discountType || discountInfo.discountPercent <= 0) {
    return {
      ...pricingResult,
      originalProductTotal: pricingResult.productTotal,
      originalProcessorTotal: pricingResult.processorTotal,
      originalGrandTotal: pricingResult.grandTotal,
      discountedProductTotal: pricingResult.productTotal,
      discountedProcessorTotal: pricingResult.processorTotal,
      discountedGrandTotal: pricingResult.grandTotal,
      discountInfo: { discountType: null, discountPercent: 0 },
      discountAmount: 0
    };
  }

  const { discountType, discountPercent } = discountInfo;

  if (discountPercent < 0 || discountPercent > 100) {

    return {
      ...pricingResult,
      originalProductTotal: pricingResult.productTotal,
      originalProcessorTotal: pricingResult.processorTotal,
      originalGrandTotal: pricingResult.grandTotal,
      discountedProductTotal: pricingResult.productTotal,
      discountedProcessorTotal: pricingResult.processorTotal,
      discountedGrandTotal: pricingResult.grandTotal,
      discountInfo: { discountType: null, discountPercent: 0 },
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

  switch (discountType) {
    case 'led':

      discountAmount = Math.round((originalProductTotal * discountPercent / 100) * 100) / 100;
      discountedProductTotal = Math.round((originalProductTotal - discountAmount) * 100) / 100;

      discountedGrandTotal = Math.round(
        discountedProductTotal +
        originalProcessorTotal +
        pricingResult.structureTotal +
        pricingResult.installationTotal +
        unaccountedDifference
      );
      break;

    case 'controller':

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

    case 'total':

      discountAmount = Math.round((originalGrandTotal * discountPercent / 100) * 100) / 100;
      discountedGrandTotal = Math.round((originalGrandTotal - discountAmount) * 100) / 100;

      discountedProductTotal = originalProductTotal;
      discountedProcessorTotal = originalProcessorTotal;
      break;

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

