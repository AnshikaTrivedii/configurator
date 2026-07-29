/**
 * Maps saved quotation pricing breakdown to the shape expected by PDF/HTML generation.
 * PDF must use saved quotation values — never recalculate from product catalog when a
 * breakdown is available (including override / discount replacement prices).
 */

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
  grandTotal?: number;
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  };
  discount?: ExactPricingBreakdownSource['discount'];
};

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
  const isLedOverride =
    discount?.discountType === 'led' &&
    typeof discount.discountAmountPerUnit === 'number' &&
    discount.discountAmountPerUnit > 0;
  const isControllerOverride =
    discount?.discountType === 'controller' &&
    typeof discount.discountAmountPerUnit === 'number' &&
    discount.discountAmountPerUnit > 0;

  const effectiveUnitPrice = isLedOverride
    ? discount!.discountAmountPerUnit
    : source.unitPrice;
  const effectiveProcessorPrice = isControllerOverride
    ? discount!.discountAmountPerUnit
    : source.processorPrice;

  const payload: PdfPricingBreakdown = {
    unitPrice: effectiveUnitPrice,
    quantity: source.quantity,
    orderQuantity: source.orderQuantity ?? 1,
    unitGrandTotal: source.unitGrandTotal,
    subtotal: source.subtotal ?? source.productSubtotal,
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
            (isControllerOverride ? discount.discountAmountPerUnit : undefined)
        }
      : undefined
  };

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
