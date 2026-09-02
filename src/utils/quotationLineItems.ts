/**
 * Quotation line-item helpers for multi-product quotations.
 * Backward compatible: a legacy single-product quotation normalizes to one line item.
 */

import { Product, CabinetGrid, DisplayConfig } from '../types';
import { calculateCentralizedPricing, PricingCalculationResult } from './centralizedPricing';
import { normalizeOrderQuantity, buildConfigurationKey } from './orderQuantity';
import { QuotationLineItem } from '../contexts/QuotationCartContext';

export type PersistedLineItemUserType = 'End User' | 'Reseller' | 'SI/Channel Partner';

export type PersistedLineItemCustomPricing = {
  enabled: boolean;
  structurePrice: number | null;
  installationPrice: number | null;
};

/** Convert display / internal user type strings into pricing calculator codes. */
export function toPricingUserTypeCode(userType?: string | null): string {
  if (!userType) return 'endUser';
  if (userType === 'Reseller' || userType === 'reseller') return 'reseller';
  if (
    userType === 'SI/Channel Partner' ||
    userType === 'Channel' ||
    userType === 'siChannel'
  ) {
    return 'siChannel';
  }
  return 'endUser';
}

export function normalizeDisplayUserType(
  userType?: string | null
): PersistedLineItemUserType {
  if (userType === 'Reseller' || userType === 'reseller') return 'Reseller';
  if (
    userType === 'SI/Channel Partner' ||
    userType === 'Channel' ||
    userType === 'siChannel'
  ) {
    return 'SI/Channel Partner';
  }
  return 'End User';
}

export type PersistedQuotationLineItem = {
  id?: string;
  productId: string;
  productName: string;
  product?: Product;
  config: DisplayConfig;
  cabinetGrid: CabinetGrid;
  processor?: string | null;
  mode?: string | null;
  wireType?: 'gold' | 'copper';
  nexaAddons?: string[];
  selectedCabinetSize?: string | null;
  orderQuantity: number;
  /** Product-level customer type (optional for legacy quotations) */
  userType?: PersistedLineItemUserType | string;
  /** Product-level custom structure/installation pricing */
  customPricing?: PersistedLineItemCustomPricing;
  /** Product-level discount / price override (super-admin) */
  discount?: {
    discountType?: string;
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
  pricing?: Partial<PricingCalculationResult> & {
    grandTotal?: number;
    unitPrice?: number;
    quantity?: number;
    orderQuantity?: number;
    unitGrandTotal?: number;
    productSubtotal?: number;
    productTotal?: number;
    processorPrice?: number;
    processorTotal?: number;
    structureCost?: number;
    structureTotal?: number;
    installationCost?: number;
    installationTotal?: number;
    addonsCost?: number;
    addonsTotal?: number;
    appliedAddons?: { name: string; price: number }[];
  };
};

export function priceLineItem(
  item: Pick<
    QuotationLineItem,
    'product' | 'config' | 'cabinetGrid' | 'processor' | 'wireType' | 'nexaAddons' | 'orderQuantity'
  >,
  userType: string,
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  }
): PricingCalculationResult {
  return calculateCentralizedPricing(
    item.product,
    item.cabinetGrid,
    item.processor,
    userType,
    item.config,
    customPricing,
    item.wireType,
    item.nexaAddons,
    item.orderQuantity
  );
}

export function sumLineItemGrandTotals(
  items: Array<{ pricing?: { grandTotal?: number } | null; unitPricingSnapshot?: { grandTotal?: number } | null }>
): number {
  return Math.round(
    items.reduce((sum, item) => {
      const total = item.pricing?.grandTotal ?? item.unitPricingSnapshot?.grandTotal ?? 0;
      return sum + (Number(total) || 0);
    }, 0)
  );
}

