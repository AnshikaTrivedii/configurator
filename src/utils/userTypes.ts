export const PROPOSED_COMPETITIVE_PRICE_LABEL = 'Low Cost Model Price';
export const COMPETITIVE_USER_TYPE_CODE = 'competitive';
const LEGACY_COMPETITIVE_PRICE_LABEL = 'proposed competitive price';

export function isCompetitiveUserType(userType?: string | null): boolean {
  if (!userType) return false;
  const value = userType.trim().toLowerCase();
  return value === COMPETITIVE_USER_TYPE_CODE
    || value === PROPOSED_COMPETITIVE_PRICE_LABEL.toLowerCase()
    || value === LEGACY_COMPETITIVE_PRICE_LABEL;
}

export function productHasCompetitivePrice(product?: { competitivePrice?: number | string | null } | null): boolean {
  return typeof product?.competitivePrice === 'number' && Number.isFinite(product.competitivePrice) && product.competitivePrice > 0;
}
