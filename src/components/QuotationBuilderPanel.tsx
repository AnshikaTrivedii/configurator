import React from 'react';
import { Package, Plus, Pencil, Trash2, FileText, ShoppingCart } from 'lucide-react';
import { QuotationLineItem } from '../contexts/QuotationCartContext';
import { normalizeOrderQuantity } from '../utils/orderQuantity';

interface QuotationBuilderPanelProps {
  lineItems: QuotationLineItem[];
  cartGrandTotal: number;
  onAddAnotherProduct: () => void;
  onEditItem: (item: QuotationLineItem) => void;
  onRemoveItem: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onGenerateQuotation: () => void;
  onClearAll: () => void;
  disabled?: boolean;
}

function formatCurrency(amount: number): string {
  return `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;
}

export const QuotationBuilderPanel: React.FC<QuotationBuilderPanelProps> = ({
  lineItems,
  cartGrandTotal,
  onAddAnotherProduct,
  onEditItem,
  onRemoveItem,
  onQuantityChange,
  onGenerateQuotation,
  onClearAll,
  disabled = false
}) => {
  if (lineItems.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-indigo-700" />
          <h4 className="text-sm font-semibold text-gray-900">
            Quotation Builder ({lineItems.length} {lineItems.length === 1 ? 'item' : 'items'})
          </h4>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-red-600 hover:text-red-700"
        >
          Clear all
        </button>
      </div>

      <ul className="space-y-2">
        {lineItems.map((item, index) => {
          const qty = normalizeOrderQuantity(item.orderQuantity);
          const itemTotal = item.unitPricingSnapshot?.grandTotal ?? 0;
          const unitTotal = item.unitPricingSnapshot?.unitGrandTotal
            ?? (qty > 0 ? Math.round(itemTotal / qty) : 0);

          return (
            <li key={item.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">
                    {index + 1}. {item.product.name}
                  </p>
                  <p className="mt-0.5 text-gray-600">
                    {item.cabinetGrid.columns} × {item.cabinetGrid.rows} cabinets
                    {item.processor ? ` · ${item.processor}` : ''}
                    {item.mode ? ` · ${item.mode}` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>Unit: {formatCurrency(unitTotal)}</span>
                    <span>Item total: {formatCurrency(itemTotal)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-gray-500">Qty</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={qty}
                    disabled={disabled}
                    onChange={(e) => onQuantityChange(item.id, Number(e.target.value))}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                  />
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onEditItem(item)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    title="Edit configuration"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemoveItem(item.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    title="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-indigo-100 pt-3">
        <p className="text-sm font-semibold text-gray-900">
          Cart total: {formatCurrency(cartGrandTotal)}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onAddAnotherProduct}
            className="inline-flex items-center justify-center rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Another Product
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onGenerateQuotation}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Generate Quotation
          </button>
        </div>
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
        <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Same product + same configuration merges quantities. Different configurations stay as separate items. PDF shows 2 products per page.
      </p>
    </div>
  );
};