/** Normalize saved quotation payloads (legacy single-product or multi-item) into line items. */
export function normalizeQuotationLineItems(quotation: any, fallbackProduct?: Product | null): PersistedQuotationLineItem[] {
  const rawItems = quotation?.quotationData?.lineItems;
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    return rawItems.map((li: any, index: number) => ({
      id: li.id || `legacy-${index}`,
      productId: li.productId || li.product?.id || '',
      productName: li.productName || li.product?.name || quotation?.productName || 'Product',
      product: li.product,
      config: li.config || quotation?.quotationData?.config || { width: 0, height: 0, unit: 'mm' },
      cabinetGrid: li.cabinetGrid || {
        columns: li.columns ?? quotation?.exactProductSpecs?.cabinetGrid?.columns ?? 1,
        rows: li.rows ?? quotation?.exactProductSpecs?.cabinetGrid?.rows ?? 1,
        totalWidth: li.cabinetGrid?.totalWidth || quotation?.quotationData?.config?.width || 0,
        totalHeight: li.cabinetGrid?.totalHeight || quotation?.quotationData?.config?.height || 0
      },
      processor: li.processor ?? quotation?.exactProductSpecs?.processor ?? quotation?.quotationData?.processor ?? null,
      mode: li.mode ?? quotation?.exactProductSpecs?.mode ?? quotation?.quotationData?.mode ?? null,
      wireType: li.wireType ?? quotation?.quotationData?.wireType,
      nexaAddons: li.nexaAddons ?? quotation?.quotationData?.nexaAddons ?? [],
      selectedCabinetSize: li.selectedCabinetSize ?? null,
      orderQuantity: normalizeOrderQuantity(
        li.orderQuantity ?? li.pricing?.orderQuantity ?? quotation?.exactPricingBreakdown?.orderQuantity ?? 1
      ),
      userType: li.userType
        ? normalizeDisplayUserType(li.userType)
        : undefined,
      customPricing: li.customPricing
        ? {
            enabled: !!li.customPricing.enabled,
            structurePrice: li.customPricing.structurePrice ?? null,
            installationPrice: li.customPricing.installationPrice ?? null
          }
        : (li.pricing as any)?.customPricing
          ? {
              enabled: !!(li.pricing as any).customPricing.enabled,
              structurePrice: (li.pricing as any).customPricing.structurePrice ?? null,
              installationPrice: (li.pricing as any).customPricing.installationPrice ?? null
            }
          : undefined,
      discount: li.discount || (li.pricing as any)?.discount || undefined,
      pricing: li.pricing || undefined
    }));
  }

  // Legacy single-product quotation → one line item
  const orderQuantity = normalizeOrderQuantity(
    quotation?.quotationData?.orderQuantity ??
    quotation?.exactPricingBreakdown?.orderQuantity ??
    1
  );
  const product = fallbackProduct || quotation?.productDetails || quotation?.exactProductSpecs;
  const config = quotation?.quotationData?.config || { width: 0, height: 0, unit: 'mm' };
  const cabinetGrid =
    quotation?.exactProductSpecs?.cabinetGrid ||
    quotation?.productDetails?.cabinetGrid ||
    quotation?.quotationData?.cabinetGrid ||
    { columns: 1, rows: 1, totalWidth: config.width || 0, totalHeight: config.height || 0 };

  return [{
    id: 'legacy-0',
    productId: product?.id || '',
    productName: quotation?.productName || product?.name || 'Product',
    product: product as Product | undefined,
    config,
    cabinetGrid,
    processor: quotation?.exactProductSpecs?.processor ?? quotation?.quotationData?.processor ?? null,
    mode: quotation?.exactProductSpecs?.mode ?? quotation?.quotationData?.mode ?? null,
    wireType: quotation?.quotationData?.wireType,
    nexaAddons: quotation?.quotationData?.nexaAddons ?? [],
    selectedCabinetSize: null,
    orderQuantity,
    userType: quotation?.userType
      ? normalizeDisplayUserType(quotation.userType)
      : quotation?.quotationData?.userInfo?.userType
        ? normalizeDisplayUserType(quotation.quotationData.userInfo.userType)
        : undefined,
    customPricing: quotation?.quotationData?.customPricing
      ? {
          enabled: !!quotation.quotationData.customPricing.enabled,
          structurePrice: quotation.quotationData.customPricing.structurePrice ?? null,
          installationPrice: quotation.quotationData.customPricing.installationPrice ?? null
        }
      : undefined,
    pricing: quotation?.exactPricingBreakdown
      ? {
          ...quotation.exactPricingBreakdown,
          orderQuantity,
          grandTotal: quotation.exactPricingBreakdown.grandTotal ?? quotation.totalPrice
        }
      : { grandTotal: quotation?.totalPrice || 0, orderQuantity }
  }];
}

