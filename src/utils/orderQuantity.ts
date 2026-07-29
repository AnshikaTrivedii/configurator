/**
 * Order quantity = number of identical configured displays.
 * Distinct from pricing `quantity` (area Ft² / cabinet count).
 */

export const DEFAULT_ORDER_QUANTITY = 1;
export const MIN_ORDER_QUANTITY = 1;
export const MAX_ORDER_QUANTITY = 9999;

/** Normalize stored/UI values; missing or invalid → 1 (backward compatible). */
export function normalizeOrderQuantity(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < MIN_ORDER_QUANTITY) {
    return DEFAULT_ORDER_QUANTITY;
  }
  return Math.min(MAX_ORDER_QUANTITY, Math.floor(n));
}

export function parseOrderQuantityInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < MIN_ORDER_QUANTITY) {
    return null;
  }
  return Math.min(MAX_ORDER_QUANTITY, n);
}

/** Stable key so same product + same configuration can merge quantities. */
export function buildConfigurationKey(parts: {
  productId: string;
  columns?: number;
  rows?: number;
  width?: number;
  height?: number;
  unit?: string;
  processor?: string | null;
  mode?: string | null;
  wireType?: string | null;
  nexaAddons?: string[] | null;
  selectedCabinetSize?: string | null;
  rentalOption?: string | null;
}): string {
  const addons = [...(parts.nexaAddons || [])].map(a => a.trim()).filter(Boolean).sort();
  return JSON.stringify({
    productId: parts.productId,
    columns: parts.columns ?? null,
    rows: parts.rows ?? null,
    width: parts.width ?? null,
    height: parts.height ?? null,
    unit: parts.unit ?? null,
    processor: parts.processor ?? null,
    mode: parts.mode ?? null,
    wireType: parts.wireType ?? null,
    nexaAddons: addons,
    selectedCabinetSize: parts.selectedCabinetSize ?? null,
    rentalOption: parts.rentalOption ?? null
  });
}
