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
  // Original values (before discount)
  originalProductTotal: number;
  originalProcessorTotal: number;
  originalGrandTotal: number;
  
  // Discounted values (after discount)
  discountedProductTotal: number;
  discountedProcessorTotal: number;
  discountedGrandTotal: number;
  
  // Discount metadata
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
  // If no discount, return original values
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
  
  // Validate discount percentage
  if (discountPercent < 0 || discountPercent > 100) {
    console.warn('Invalid discount percentage:', discountPercent);
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

  // Store original values
  const originalProductTotal = pricingResult.productTotal;
  const originalProcessorTotal = pricingResult.processorTotal;
  const originalGrandTotal = pricingResult.grandTotal;

  let discountedProductTotal = originalProductTotal;
  let discountedProcessorTotal = originalProcessorTotal;
  let discountedGrandTotal = originalGrandTotal;
  let discountAmount = 0;

  // Apply discount based on type
  switch (discountType) {
    case 'led':
      // Apply discount to LED Screen Price (Product Total A)
      discountAmount = Math.round((originalProductTotal * discountPercent / 100) * 100) / 100;
      discountedProductTotal = Math.round((originalProductTotal - discountAmount) * 100) / 100;
      // Recalculate grand total with discounted product total
      discountedGrandTotal = Math.round(
        discountedProductTotal + 
        originalProcessorTotal + 
        pricingResult.structureTotal + 
        pricingResult.installationTotal
      );
      break;

    case 'controller':
      // Apply discount to Controller Price (Processor Total B)
      discountAmount = Math.round((originalProcessorTotal * discountPercent / 100) * 100) / 100;
      discountedProcessorTotal = Math.round((originalProcessorTotal - discountAmount) * 100) / 100;
      // Recalculate grand total with discounted processor total
      discountedGrandTotal = Math.round(
        originalProductTotal + 
        discountedProcessorTotal + 
        pricingResult.structureTotal + 
        pricingResult.installationTotal
      );
      break;

    case 'total':
      // Apply discount to Grand Total (A + B + C + D)
      discountAmount = Math.round((originalGrandTotal * discountPercent / 100) * 100) / 100;
      discountedGrandTotal = Math.round((originalGrandTotal - discountAmount) * 100) / 100;
      // Product and processor totals remain unchanged for display
      discountedProductTotal = originalProductTotal;
      discountedProcessorTotal = originalProcessorTotal;
      break;

    default:
      // No discount applied
      discountAmount = 0;
      break;
  }

  console.log('💰 DISCOUNT APPLIED:', {
    discountType,
    discountPercent: `${discountPercent}%`,
    originalGrandTotal,
    discountedGrandTotal,
    discountAmount,
    savings: `₹${discountAmount.toLocaleString('en-IN')}`
  });

  return {
    ...pricingResult,
    // Override totals with discounted values
    productTotal: discountedProductTotal,
    processorTotal: discountedProcessorTotal,
    grandTotal: discountedGrandTotal,
    // Store original values
    originalProductTotal,
    originalProcessorTotal,
    originalGrandTotal,
    // Store discounted values
    discountedProductTotal,
    discountedProcessorTotal,
    discountedGrandTotal,
    // Store discount metadata
    discountInfo,
    discountAmount
  };
}