export function toPersistedLineItems(items: QuotationLineItem[]): PersistedQuotationLineItem[] {
  return items.map(li => ({
    id: li.id,
    productId: li.product.id,
    productName: li.product.name,
    product: li.product,
    config: li.config,
    cabinetGrid: li.cabinetGrid,
    processor: li.processor,
    mode: li.mode,
    wireType: li.wireType,
    nexaAddons: li.nexaAddons,
    selectedCabinetSize: li.selectedCabinetSize,
    orderQuantity: normalizeOrderQuantity(li.orderQuantity),
    userType: li.userType ? normalizeDisplayUserType(li.userType) : undefined,
    customPricing: li.customPricing
      ? {
          enabled: !!li.customPricing.enabled,
          structurePrice: li.customPricing.structurePrice ?? null,
          installationPrice: li.customPricing.installationPrice ?? null
        }
      : undefined,
    pricing: li.unitPricingSnapshot
      ? {
          unitPrice: li.unitPricingSnapshot.unitPrice,
          quantity: li.unitPricingSnapshot.quantity,
          orderQuantity: li.unitPricingSnapshot.orderQuantity,
          unitGrandTotal: li.unitPricingSnapshot.unitGrandTotal,
          productSubtotal: li.unitPricingSnapshot.productSubtotal,
          productTotal: li.unitPricingSnapshot.productTotal,
          processorPrice: li.unitPricingSnapshot.processorPrice,
          processorTotal: li.unitPricingSnapshot.processorTotal,
          structureCost: li.unitPricingSnapshot.structureCost,
          structureTotal: li.unitPricingSnapshot.structureTotal,
          installationCost: li.unitPricingSnapshot.installationCost,
          installationTotal: li.unitPricingSnapshot.installationTotal,
          addonsCost: li.unitPricingSnapshot.addonsCost,
          addonsTotal: li.unitPricingSnapshot.addonsTotal,
          appliedAddons: li.unitPricingSnapshot.appliedAddons,
          grandTotal: li.unitPricingSnapshot.grandTotal,
          ...(li.customPricing?.enabled
            ? {
                customPricing: {
                  enabled: true,
                  structurePrice: li.customPricing.structurePrice,
                  installationPrice: li.customPricing.installationPrice
                }
              }
            : {})
        }
      : undefined
  }));
}

export function buildLineItemConfigurationKey(item: {
  product: Product;
  config: DisplayConfig;
  cabinetGrid: CabinetGrid;
  processor?: string | null;
  mode?: string | null;
  wireType?: string | null;
  nexaAddons?: string[] | null;
  selectedCabinetSize?: string | null;
}): string {
  return buildConfigurationKey({
    productId: item.product.id,
    columns: item.cabinetGrid?.columns,
    rows: item.cabinetGrid?.rows,
    width: item.config?.width,
    height: item.config?.height,
    unit: item.config?.unit,
    processor: item.processor,
    mode: item.mode,
    wireType: item.wireType,
    nexaAddons: item.nexaAddons,
    selectedCabinetSize: item.selectedCabinetSize,
    rentalOption: item.product.rentalOption
  });
}

export function formatQuotationProductLabel(items: PersistedQuotationLineItem[] | QuotationLineItem[]): string {
  if (!items.length) return 'Quotation';
  const firstName = 'product' in items[0] && items[0].product
    ? items[0].product.name
    : (items[0] as PersistedQuotationLineItem).productName;
  if (items.length === 1) return firstName;
  return `${firstName} + ${items.length - 1} more`;
}

export type PdfQuotationLineItem = {
  productName: string;
  productCategory?: string;
  environment?: string;
  pixelPitch?: number;
  cabinetDimensions?: { width?: number; height?: number };
  moduleDimensions?: { width?: number; height?: number };
  resolution?: { width?: number; height?: number };
  displayWidthMm?: number;
  displayHeightMm?: number;
  orderQuantity?: number;
  cabinetGrid?: { columns?: number; rows?: number };
  processor?: string | null;
  rentalOption?: string | null;
  isFixed?: boolean;
  isDigitalStandee?: boolean;
  isJumbo?: boolean;
  isRental?: boolean;
  isCrystal?: boolean;
  isFlexible?: boolean;
  isModuleGrid?: boolean;
  pricing?: {
    grandTotal?: number;
    unitGrandTotal?: number;
    unitPrice?: number;
    quantity?: number;
    productSubtotal?: number;
    productTotal?: number;
    processorPrice?: number;
    processorTotal?: number;
    structureCost?: number;
    structureTotal?: number;
    installationCost?: number;
    installationTotal?: number;
    addonsTotal?: number;
  };
};

