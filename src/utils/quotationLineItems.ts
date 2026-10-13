/**
 * Quotation line-item helpers for multi-product quotations.
 * Backward compatible: a legacy single-product quotation normalizes to one line item.
 */

import { Product, CabinetGrid, DisplayConfig } from '../types';
import { calculateCentralizedPricing, PricingCalculationResult } from './centralizedPricing';
import {
  applySavedPriceOverrides,
  buildPersistedDiscount,
  getLedDiscountMode,
  rebuildGrandTotalFromComponents,
  SavedLineDiscount,
  savedLineDiscountHasOverride
} from './discountCalculator';
import { normalizeOrderQuantity, buildConfigurationKey } from './orderQuantity';
import { QuotationLineItem } from '../contexts/QuotationCartContext';
import { addQuotationAddonsToTotal, readQuotationAddons, sumQuotationAddons } from './quotationAddons';

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
  discount?: SavedLineDiscount;
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

/**
 * Catalog price plus any persisted LED/controller replacement prices.
 * Recalculates unit counts from the current matrix so an Edit + size change
 * keeps the saved per-unit override instead of reverting to list price.
 */
export function priceLineItemWithOverrides(
  item: Pick<
    QuotationLineItem,
    'product' | 'config' | 'cabinetGrid' | 'processor' | 'wireType' | 'nexaAddons' | 'orderQuantity' | 'discount'
  >,
  userType: string,
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  }
): PricingCalculationResult {
  const catalog = priceLineItem(item, userType, customPricing);
  if (!catalog.isAvailable || !savedLineDiscountHasOverride(item.discount)) {
    return catalog;
  }
  const priced = applySavedPriceOverrides(
    catalog,
    item.discount,
    item.product,
    item.cabinetGrid,
    item.config
  );
  const persisted = buildPersistedDiscount(
    item.discount,
    priced,
    item.product,
    item.cabinetGrid,
    item.config
  );
  return {
    ...priced,
    ...(persisted ? { discount: persisted } : {})
  } as PricingCalculationResult;
}

/** Reprice a cart line and keep the persistable discount blob in sync. */
export function repriceCartLineItem(
  item: QuotationLineItem,
  userType: string,
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  }
): QuotationLineItem {
  const priced = priceLineItemWithOverrides(item, userType, customPricing);
  const persisted = savedLineDiscountHasOverride(item.discount)
    ? buildPersistedDiscount(
        item.discount,
        priced as any,
        item.product,
        item.cabinetGrid,
        item.config
      )
    : undefined;
  return {
    ...item,
    discount: persisted,
    unitPricingSnapshot: priced.isAvailable ? priced : item.unitPricingSnapshot
  };
}

export function resolveQuotationLevelDiscount(quotation: any): SavedLineDiscount | undefined {
  const breakdownDiscount = quotation?.exactPricingBreakdown?.discount;
  if (savedLineDiscountHasOverride(breakdownDiscount)) {
    return breakdownDiscount as SavedLineDiscount;
  }

  const info = quotation?.quotationData?.discountInfo;
  const type = info?.type || info?.discountType;
  const amountPerUnit = info?.amountPerUnit ?? info?.discountAmountPerUnit ?? 0;
  if ((type === 'led' || type === 'controller') && amountPerUnit > 0) {
    return {
      discountType: type,
      discountPercent: info?.percent || 0,
      discountAmountPerUnit: amountPerUnit,
      numberOfUnits: info?.numberOfUnits || 0,
      ledDiscountMode: info?.ledDiscountMode || 'none',
      discountAmount: info?.amount,
      ...(type === 'led'
        ? {
            ledOverride: {
              amountPerUnit,
              numberOfUnits: info?.numberOfUnits || 0,
              ledDiscountMode: info?.ledDiscountMode || 'none'
            }
          }
        : { controllerOverride: { amountPerUnit } })
    };
  }

  const topType = quotation?.discountType;
  const topAmount = quotation?.discountAmountPerUnit || 0;
  if ((topType === 'led' || topType === 'controller') && topAmount > 0) {
    return {
      discountType: topType,
      discountPercent: quotation?.discountPercent || 0,
      discountAmountPerUnit: topAmount,
      numberOfUnits: quotation?.numberOfUnits || 0,
      ledDiscountMode: quotation?.ledDiscountMode || 'none',
      ...(topType === 'led'
        ? {
            ledOverride: {
              amountPerUnit: topAmount,
              numberOfUnits: quotation?.numberOfUnits || 0,
              ledDiscountMode: quotation?.ledDiscountMode || 'none'
            }
          }
        : { controllerOverride: { amountPerUnit: topAmount } })
    };
  }

  return undefined;
}

