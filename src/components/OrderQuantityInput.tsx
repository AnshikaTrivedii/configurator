import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  MAX_ORDER_QUANTITY,
  MIN_ORDER_QUANTITY,
  normalizeOrderQuantity,
  parseOrderQuantityInput
} from '../utils/orderQuantity';

interface OrderQuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  helpText?: string;
}

/**
 * User-facing "Quantity" = number of identical configured displays.
 * Distinct from pricing area/cabinet quantity shown on PDF as Ft² / Cabinets.
 */
export const OrderQuantityInput: React.FC<OrderQuantityInputProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  label = 'Quantity',
  helpText = 'Number of identical units with this configuration'
}) => {
  const safeValue = normalizeOrderQuantity(value);
  const [draft, setDraft] = useState<string>(String(safeValue));

  React.useEffect(() => {
    setDraft(String(normalizeOrderQuantity(value)));
  }, [value]);

  const commit = (next: number) => {
    const normalized = normalizeOrderQuantity(next);
    onChange(normalized);
    setDraft(String(normalized));
  };

  const handleBlur = () => {
    const parsed = parseOrderQuantityInput(draft);
    if (parsed === null) {
      commit(safeValue);
      return;
    }
    commit(parsed);
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || safeValue <= MIN_ORDER_QUANTITY}
          onClick={() => commit(safeValue - 1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={MIN_ORDER_QUANTITY}
          max={MAX_ORDER_QUANTITY}
          step={1}
          disabled={disabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleBlur();
            }
          }}
          className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          aria-label={label}
        />
        <button
          type="button"
          disabled={disabled || safeValue >= MAX_ORDER_QUANTITY}
          onClick={() => commit(safeValue + 1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    </div>
  );
};