export function toPdfQuotationLineItems(
  items: Array<QuotationLineItem | PersistedQuotationLineItem>
): PdfQuotationLineItem[] {
  return items.map(li => {
    const snap = 'unitPricingSnapshot' in li ? li.unitPricingSnapshot : undefined;
    const pricing = ('pricing' in li ? li.pricing : undefined) || snap;
    const product = li.product;
    const productName = product?.name || (li as PersistedQuotationLineItem).productName;
    const columns = li.cabinetGrid?.columns || 1;
    const rows = li.cabinetGrid?.rows || 1;
    const category = (product?.category || '').toLowerCase();
    const name = (product?.name || productName || '').toLowerCase();
    const isFixed = Boolean(product?.isFixed || category.includes('nexa'));
    const isDigitalStandee = category.includes('digital standee');
    const isJumbo =
      category.includes('jumbo') ||
      product?.id?.toLowerCase().startsWith('jumbo-') ||
      name.includes('jumbo series');
    const isRental = category.includes('rental');
    const isCrystal = name.includes('crystal') || category.includes('transparent');
    const isFlexible = category.includes('flexible');
    const isModuleGrid = product?.category === 'Module/ Grid Series';

    return {
      productName: productName || 'Product',
      productCategory: product?.category,
      environment: product?.environment,
      pixelPitch: product?.pixelPitch,
      cabinetDimensions: product?.cabinetDimensions,
      moduleDimensions: product?.moduleDimensions,
      resolution: product?.resolution
        ? {
            width: isFixed || isDigitalStandee
              ? product.resolution.width
              : product.resolution.width * columns,
            height: isFixed || isDigitalStandee
              ? product.resolution.height
              : product.resolution.height * rows
          }
        : undefined,
      displayWidthMm: li.cabinetGrid?.totalWidth || li.config?.width,
      displayHeightMm: li.cabinetGrid?.totalHeight || li.config?.height,
      orderQuantity: normalizeOrderQuantity(li.orderQuantity),
      cabinetGrid: li.cabinetGrid,
      processor: li.processor,
      rentalOption: product?.rentalOption,
      isFixed,
      isDigitalStandee,
      isJumbo,
      isRental,
      isCrystal,
      isFlexible,
      isModuleGrid,
      pricing: pricing
        ? {
            grandTotal: pricing.grandTotal,
            unitGrandTotal: pricing.unitGrandTotal,
            unitPrice: pricing.unitPrice,
            quantity: pricing.quantity,
            productSubtotal: pricing.productSubtotal,
            productTotal: pricing.productTotal,
            processorPrice: pricing.processorPrice,
            processorTotal: pricing.processorTotal,
            structureCost: pricing.structureCost,
            structureTotal: pricing.structureTotal,
            installationCost: pricing.installationCost,
            installationTotal: pricing.installationTotal,
            addonsTotal: pricing.addonsTotal
          }
        : undefined
    };
  });
}

export function getQuotationItemSummary(quotation: any): {
  itemCount: number;
  totalQuantity: number;
  productLabel: string;
} {
  const items = normalizeQuotationLineItems(quotation);
  const totalQuantity = items.reduce(
    (sum, item) => sum + normalizeOrderQuantity(item.orderQuantity),
    0
  );
  return {
    itemCount: items.length,
    totalQuantity,
    productLabel: formatQuotationProductLabel(items)
  };
}

/** True when a line item has a super-admin discount applied. */
export function lineItemHasSuperAdminDiscount(item: PersistedQuotationLineItem): boolean {
  const d = item.discount;
  if (!d) return false;
  return (d.discountAmount ?? 0) > 0 || !!d.discountType || !!d.ledOverride || !!d.controllerOverride;
}

/** True when any product on the quotation has a super-admin discount. */
export function quotationHasSuperAdminDiscount(quotation: any): boolean {
  const lineItems = normalizeQuotationLineItems(quotation);
  if (lineItems.some(lineItemHasSuperAdminDiscount)) return true;
  if (quotation?.quotationData?.discountApplied) return true;
  if ((quotation?.exactPricingBreakdown?.discount?.discountAmount ?? 0) > 0) return true;
  return false;
}

/** Discounted quotations first, then newest first within each group. */
export function sortQuotationsWithDiscountFirst<T extends { createdAt?: string }>(
  quotations: T[],
  hasDiscount: (quotation: T) => boolean = quotationHasSuperAdminDiscount as (q: T) => boolean
): T[] {
  return [...quotations].sort((a, b) => {
    const aDiscount = hasDiscount(a);
    const bDiscount = hasDiscount(b);
    if (aDiscount !== bDiscount) return aDiscount ? -1 : 1;
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

/** Sort each customer's quotations and prioritize customers with discounted quotes. */
export function sortCustomersWithDiscountedQuotationsFirst<T extends { quotations: any[] }>(
  customers: T[]
): T[] {
  return [...customers]
    .map(customer => ({
      ...customer,
      quotations: sortQuotationsWithDiscountFirst(customer.quotations)
    }))
    .sort((a, b) => {
      const aHasDiscount = a.quotations.some(quotationHasSuperAdminDiscount);
      const bHasDiscount = b.quotations.some(quotationHasSuperAdminDiscount);
      if (aHasDiscount !== bHasDiscount) return aHasDiscount ? -1 : 1;
      return 0;
    });
}
