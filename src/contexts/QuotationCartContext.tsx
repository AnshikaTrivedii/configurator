import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { Product, CabinetGrid, DisplayConfig } from '../types';
import { buildConfigurationKey, normalizeOrderQuantity } from '../utils/orderQuantity';
import { PricingCalculationResult } from '../utils/centralizedPricing';

export type LineItemUserType = 'End User' | 'Reseller' | 'SI/Channel Partner';

export type LineItemCustomPricing = {
  enabled: boolean;
  structurePrice: number | null;
  installationPrice: number | null;
};

export interface QuotationLineItem {
  id: string;
  configurationKey: string;
  product: Product;
  config: DisplayConfig;
  cabinetGrid: CabinetGrid;
  processor: string | null;
  mode: string | null;
  wireType?: 'gold' | 'copper';
  nexaAddons?: string[];
  selectedCabinetSize?: string | null;
  orderQuantity: number;
  /** Snapshot of pricing for this line (includes orderQuantity multiplication) */
  unitPricingSnapshot?: PricingCalculationResult | null;
  /** Product-level customer type used for this line's pricing */
  userType?: LineItemUserType;
  /** Product-level custom structure/installation pricing */
  customPricing?: LineItemCustomPricing;
}

interface QuotationCartContextType {
  lineItems: QuotationLineItem[];
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  addOrMergeLineItem: (item: Omit<QuotationLineItem, 'id' | 'configurationKey'>) => {
    merged: boolean;
    item: QuotationLineItem;
  };
  replaceLineItem: (id: string, item: Omit<QuotationLineItem, 'id' | 'configurationKey'>) => QuotationLineItem;
  updateLineItemQuantity: (id: string, orderQuantity: number, pricingSnapshot?: PricingCalculationResult | null) => void;
  updateLineItemPricing: (id: string, pricingSnapshot: PricingCalculationResult) => void;
  updateLineItemProductSettings: (
    id: string,
    settings: {
      userType?: LineItemUserType;
      customPricing?: LineItemCustomPricing;
      unitPricingSnapshot?: PricingCalculationResult | null;
    }
  ) => void;
  removeLineItem: (id: string) => void;
  setLineItems: (items: QuotationLineItem[]) => void;
  clearCart: () => void;
  totalOrderQuantity: number;
  cartGrandTotal: number;
}

const QuotationCartContext = createContext<QuotationCartContextType | undefined>(undefined);