/** Line discount, falling back to quotation-level override for single-product / legacy records. */
export function resolveLineItemDiscount(
  item: PersistedQuotationLineItem | QuotationLineItem | null | undefined,
  quotation?: any
): SavedLineDiscount | undefined {
  const direct = (item as PersistedQuotationLineItem | undefined)?.discount
    || ((item as QuotationLineItem | undefined)?.discount);
  if (savedLineDiscountHasOverride(direct)) return direct;

  const pricingDiscount = (item as PersistedQuotationLineItem | undefined)?.pricing
    ? ((item as PersistedQuotationLineItem).pricing as any)?.discount
    : undefined;
  if (savedLineDiscountHasOverride(pricingDiscount)) return pricingDiscount;

  if (!quotation) return undefined;
  const rawItems = quotation?.quotationData?.lineItems;
  const isSingle = !Array.isArray(rawItems) || rawItems.length <= 1;
  if (!isSingle) return undefined;
  return resolveQuotationLevelDiscount(quotation);
}

export function buildExactPricingBreakdownFromCartItem(
  item: QuotationLineItem | PersistedQuotationLineItem | null | undefined
): Record<string, unknown> | undefined {
  if (!item) return undefined;
  const snapshot = 'unitPricingSnapshot' in item ? item.unitPricingSnapshot : undefined;
  const pricing = ('pricing' in item ? item.pricing : undefined) || snapshot;
  if (!pricing) return undefined;
  const discount = item.discount || (pricing as any).discount;
  return {
    unitPrice: pricing.unitPrice,
    quantity: pricing.quantity,
    orderQuantity: pricing.orderQuantity,
    unitGrandTotal: pricing.unitGrandTotal,
    subtotal: pricing.productSubtotal,
    productSubtotal: pricing.productSubtotal,
    gstAmount: (pricing as any).productGST ?? (pricing as any).gstAmount,
    productGST: (pricing as any).productGST,
    productTotal: pricing.productTotal,
    processorPrice: pricing.processorPrice,
    processorGst: (pricing as any).processorGST ?? (pricing as any).processorGst,
    processorGST: (pricing as any).processorGST,
    processorTotal: pricing.processorTotal,
    structureCost: pricing.structureCost,
    structureGST: (pricing as any).structureGST,
    structureTotal: pricing.structureTotal,
    installationCost: pricing.installationCost,
    installationGST: (pricing as any).installationGST,
    installationTotal: pricing.installationTotal,
    addonsCost: pricing.addonsCost,
    addonsGST: (pricing as any).addonsGST,
    addonsTotal: pricing.addonsTotal,
    appliedAddons: pricing.appliedAddons,
    grandTotal: pricing.grandTotal,
    ...(discount ? { discount } : {})
  };
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

/**
 * Display / persist total for a quotation.
 * Valid non-negative stored totals are kept as-is.
 * Invalid negative totals (override subtracted from an already-replaced price)
 * are rebuilt from saved components instead of being clamped to zero.
 */
export function getQuotationDisplayTotal(quotation: any): number {
  const stored = Number(quotation?.totalPrice);
  const breakdown = quotation?.exactPricingBreakdown;
  const breakdownTotal = Number(breakdown?.grandTotal);

  if (Number.isFinite(stored) && stored >= 0) {
    return Math.round(stored);
  }

  if (breakdown) {
    const rebuilt = rebuildGrandTotalFromComponents({
      ...breakdown,
      discount: breakdown.discount
    });
    if (rebuilt >= 0) {
      const addons = readQuotationAddons(quotation?.quotationData?.customAddons, breakdown.customAddons);
      const addonsTotal = breakdown.customAddonsIncludedInGrandTotal
        ? 0
        : (Number(breakdown.customAddonsTotal) || sumQuotationAddons(addons));
      return addQuotationAddonsToTotal(rebuilt, addonsTotal);
    }
  }

  const lineItems = normalizeQuotationLineItems(quotation);
  if (lineItems.length > 0) {
    const lineSum = sumLineItemGrandTotals(lineItems);
    if (lineSum >= 0 && lineItems.some(item => (item.pricing?.grandTotal ?? 0) > 0)) {
      const addons = readQuotationAddons(
        quotation?.quotationData?.customAddons,
        breakdown?.customAddons
      );
      return addQuotationAddonsToTotal(lineSum, sumQuotationAddons(addons));
    }
  }

  if (Number.isFinite(breakdownTotal) && breakdownTotal >= 0) {
    return Math.round(breakdownTotal);
  }

  return Number.isFinite(stored) ? Math.round(stored) : 0;
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
      discount: resolveLineItemDiscount(
        { ...li, discount: li.discount || (li.pricing as any)?.discount },
        quotation
      ),
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
    productId:
      product?.id ||
      quotation?.productDetails?.productId ||
      quotation?.exactProductSpecs?.productId ||
      quotation?.productId ||
      '',
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
    discount: resolveQuotationLevelDiscount(quotation),
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
    discount: li.discount,
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
          ...(li.discount ? { discount: li.discount } : {}),
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

/**
 * Single-product quotations show the live matrix on the PDF via exactProductSpecs,
 * while the Sales Dashboard reads quotationData.lineItems[0].cabinetGrid.
 * If the cart line was not updated after a matrix edit, copy the live grid onto
 * that one line so both fields persist the same dimensions. Multi-product carts
 * are left unchanged.
 */
export function applyLiveMatrixToSingleLineItem<T extends {
  config: DisplayConfig;
  cabinetGrid: CabinetGrid;
}>(
  items: T[],
  liveConfig: { width?: number; height?: number; unit?: string; aspectRatio?: string | null } | null | undefined,
  liveGrid: { columns?: number; rows?: number; totalWidth?: number; totalHeight?: number } | null | undefined
): T[] {
  if (items.length !== 1 || !liveGrid) return items;
  const columns = Number(liveGrid.columns);
  const rows = Number(liveGrid.rows);
  if (!Number.isFinite(columns) || !Number.isFinite(rows) || columns <= 0 || rows <= 0) {
    return items;
  }

  const item = items[0];
  const width = liveConfig?.width ?? item.config?.width;
  const height = liveConfig?.height ?? item.config?.height;
  const nextGrid: CabinetGrid = {
    columns,
    rows,
    totalWidth: liveGrid.totalWidth || width || item.cabinetGrid?.totalWidth || 0,
    totalHeight: liveGrid.totalHeight || height || item.cabinetGrid?.totalHeight || 0
  };
  if (
    item.cabinetGrid?.columns === nextGrid.columns &&
    item.cabinetGrid?.rows === nextGrid.rows &&
    item.config?.width === width &&
    item.config?.height === height
  ) {
    return items;
  }

  return [{
    ...item,
    config: {
      ...item.config,
      width: width ?? item.config.width,
      height: height ?? item.config.height,
      unit: (liveConfig?.unit as DisplayConfig['unit']) || item.config?.unit || 'mm',
      aspectRatio: (liveConfig?.aspectRatio ?? item.config?.aspectRatio) as DisplayConfig['aspectRatio']
    },
    cabinetGrid: nextGrid
  }];
}

function moneyClose(a: unknown, b: unknown): boolean {
  const left = Number(a);
  const right = Number(b);
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1;
}

/**
 * Single-product save: copy the live matrix onto the line and reprice it with
 * the line override, or the breakdown override when the line never received it.
 * Multi-product carts are returned unchanged.
 */
export function syncSingleProductLineForSave(
  items: QuotationLineItem[],
  liveConfig: { width?: number; height?: number; unit?: string; aspectRatio?: string | null } | null | undefined,
  liveGrid: { columns?: number; rows?: number; totalWidth?: number; totalHeight?: number } | null | undefined,
  userType: string,
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  },
  breakdownDiscount?: SavedLineDiscount | null
): QuotationLineItem[] {
  const aligned = applyLiveMatrixToSingleLineItem(items, liveConfig, liveGrid);
  if (aligned.length !== 1) return aligned;
  const line = aligned[0];
  const discount = savedLineDiscountHasOverride(line.discount)
    ? line.discount
    : (savedLineDiscountHasOverride(breakdownDiscount) ? breakdownDiscount || undefined : line.discount);
  return [repriceCartLineItem(
    { ...line, discount },
    userType,
    customPricing?.enabled ? customPricing : undefined
  )];
}

/**
 * Edit hydration must not replace the latest saved price with a catalog recalculation.
 * A recognized override is applied once, on top of the catalog price.
 * When the line still holds an older catalog snapshot but the quotation total was
 * saved from a replacement unit price, restore that unit price before display.
 */
export function chooseHydratedLinePricing(
  repriced: QuotationLineItem,
  pricingFromSaved: PricingCalculationResult | null | undefined,
  quotation: any
): QuotationLineItem {
  const snapshot = repriced.unitPricingSnapshot;
  if (savedLineDiscountHasOverride(repriced.discount) && snapshot?.isAvailable) {
    return {
      ...repriced,
      unitPricingSnapshot: snapshot
    };
  }

  const withSavedFallback = (): QuotationLineItem => ({
    ...repriced,
    unitPricingSnapshot: snapshot?.isAvailable ? snapshot : (pricingFromSaved || snapshot)
  });

  const breakdown = quotation?.exactPricingBreakdown;
  const savedTotal = Number(quotation?.totalPrice);
  const breakdownTotal = Number(breakdown?.grandTotal);
  const repricedTotal = Number(snapshot?.grandTotal);
  const savedUnit = Number(breakdown?.unitPrice);
  const catalogUnit = Number(snapshot?.unitPrice);
  const breakdownIsLatestSavedPrice =
    !!breakdown &&
    moneyClose(breakdownTotal, savedTotal) &&
    !moneyClose(repricedTotal, breakdownTotal) &&
    savedUnit > 0 &&
    !moneyClose(savedUnit, catalogUnit);

  if (!breakdownIsLatestSavedPrice) {
    return withSavedFallback();
  }

  const ledMode = getLedDiscountMode(repriced.product);
  if (ledMode !== 'none') {
    const synthesized: SavedLineDiscount = {
      discountType: 'led',
      discountPercent: 0,
      discountAmountPerUnit: savedUnit,
      ledDiscountMode: ledMode,
      ledOverride: { amountPerUnit: savedUnit, ledDiscountMode: ledMode }
    };
    const again = repriceCartLineItem(
      { ...repriced, discount: synthesized },
      toPricingUserTypeCode(repriced.userType),
      repriced.customPricing?.enabled ? repriced.customPricing : undefined
    );
    const againTotal = Number(again.unitPricingSnapshot?.grandTotal);
    const addonTotal = breakdown.customAddonsIncludedInGrandTotal ? Number(breakdown.customAddonsTotal) || 0 : 0;
    const comparableTotal = breakdownTotal - addonTotal;
    if (
      again.unitPricingSnapshot?.isAvailable &&
      moneyClose(again.unitPricingSnapshot.unitPrice, savedUnit) &&
      (moneyClose(againTotal, comparableTotal) || moneyClose(againTotal, breakdownTotal))
    ) {
      return again;
    }
  }

  return {
    ...repriced,
    discount: resolveQuotationLevelDiscount(quotation) || repriced.discount,
    unitPricingSnapshot: {
      ...(snapshot || {}),
      unitPrice: savedUnit,
      quantity: breakdown.quantity ?? snapshot?.quantity ?? 1,
      orderQuantity: normalizeOrderQuantity(repriced.orderQuantity),
      unitGrandTotal: breakdown.unitGrandTotal ?? breakdown.grandTotal ?? 0,
      productSubtotal: breakdown.productSubtotal ?? breakdown.subtotal ?? snapshot?.productSubtotal ?? 0,
      productGST: breakdown.productGST ?? breakdown.gstAmount ?? 0,
      productTotal: breakdown.productTotal ?? breakdown.subtotal ?? snapshot?.productTotal ?? 0,
      processorPrice: breakdown.processorPrice ?? snapshot?.processorPrice ?? 0,
      processorGST: breakdown.processorGST ?? breakdown.processorGst ?? 0,
      processorTotal: breakdown.processorTotal ?? breakdown.processorPrice ?? snapshot?.processorTotal ?? 0,
      structureCost: breakdown.structureCost ?? snapshot?.structureCost ?? 0,
      structureGST: breakdown.structureGST ?? 0,
      structureTotal: breakdown.structureTotal ?? breakdown.structureCost ?? snapshot?.structureTotal ?? 0,
      installationCost: breakdown.installationCost ?? snapshot?.installationCost ?? 0,
      installationGST: breakdown.installationGST ?? 0,
      installationTotal: breakdown.installationTotal ?? breakdown.installationCost ?? snapshot?.installationTotal ?? 0,
      addonsCost: breakdown.addonsCost ?? snapshot?.addonsCost ?? 0,
      addonsGST: breakdown.addonsGST ?? 0,
      addonsTotal: breakdown.addonsTotal ?? snapshot?.addonsTotal ?? 0,
      appliedAddons: breakdown.appliedAddons ?? snapshot?.appliedAddons ?? [],
      grandTotal: breakdownTotal,
      userType: snapshot?.userType || 'End User',
      productName: repriced.product?.name || snapshot?.productName || '',
      isAvailable: true
    } as PricingCalculationResult
  };
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
            grandTotal: (Number(pricing.grandTotal) < 0
              ? rebuildGrandTotalFromComponents(pricing)
              : pricing.grandTotal),
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
  return savedLineDiscountHasOverride(item.discount)
    || (item.discount?.discountAmount ?? 0) > 0
    || !!item.discount?.discountType;
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
