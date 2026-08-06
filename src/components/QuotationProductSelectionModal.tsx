import React from 'react';
import { X, Package } from 'lucide-react';
import { QuotationLineItem } from '../contexts/QuotationCartContext';
import { PersistedQuotationLineItem } from '../utils/quotationLineItems';
import { normalizeOrderQuantity } from '../utils/orderQuantity';

export type SelectableQuotationProduct =
  | QuotationLineItem
  | PersistedQuotationLineItem;

interface QuotationProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineItems: SelectableQuotationProduct[];
  onSelectProduct: (item: SelectableQuotationProduct, productIndex: number) => void;
  title?: string;
  subtitle?: string;
  actionLabel?: (productIndex: number) => string;
  /** Optional formatter for current product total under each card */
  getProductTotal?: (item: SelectableQuotationProduct, productIndex: number) => number | null | undefined;
}

function getProductName(item: SelectableQuotationProduct): string {
  if ('product' in item && item.product?.name) return item.product.name;
  return (item as PersistedQuotationLineItem).productName || 'Product';
}

function getProductQuantity(item: SelectableQuotationProduct): number {
  return normalizeOrderQuantity(item.orderQuantity);
}

export const QuotationProductSelectionModal: React.FC<QuotationProductSelectionModalProps> = ({
  isOpen,
  onClose,
  lineItems,
  onSelectProduct,
  title = 'Select Product',
  subtitle = 'Which product would you like to select?',
  actionLabel = (index) => `Select Product ${index + 1}`,
  getProductTotal
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto my-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-blue-100 mt-1">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {lineItems.map((item, index) => {
            const total = getProductTotal?.(item, index);
            return (
              <div
                key={(item as any).id || `product-${index}`}
                className="border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700 flex-shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Product {index + 1}
                    </p>
                    <p className="text-base font-semibold text-gray-900 mt-0.5 break-words">
                      {getProductName(item)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Quantity: {getProductQuantity(item)}
                    </p>
                    {typeof total === 'number' && (
                      <p className="text-sm font-medium text-gray-800 mt-1">
                        Current Product Total: ₹{Math.round(total).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectProduct(item, index)}
                  className="mt-4 w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {actionLabel(index)}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** @deprecated Prefer QuotationProductSelectionModal — kept for existing edit-flow imports */
export const EditProductSelectionModal = QuotationProductSelectionModal;
