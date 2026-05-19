import type { Product } from '../types';

/** Crystal products (Transparent Series) use module size/resolution terminology. */
export function isCrystalSeries(
  product: Pick<Product, 'name' | 'category' | 'id'> | null | undefined
): boolean {
  if (!product) return false;
  const name = (product.name || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  return name.includes('crystal') || category.includes('transparent');
}

export function usesModuleSizeInsteadOfCabinetSize(
  product: Pick<Product, 'name' | 'category' | 'id'> | null | undefined
): boolean {
  return isCrystalSeries(product);
}
