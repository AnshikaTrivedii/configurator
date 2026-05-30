import { Product } from '../types';

export const GUIDED_TECHNOLOGY_CATEGORIES = [
  'SMD',
  'COB',
  'Rental',
  'Digital Standee',
  'Modular',
  'Flexible',
  'Transparent series',
] as const;

export type GuidedTechnologyCategory = (typeof GUIDED_TECHNOLOGY_CATEGORIES)[number];

export const RENTAL_SUBCATEGORIES = ['Bellatrix-I', 'Bellatrix-O'] as const;
export type RentalSubcategory = (typeof RENTAL_SUBCATEGORIES)[number];

export const DIGITAL_STANDEE_SUBCATEGORIES = ['Lite', 'Plus'] as const;
export type DigitalStandeeSubcategory = (typeof DIGITAL_STANDEE_SUBCATEGORIES)[number];

export const MODULAR_SUBCATEGORIES = ['Rigel Plus', 'Rigel Lite'] as const;
export type ModularSubcategory = (typeof MODULAR_SUBCATEGORIES)[number];

export const FLEXIBLE_SUBCATEGORIES = ['Module Base', 'Cabinet Base'] as const;
export type FlexibleSubcategory = (typeof FLEXIBLE_SUBCATEGORIES)[number];

export const TRANSPARENT_SUBCATEGORIES = [
  'Crystal Blaze',
  'Crystal Elite',
  'Crystal Flex',
  'Crystal Go',
] as const;
export type TransparentSubcategory = (typeof TRANSPARENT_SUBCATEGORIES)[number];

const DIGITAL_STANDEE_LITE_DIMS = { width: 665, height: 1785 };
const DIGITAL_STANDEE_PLUS_DIMS = { width: 985, height: 1785 };

export type GuidedSubcategoryOptions = {
  rentalSubcategory?: RentalSubcategory | null;
  digitalStandeeSubcategory?: DigitalStandeeSubcategory | null;
  modularSubcategory?: ModularSubcategory | null;
  flexibleSubcategory?: FlexibleSubcategory | null;
  transparentSubcategory?: TransparentSubcategory | null;
};

export function isGuidedTechnologyCategory(value: string | null): value is GuidedTechnologyCategory {
  return GUIDED_TECHNOLOGY_CATEGORIES.includes(value as GuidedTechnologyCategory);
}

export function productMatchesRentalSubcategory(product: Product, subcategory: RentalSubcategory): boolean {
  const productCategory = (product.category || '').trim();
  if (!productCategory.includes('Rental Series')) return false;

  const name = (product.name || '').toLowerCase();
  if (subcategory === 'Bellatrix-I') {
    return name.includes('series-i') || product.environment?.toLowerCase().trim() === 'indoor';
  }
  return name.includes('series-o') || product.environment?.toLowerCase().trim() === 'outdoor';
}

export function productMatchesDigitalStandeeSubcategory(
  product: Product,
  subcategory: DigitalStandeeSubcategory
): boolean {
  const productCategory = (product.category || '').trim();
  if (!productCategory.includes('Digital Standee Series')) return false;

  const dims = product.cabinetDimensions;
  const name = (product.name || '').toLowerCase();
  const target =
    subcategory === 'Lite' ? DIGITAL_STANDEE_LITE_DIMS : DIGITAL_STANDEE_PLUS_DIMS;

  if (dims && dims.width === target.width && dims.height === target.height) {
    return true;
  }

  return subcategory === 'Lite' ? name.includes('lite') : name.includes('plus');
}

export function productMatchesModularSubcategory(product: Product, subcategory: ModularSubcategory): boolean {
  const productCategory = (product.category || '').trim();
  if (!productCategory.includes('Modular Series')) return false;

  const name = (product.name || '').toLowerCase();
  if (subcategory === 'Rigel Plus') {
    return name.includes('rigel plus');
  }
  return name.includes('rigel lite');
}

export function productMatchesFlexibleSubcategory(
  product: Product,
  subcategory: FlexibleSubcategory
): boolean {
  const productCategory = (product.category || '').trim();
  if (!productCategory.includes('Flexible Series')) return false;

  const name = (product.name || '').toLowerCase();
  if (subcategory === 'Cabinet Base') {
    return name.includes('cabinet base');
  }
  return !name.includes('cabinet base');
}

export function productMatchesTransparentSubcategory(
  product: Product,
  subcategory: TransparentSubcategory
): boolean {
  const productCategory = (product.category || '').trim();
  if (!productCategory.includes('Transparent Series')) return false;

  const name = (product.name || '').toLowerCase();
  return name.includes(subcategory.toLowerCase());
}

