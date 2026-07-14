import { Product } from '../types';

/**
 * Checks whether the product has cabinet size variations available.
 */
export function hasCabinetVariations(product: Product | undefined): boolean {
  return !!(product?.cabinetVariations && product.cabinetVariations.length > 1);
}

/**
 * Given a product and a selected cabinet size label (e.g. "640x640"),
 * returns a new product object with the selected variation's properties
 * (cabinetDimensions, resolution, weightPerCabinet, moduleQuantity) applied.
 * 
 * If the product has no variations, or the label doesn't match,
 * the original product is returned unchanged.
 * 
 * Pricing is NOT modified — the same price applies regardless of cabinet size.
 */
export function applySelectedCabinetVariation(
  product: Product,
  selectedLabel: string | null
): Product {
  if (!product.cabinetVariations || product.cabinetVariations.length <= 1 || !selectedLabel) {
    return product;
  }

  const variation = product.cabinetVariations.find(v => v.label === selectedLabel);
  if (!variation) {
    return product;
  }

  // Check if this is the default variation (first one = current product state)
  const defaultVariation = product.cabinetVariations[0];
  if (variation.label === defaultVariation.label) {
    return product;
  }

  // Apply variation overrides to a copy of the product
  return {
    ...product,
    cabinetDimensions: { ...variation.cabinetDimensions },
    resolution: { ...variation.resolution },
    weightPerCabinet: variation.weightPerCabinet,
    ...(variation.moduleQuantity !== undefined ? { moduleQuantity: variation.moduleQuantity } : {})
  };
}

/**
 * Get the default cabinet variation label for a product.
 * Returns the first variation's label, or null if no variations.
 */
export function getDefaultCabinetVariationLabel(product: Product | undefined): string | null {
  if (!product?.cabinetVariations || product.cabinetVariations.length <= 1) {
    return null;
  }
  return product.cabinetVariations[0].label;
}
/**
 * Find a variation label that matches the given cabinet dimensions.
 */
export function getVariationLabelFromDimensions(
  product: Product | undefined,
  dimensions: { width: number; height: number } | undefined
): string | null {
  if (!product?.cabinetVariations || !dimensions) {
    return null;
  }
  const variation = product.cabinetVariations.find(v => 
    v.cabinetDimensions.width === dimensions.width && 
    v.cabinetDimensions.height === dimensions.height
  );
  return variation ? variation.label : null;
}