function createLineItemId(): string {
  return `qli-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toConfigurationKey(item: {
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

export const QuotationCartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lineItems, setLineItemsState] = useState<QuotationLineItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const addOrMergeLineItem = useCallback((item: Omit<QuotationLineItem, 'id' | 'configurationKey'>) => {
    const orderQuantity = normalizeOrderQuantity(item.orderQuantity);
    const configurationKey = toConfigurationKey(item);

    let merged = false;
    let resultItem: QuotationLineItem = {
      ...item,
      id: createLineItemId(),
      configurationKey,
      orderQuantity
    };

    setLineItemsState(prev => {
      // If editing a specific item, replace it instead of merging into another
      if (editingItemId) {
        const editIndex = prev.findIndex(li => li.id === editingItemId);
        if (editIndex >= 0) {
          const updated: QuotationLineItem = {
            ...resultItem,
            id: editingItemId
          };
          resultItem = updated;
          const next = [...prev];
          next[editIndex] = updated;
          return next;
        }
      }

      const existingIndex = prev.findIndex(li => li.configurationKey === configurationKey);
      if (existingIndex >= 0) {
        merged = true;
        const existing = prev[existingIndex];
        const updated: QuotationLineItem = {
          ...existing,
          orderQuantity: normalizeOrderQuantity(existing.orderQuantity + orderQuantity),
          unitPricingSnapshot: item.unitPricingSnapshot ?? existing.unitPricingSnapshot
        };
        resultItem = updated;
        const next = [...prev];
        next[existingIndex] = updated;
        return next;
      }

      return [...prev, resultItem];
    });

    setEditingItemId(null);

    return {
      merged,
      item: resultItem
    };
  }, [editingItemId]);

  const replaceLineItem = useCallback((id: string, item: Omit<QuotationLineItem, 'id' | 'configurationKey'>) => {
    const orderQuantity = normalizeOrderQuantity(item.orderQuantity);
    const updated: QuotationLineItem = {
      ...item,
      id,
      configurationKey: toConfigurationKey(item),
      orderQuantity
    };
    setLineItemsState(prev => prev.map(li => (li.id === id ? updated : li)));
    setEditingItemId(null);
    return updated;
  }, []);

  const updateLineItemQuantity = useCallback((
    id: string,
    orderQuantity: number,
    pricingSnapshot?: PricingCalculationResult | null
  ) => {
    const qty = normalizeOrderQuantity(orderQuantity);
    setLineItemsState(prev => prev.map(li => (
      li.id === id
        ? {
            ...li,
            orderQuantity: qty,
            unitPricingSnapshot: pricingSnapshot !== undefined ? pricingSnapshot : li.unitPricingSnapshot
          }
        : li
    )));
  }, []);

  const updateLineItemPricing = useCallback((id: string, pricingSnapshot: PricingCalculationResult) => {
    setLineItemsState(prev => prev.map(li => (
      li.id === id ? { ...li, unitPricingSnapshot: pricingSnapshot } : li
    )));
  }, []);

  const updateLineItemProductSettings = useCallback((
    id: string,
    settings: {
      userType?: LineItemUserType;
      customPricing?: LineItemCustomPricing;
      unitPricingSnapshot?: PricingCalculationResult | null;
    }
  ) => {
    setLineItemsState(prev => prev.map(li => (
      li.id === id
        ? {
            ...li,
            ...(settings.userType !== undefined ? { userType: settings.userType } : {}),
            ...(settings.customPricing !== undefined ? { customPricing: settings.customPricing } : {}),
            ...(settings.unitPricingSnapshot !== undefined
              ? { unitPricingSnapshot: settings.unitPricingSnapshot }
              : {})
          }
        : li
    )));
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItemsState(prev => prev.filter(li => li.id !== id));
    setEditingItemId(prev => (prev === id ? null : prev));
  }, []);

  const setLineItems = useCallback((items: QuotationLineItem[]) => {
    setLineItemsState(items);
    setEditingItemId(null);
  }, []);

  const clearCart = useCallback(() => {
    setLineItemsState([]);
    setEditingItemId(null);
  }, []);

  const totalOrderQuantity = useMemo(
    () => lineItems.reduce((sum, li) => sum + normalizeOrderQuantity(li.orderQuantity), 0),
    [lineItems]
  );

  const cartGrandTotal = useMemo(
    () => Math.round(
      lineItems.reduce((sum, li) => sum + (li.unitPricingSnapshot?.grandTotal || 0), 0)
    ),
    [lineItems]
  );

  const value = useMemo(
    () => ({
      lineItems,
      editingItemId,
      setEditingItemId,
      addOrMergeLineItem,
      replaceLineItem,
      updateLineItemQuantity,
      updateLineItemPricing,
      updateLineItemProductSettings,
      removeLineItem,
      setLineItems,
      clearCart,
      totalOrderQuantity,
      cartGrandTotal
    }),
    [
      lineItems,
      editingItemId,
      addOrMergeLineItem,
      replaceLineItem,
      updateLineItemQuantity,
      updateLineItemPricing,
      updateLineItemProductSettings,
      removeLineItem,
      setLineItems,
      clearCart,
      totalOrderQuantity,
      cartGrandTotal
    ]
  );

  return (
    <QuotationCartContext.Provider value={value}>
      {children}
    </QuotationCartContext.Provider>
  );
};

export function useQuotationCart(): QuotationCartContextType {
  const ctx = useContext(QuotationCartContext);
  if (!ctx) {
    throw new Error('useQuotationCart must be used within QuotationCartProvider');
  }
  return ctx;
}
