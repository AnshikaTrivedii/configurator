import { Product, DigitalStandeeMatrixKey } from '../types';
import { products } from '../data/products';

export function getDigitalStandeeBaseProduct(product?: Product): Product | undefined {
  if (!product) return undefined;
  if (product.digitalStandeeMatrixVariants) return product;
  if (product.digitalStandeeVariantOf) {
    return products.find((p) => p.id === product.digitalStandeeVariantOf);
  }
  return undefined;
}

export function getDigitalStandeeMatrixOptions(product?: Product): Array<{
  key: DigitalStandeeMatrixKey;
  label: string;
  type: string;
}> {
  const base = getDigitalStandeeBaseProduct(product);
  const variants = base?.digitalStandeeMatrixVariants;
  if (!variants) return [];

  return Object.entries(variants).map(([key, info]) => ({
    key,
    type: info.type,
    label: `${info.cabinetGrid.columns} × ${info.cabinetGrid.rows}`,
  }));
}

export function resolveDigitalStandeeVariantProduct(
  product: Product | undefined,
  matrixKey: DigitalStandeeMatrixKey,
): Product | undefined {
  const base = getDigitalStandeeBaseProduct(product);
  const variantInfo = base?.digitalStandeeMatrixVariants?.[matrixKey];
  if (!base || !variantInfo) return undefined;

  return products.find((p) => p.id === variantInfo.productId);
}

