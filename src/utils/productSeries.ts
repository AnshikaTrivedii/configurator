import type { Product } from '../types';
import { isCompetitiveUserType } from './userTypes';

/** Crystal products (Transparent Series) use module size/resolution terminology. */
export function isCrystalSeries(
  product: Pick<Product, 'name' | 'category' | 'id'> | null | undefined
): boolean {
  if (!product) return false;
  const name = (product.name || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  return name.includes('crystal') || category.includes('transparent');
}

const MODULE_GRID_WITHOUT_STRUCTURE_INSTALLATION = new Set([
  'orion-module-grid-p18',
  'orion-module-grid-p25'
]);

/** Module/Grid SMD P1.8 and P2.5 quotes do not include structure or installation. */
export function omitsStructureAndInstallation(
  product: { id?: string; name?: string } | null | undefined
): boolean {
  if (!product) return false;
  const id = (product.id || '').toLowerCase();
  if (MODULE_GRID_WITHOUT_STRUCTURE_INSTALLATION.has(id)) return true;
  const name = (product.name || '').toLowerCase().replace(/\s+/g, ' ');
  return /module\/\s*grid series smd p1\.8(?:\b|$)/.test(name)
    || /module\/\s*grid series smd p2\.5(?:\b|$)/.test(name);
}

/**
 * Low Cost Model quotes for Module/Grid SMD P1.8 and P2.5 still omit structure,
 * but the salesperson can enter an installation price.
 */
export function allowsManualInstallationPrice(
  product: { id?: string; name?: string } | null | undefined,
  userType?: string | null
): boolean {
  return omitsStructureAndInstallation(product) && isCompetitiveUserType(userType);
}

const SHORT_LED_WARRANTY_PRODUCT_IDS = new Set([
  'bellatrix-indoor-smd-p1.8',
  'bellatrix-indoor-smd-p2.5',
  'bellatrix-outdoor-smd-p3',
  'bellatrix-outdoor-smd-p4',
  'orion-module-grid-p18',
  'orion-module-grid-p25'
]);

export const STANDARD_LED_WARRANTY =
  'LED Display: 24 months from the date of installation or 25 months from the date of supply whichever is earlier.\nController: 12 months from the date of installation or 13 months from the date of supply whichever is earlier.';

export const SHORT_LED_WARRANTY =
  'LED Display: 12 months from the date of installation or 13 months from the date of supply whichever is earlier.\nController: 12 months from the date of installation or 13 months from the date of supply whichever is earlier.';

export function usesShortLedWarranty(
  product: { id?: string; name?: string } | null | undefined
): boolean {
  if (!product) return false;
  const id = (product.id || '').toLowerCase();
  if (SHORT_LED_WARRANTY_PRODUCT_IDS.has(id)) return true;
  const name = (product.name || '').toLowerCase().replace(/\s+/g, ' ');
  return name === 'astra core-i p1.8'
    || name === 'astra core-i p2.5'
    || name === 'astra core-o p3'
    || name === 'astra core-o p4'
    || /module\/\s*grid series smd p1\.8(?:\b|$)/.test(name)
    || /module\/\s*grid series smd p2\.5(?:\b|$)/.test(name);
}

export function defaultWarrantyForProduct(
  product: { id?: string; name?: string } | null | undefined
): string {
  return usesShortLedWarranty(product) ? SHORT_LED_WARRANTY : STANDARD_LED_WARRANTY;
}

/** Keep a salesperson's edited warranty. Swap only the catalog default when the product changes. */
export function warrantyForProduct(
  current: string | undefined,
  product: { id?: string; name?: string } | null | undefined
): string {
  const trimmed = (current || '').trim();
  const next = defaultWarrantyForProduct(product);
  if (!trimmed || trimmed === STANDARD_LED_WARRANTY || trimmed === SHORT_LED_WARRANTY) return next;
  return current || next;
}

export function usesModuleSizeInsteadOfCabinetSize(
  product: Pick<Product, 'name' | 'category' | 'id'> | null | undefined
): boolean {
  return isCrystalSeries(product);
}
