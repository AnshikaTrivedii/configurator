/**
 * Dimension validation for products with strict constraints (e.g. Jumbo P2.5/P4/P6).
 * All logic is dynamic: reads from product.dimensionConstraints only. No hardcoded values.
 */

import { Product } from '../types';

export interface DimensionValidationResult {
  valid: boolean;
  message: string | null;
}

/**
 * Builds validation message from product config (no hardcoded values).
 * Uses product.dimensionConstraints.validationMessage if set; otherwise builds from limits.
 */
function getValidationMessage(
  product: Product | undefined,
  c: NonNullable<Product['dimensionConstraints']>
): string {
  if (c.validationMessage) return c.validationMessage;
  const prefix = product?.name ? `For ${product.name}, ` : '';
  return `${prefix}screen size must be between ${c.minWidth}x${c.minHeight}mm and ${c.maxWidth}x${c.maxHeight}mm and in multiples of ${c.moduleWidth}x${c.moduleHeight}mm module size.`;
}

/**
 * Validates width/height (in mm) against product's dimension constraints.
 * Only runs when product has dimensionConstraints; otherwise returns valid.
 */
export function validateDimensions(
  product: Product | undefined,
  widthMm: number,
  heightMm: number
): DimensionValidationResult {
  const c = product?.dimensionConstraints;
  if (!c) {
    return { valid: true, message: null };
  }

  const { moduleWidth, moduleHeight, minWidth, minHeight, maxWidth, maxHeight } = c;
  const message = getValidationMessage(product, c);

  if (widthMm < minWidth) {
    return { valid: false, message };
  }
  if (widthMm > maxWidth) {
    return { valid: false, message };
  }
  if (heightMm < minHeight) {
    return { valid: false, message };
  }
  if (heightMm > maxHeight) {
    return { valid: false, message };
  }

  const rW = widthMm % moduleWidth;
  const rH = heightMm % moduleHeight;
  const eps = 1e-6;
  const notMultipleW = rW > eps && (moduleWidth - rW) > eps;
  const notMultipleH = rH > eps && (moduleHeight - rH) > eps;
  if (notMultipleW || notMultipleH) {
    return { valid: false, message };
  }

  return { valid: true, message: null };
}

/**
 * Snaps a value (mm) to the nearest multiple of module size.
 */
function snapToModule(value: number, moduleSize: number): number {
  const n = Math.round(value / moduleSize);
  return Math.max(1, n) * moduleSize;
}

/**
 * Clamps and snaps width/height to product's dimension constraints.
 * Returns { width, height } in mm. Only applies when product has dimensionConstraints.
 */
export function clampAndSnapDimensions(
  product: Product | undefined,
  widthMm: number,
  heightMm: number
): { width: number; height: number } {
  const c = product?.dimensionConstraints;
  if (!c) {
    return { width: widthMm, height: heightMm };
  }

  const { moduleWidth, moduleHeight, minWidth, minHeight, maxWidth, maxHeight } = c;

  let w = snapToModule(widthMm, moduleWidth);
  let h = snapToModule(heightMm, moduleHeight);

  w = Math.max(minWidth, Math.min(maxWidth, w));
  h = Math.max(minHeight, Math.min(maxHeight, h));

  return { width: w, height: h };
}

/**
 * Returns whether the product has dimension constraints (so validation/clamping applies).
 */
export function hasDimensionConstraints(product: Product | undefined): boolean {
  return Boolean(product?.dimensionConstraints);
}