export function productMatchesGuidedTechnologyCategory(
  product: Product,
  category: GuidedTechnologyCategory | null,
  subcategories: GuidedSubcategoryOptions = {}
): boolean {
  if (!category) return true;

  const name = (product.name || '').toLowerCase();
  const productCategory = (product.category || '').trim();
  const {
    rentalSubcategory,
    digitalStandeeSubcategory,
    modularSubcategory,
    flexibleSubcategory,
    transparentSubcategory,
  } = subcategories;

  switch (category) {
    case 'SMD':
      return name.includes('astra');
    case 'COB':
      return name.includes('sigma');
    case 'Rental':
      if (!rentalSubcategory) return false;
      return productMatchesRentalSubcategory(product, rentalSubcategory);
    case 'Digital Standee':
      if (!digitalStandeeSubcategory) return false;
      return productMatchesDigitalStandeeSubcategory(product, digitalStandeeSubcategory);
    case 'Modular':
      if (!modularSubcategory) return false;
      return productMatchesModularSubcategory(product, modularSubcategory);
    case 'Flexible':
      if (!flexibleSubcategory) return false;
      return productMatchesFlexibleSubcategory(product, flexibleSubcategory);
    case 'Transparent series':
      if (!transparentSubcategory) return false;
      return productMatchesTransparentSubcategory(product, transparentSubcategory);
    default:
      return true;
  }
}

export function getGuidedTechnologyCategoryDescription(
  category: GuidedTechnologyCategory,
  environment: 'Indoor' | 'Outdoor' | ''
): string {
  const envLabel = environment ? environment.toLowerCase() : 'selected';

  switch (category) {
    case 'SMD':
      return `Astra products for ${envLabel} environments`;
    case 'COB':
      return `Sigma products for ${envLabel} environments`;
    case 'Rental':
      return 'Rental Series — Bellatrix indoor & outdoor';
    case 'Digital Standee':
      return 'Digital Standee Series — Lite & Plus sizes';
    case 'Modular':
      return 'Modular Series — Rigel Plus & Rigel Lite';
    case 'Flexible':
      return 'Flexible Series — Module Base & Cabinet Base';
    case 'Transparent series':
      return 'Transparent Series — Crystal product lines';
    default:
      return '';
  }
}

export function getRentalSubcategoryDescription(subcategory: RentalSubcategory): string {
  return subcategory === 'Bellatrix-I' ? 'Indoor rental displays' : 'Outdoor rental displays';
}

export function getDigitalStandeeSubcategoryLabel(subcategory: DigitalStandeeSubcategory): string {
  return subcategory === 'Lite' ? 'Lite (665mm × 1785mm)' : 'Plus (985mm × 1785mm)';
}

export function getDigitalStandeeSubcategoryDescription(subcategory: DigitalStandeeSubcategory): string {
  const dims = subcategory === 'Lite' ? DIGITAL_STANDEE_LITE_DIMS : DIGITAL_STANDEE_PLUS_DIMS;
  return `${dims.width}mm × ${dims.height}mm cabinet size`;
}

export function getModularSubcategoryDescription(subcategory: ModularSubcategory): string {
  return subcategory === 'Rigel Plus' ? 'Rigel Plus outdoor modular displays' : 'Rigel Lite outdoor modular displays';
}

export function getFlexibleSubcategoryDescription(subcategory: FlexibleSubcategory): string {
  return subcategory === 'Module Base'
    ? 'Nebula Series flexible modules'
    : 'Nebula Series cabinet-based flexible displays';
}

export function getTransparentSubcategoryDescription(subcategory: TransparentSubcategory): string {
  switch (subcategory) {
    case 'Crystal Blaze':
      return 'Front glass adhesive transparent displays';
    case 'Crystal Elite':
      return 'Behind glass adhesive transparent displays';
    case 'Crystal Flex':
      return 'Rollable film behind glass';
    case 'Crystal Go':
      return 'Standard transparent displays';
    default:
      return '';
  }
}

export function formatGuidedTechnologyFilterLabel(
  category: GuidedTechnologyCategory,
  subcategories: GuidedSubcategoryOptions = {}
): string {
  const {
    rentalSubcategory,
    digitalStandeeSubcategory,
    modularSubcategory,
    flexibleSubcategory,
    transparentSubcategory,
  } = subcategories;
  if (category === 'Rental' && rentalSubcategory) {
    return `Rental · ${rentalSubcategory}`;
  }
  if (category === 'Digital Standee' && digitalStandeeSubcategory) {
    return `Digital Standee · ${getDigitalStandeeSubcategoryLabel(digitalStandeeSubcategory)}`;
  }
  if (category === 'Modular' && modularSubcategory) {
    return `Modular · ${modularSubcategory}`;
  }
  if (category === 'Flexible' && flexibleSubcategory) {
    return `Flexible · ${flexibleSubcategory}`;
  }
  if (category === 'Transparent series' && transparentSubcategory) {
    return `Transparent series · ${transparentSubcategory}`;
  }
  return category;
}

export function categoryRequiresSubcategory(category: GuidedTechnologyCategory): boolean {
  return (
    category === 'Rental' ||
    category === 'Digital Standee' ||
    category === 'Modular' ||
    category === 'Flexible' ||
    category === 'Transparent series'
  );
}

export function hasRequiredSubcategory(
  category: GuidedTechnologyCategory | null,
  subcategories: GuidedSubcategoryOptions
): boolean {
  if (!category) return false;
  if (category === 'Rental') return !!subcategories.rentalSubcategory;
  if (category === 'Digital Standee') return !!subcategories.digitalStandeeSubcategory;
  if (category === 'Modular') return !!subcategories.modularSubcategory;
  if (category === 'Flexible') return !!subcategories.flexibleSubcategory;
  if (category === 'Transparent series') return !!subcategories.transparentSubcategory;
  return true;
}
