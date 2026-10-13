/**
 * Maps saved quotation pricing breakdown to the shape expected by PDF/HTML generation.
 * PDF must use saved quotation values — never recalculate from product catalog when a
 * breakdown is available (including override / discount replacement prices).
 */

import { getControllerOverrideFromDiscount, getLedOverrideFromDiscount, rebuildGrandTotalFromComponents } from './discountCalculator';

export type ExactPricingBreakdownSource = {
  unitPrice?: number;
  quantity?: number;
  orderQuantity?: number;
  unitGrandTotal?: number;
  subtotal?: number;
  productSubtotal?: number;
  gstAmount?: number;
  productGST?: number;
  productTotal?: number;
  processorPrice?: number;
  processorGst?: number;
  processorGST?: number;
  processorTotal?: number;
  structureCost?: number;
  structureGST?: number;
  structureTotal?: number;
  installationCost?: number;
  installationGST?: number;
  installationTotal?: number;
  addonsCost?: number;
  addonsGST?: number;
  addonsTotal?: number;
  appliedAddons?: { name: string; price: number }[];
  customAddons?: { description: string; price: number }[];
  customAddonsTotal?: number;
  customAddonsIncludedInGrandTotal?: boolean;
  grandTotal?: number;
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  };
  discount?: {
    discountType?: 'led' | 'controller' | null;
    discountPercent?: number;
    discountAmountPerUnit?: number;
    numberOfUnits?: number;
    ledDiscountMode?: string;
    originalProductTotal?: number;
    originalProcessorTotal?: number;
    originalGrandTotal?: number;
    discountedProductTotal?: number;
    discountedProcessorTotal?: number;
    discountedGrandTotal?: number;
    discountAmount?: number;
    ledOverride?: { amountPerUnit?: number; numberOfUnits?: number; ledDiscountMode?: string };
    controllerOverride?: { amountPerUnit?: number };
  };
};

export type PdfPricingBreakdown = {
  unitPrice?: number;
  quantity?: number;
  orderQuantity?: number;
  unitGrandTotal?: number;
  subtotal?: number;
  gstAmount?: number;
  processorPrice?: number;
  processorGst?: number;
  structureCost?: number;
  structureGST?: number;
  structureTotal?: number;
  installationCost?: number;
  installationGST?: number;
  installationTotal?: number;
  addonsCost?: number;
  addonsGST?: number;
  addonsTotal?: number;
  appliedAddons?: { name: string; price: number }[];
  customAddons?: { description: string; price: number }[];
  customAddonsTotal?: number;
  customAddonsIncludedInGrandTotal?: boolean;
  grandTotal?: number;
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  };
  discount?: ExactPricingBreakdownSource['discount'];
};

function moneyClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1;
}

/**
 * Product subtotal shown on the dashboard and PDF.
 * An LED replacement price is unit price × quantity × order quantity.
 * A leftover catalog `subtotal` must not win over that amount.
 */
export function resolveDisplayedProductSubtotal(source: ExactPricingBreakdownSource | null | undefined): number {
  if (!source) return 0;
  const orderQty = source.orderQuantity != null && source.orderQuantity > 0 ? source.orderQuantity : 1;
  const quantity = typeof source.quantity === 'number' ? source.quantity : undefined;
  const led = getLedOverrideFromDiscount(source.discount as any);
  const fromOverride =
    led && quantity != null && quantity > 0
      ? Math.round(led.amountPerUnit * quantity * orderQty * 100) / 100
      : undefined;
  const productSubtotal = typeof source.productSubtotal === 'number' ? source.productSubtotal : undefined;
  const productTotal = typeof source.productTotal === 'number' ? source.productTotal : undefined;
  const discounted = source.discount?.discountedProductTotal;
  const subtotal = typeof source.subtotal === 'number' ? source.subtotal : undefined;

  if (fromOverride != null) {
    if (productSubtotal != null && moneyClose(productSubtotal, fromOverride)) return productSubtotal;
    if (productTotal != null && moneyClose(productTotal, fromOverride)) return productTotal;
    if (typeof discounted === 'number' && moneyClose(discounted, fromOverride)) return discounted;
    return fromOverride;
  }

  if (productSubtotal != null && subtotal != null && !moneyClose(productSubtotal, subtotal)) {
    const unit = source.unitPrice;
    if (unit != null && quantity != null && quantity > 0) {
      const fromUnit = Math.round(unit * quantity * orderQty * 100) / 100;
      if (moneyClose(productSubtotal, fromUnit)) return productSubtotal;
    }
  }

  if (subtotal != null) return subtotal;
  if (productSubtotal != null) return productSubtotal;
  if (productTotal != null) return productTotal;
  return 0;
}

