import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { Product, CabinetGrid, DisplayConfig } from '../types';
import { buildConfigurationKey, normalizeOrderQuantity } from '../utils/orderQuantity';
import { PricingCalculationResult } from '../utils/centralizedPricing';

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
  /** Optional snapshot of last calculated unit pricing (per display, before merge display) */
  unitPricingSnapshot?: PricingCalculationResult | null;
}

interface QuotationCartContextType {
  lineItems: QuotationLineItem[];
  addOrMergeLineItem: (item: Omit<QuotationLineItem, 'id' | 'configurationKey'>) => {
    merged: boolean;
    item: QuotationLineItem;
  };
  updateLineItemQuantity: (id: string, orderQuantity: number) => void;
  removeLineItem: (id: string) => void;
  clearCart: () => void;
  totalOrderQuantity: number;
}

const QuotationCartContext = createContext<QuotationCartContextType | undefined>(undefined);

function createLineItemId(): string {
  return `qli-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const QuotationCartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([]);

  const addOrMergeLineItem = useCallback((item: Omit<QuotationLineItem, 'id' | 'configurationKey'>) => {
    const orderQuantity = normalizeOrderQuantity(item.orderQuantity);
    const configurationKey = buildConfigurationKey({
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

    let merged = false;
    let resultItem: QuotationLineItem = {
      ...item,
      id: createLineItemId(),
      configurationKey,
      orderQuantity
    };

    setLineItems(prev => {
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

    return {
      merged,
      item: resultItem
    };
  }, []);

  const updateLineItemQuantity = useCallback((id: string, orderQuantity: number) => {
    const qty = normalizeOrderQuantity(orderQuantity);
    setLineItems(prev => prev.map(li => (li.id === id ? { ...li, orderQuantity: qty } : li)));
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems(prev => prev.filter(li => li.id !== id));
  }, []);

  const clearCart = useCallback(() => setLineItems([]), []);

  const totalOrderQuantity = useMemo(
    () => lineItems.reduce((sum, li) => sum + normalizeOrderQuantity(li.orderQuantity), 0),
    [lineItems]
  );

  const value = useMemo(
    () => ({
      lineItems,
      addOrMergeLineItem,
      updateLineItemQuantity,
      removeLineItem,
      clearCart,
      totalOrderQuantity
    }),
    [lineItems, addOrMergeLineItem, updateLineItemQuantity, removeLineItem, clearCart, totalOrderQuantity]
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