export function buildExactPricingBreakdownForPdf(
  source: ExactPricingBreakdownSource | null | undefined,
  options?: {
    customPricing?: {
      enabled: boolean;
      structurePrice: number | null;
      installationPrice: number | null;
    };
    appliedAddonsFallback?: { name: string; price: number }[];
    logContext?: string;
  }
): PdfPricingBreakdown | undefined {
  if (!source) return undefined;

  const discount = source.discount;
  const ledOverride = getLedOverrideFromDiscount(discount as any);
  const controllerOverride = getControllerOverrideFromDiscount(discount as any);

  const effectiveUnitPrice = ledOverride ? ledOverride.amountPerUnit : source.unitPrice;
  const effectiveProcessorPrice = controllerOverride
    ? (discount?.discountedProcessorTotal ?? controllerOverride.amountPerUnit)
    : source.processorPrice;

  const payload: PdfPricingBreakdown = {
    unitPrice: effectiveUnitPrice,
    quantity: source.quantity,
    // Leave undefined when the source has no value so the caller's orderQuantity
    // fallback applies instead of silently forcing a single unit.
    orderQuantity: source.orderQuantity,
    unitGrandTotal: source.unitGrandTotal,
    subtotal: resolveDisplayedProductSubtotal({
      ...source,
      unitPrice: effectiveUnitPrice
    }),
    gstAmount: source.gstAmount ?? source.productGST,
    processorPrice: effectiveProcessorPrice,
    processorGst: source.processorGst ?? source.processorGST,
    structureCost: source.structureCost,
    structureGST: source.structureGST,
    structureTotal: source.structureTotal,
    installationCost: source.installationCost,
    installationGST: source.installationGST,
    installationTotal: source.installationTotal,
    addonsCost: source.addonsCost ?? 0,
    addonsGST: source.addonsGST ?? 0,
    addonsTotal: source.addonsTotal ?? 0,
    appliedAddons: source.appliedAddons ?? options?.appliedAddonsFallback ?? [],
    customAddons: source.customAddons,
    customAddonsTotal: source.customAddonsTotal,
    customAddonsIncludedInGrandTotal: source.customAddonsIncludedInGrandTotal,
    grandTotal: source.grandTotal ?? discount?.discountedGrandTotal,
    customPricing:
      source.customPricing ??
      (options?.customPricing?.enabled
        ? {
            enabled: true,
            structurePrice: options.customPricing.structurePrice,
            installationPrice: options.customPricing.installationPrice
          }
        : undefined),
    discount: discount
      ? {
          ...discount,
          discountedProcessorTotal:
            discount.discountedProcessorTotal ??
            (controllerOverride ? controllerOverride.amountPerUnit : undefined)
        }
      : undefined
  };

  if (typeof payload.grandTotal === 'number' && payload.grandTotal < 0) {
    payload.grandTotal = rebuildGrandTotalFromComponents({
      productTotal: source.productTotal,
      productSubtotal: source.productSubtotal,
      subtotal: source.subtotal,
      processorTotal: source.processorTotal,
      processorPrice: payload.processorPrice,
      structureTotal: source.structureTotal,
      structureCost: source.structureCost,
      installationTotal: source.installationTotal,
      installationCost: source.installationCost,
      addonsTotal: payload.addonsTotal,
      customAddonsTotal: source.customAddonsTotal,
      customAddonsIncludedInGrandTotal: source.customAddonsIncludedInGrandTotal,
      discount
    });
  }

  if (options?.logContext) {
    const originalUnitPrice =
      discount?.discountType === 'led' && discount.discountAmountPerUnit
        ? '(override applied — see discountAmountPerUnit)'
        : source.unitPrice;
    console.log(`[PDF Pricing] ${options.logContext}`, {
      originalPrice: originalUnitPrice,
      overridePrice:
        discount?.discountType === 'led' ? discount.discountAmountPerUnit : undefined,
      effectiveUnitPrice: payload.unitPrice,
      effectiveProcessorPrice: payload.processorPrice,
      controllerOverride:
        discount?.discountType === 'controller' ? discount.discountAmountPerUnit : undefined,
      grandTotal: payload.grandTotal,
      source: 'saved exactPricingBreakdown'
    });
  }

  return payload;
}

export function logPdfPricingFromCalculation(
  context: string,
  values: {
    unitPrice: number;
    grandTotal: number;
    processorPrice?: number;
  }
): void {
  console.log(`[PDF Pricing] ${context}`, {
    originalPrice: values.unitPrice,
    overridePrice: undefined,
    effectiveUnitPrice: values.unitPrice,
    effectiveProcessorPrice: values.processorPrice,
    grandTotal: values.grandTotal,
    source: 'recalculated (no saved breakdown)'
  });
}
