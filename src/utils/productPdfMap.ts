import { Product } from '../types';

/**
 * Product name -> spec PDF URL mapping.
 * Keep this centralized so additional series can be appended over time.
 */
export const productPdfMap: Record<string, string> = {
  'Crystal Go P3.91 - 7.82mm Plus': 'https://orion-led-quotations.s3.ap-south-1.amazonaws.com/Product+specs+pdf+/Crystal-series/Crystal+Go+P3.91+-+7.82mm+Plus.pdf',
  'Crystal Go P3.91 - 7.82mm Lite': 'https://orion-led-quotations.s3.ap-south-1.amazonaws.com/Product+specs+pdf+/Crystal-series/Crystal+Go+P3.91+-+7.82mm+Lite.pdf',
  'Crystal Flex P8-8mm': 'https://orion-led-quotations.s3.ap-south-1.amazonaws.com/Product+specs+pdf+/Crystal-series/Crystal+Flex+P8-8mm.pdf',
  'Crystal Flex P6.25-6.25mm': 'https://orion-led-quotations.s3.ap-south-1.amazonaws.com/Product+specs+pdf+/Crystal-series/Crystal+Flex+P6.25-6.25mm.pdf',
  'Crystal Flex P5-5mm': 'https://orion-led-quotations.s3.ap-south-1.amazonaws.com/Product+specs+pdf+/Crystal-series/Crystal+Flex+P5-5mm.pdf',
  'Crystal Flex P20-20mm': 'https://orion-led-quotations.s3.ap-south-1.amazonaws.com/Product+specs+pdf+/Crystal-series/Crystal+Flex+P20-20mm.pdf',
  'Crystal Flex P15-15mm': 'https://orion-led-quotations.s3.ap-south-1.amazonaws.com/Product+specs+pdf+/Crystal-series/Crystal+Flex+P15-15mm.pdf',
  'Crystal Flex P10-10mm': 'https://orion-led-quotations.s3.ap-south-1.amazonaws.com/Product+specs+pdf+/Crystal-series/Crystal+Flex+P10-10mm.pdf',
  'Crystal Elite P6.5-6.5mm': 'https://orion-led-quotations.s3.ap-south-1.amazonaws.com/Product+specs+pdf+/Crystal-series/Crystal+Elite+P6.5-6.5mm.pdf',
  'Crystal Blaze P6.25-6.25mm': 'https://orion-led-quotations.s3.ap-south-1.amazonaws.com/Product+specs+pdf+/Crystal-series/Crystal+Blaze+P6.25-6.25mm.pdf',
  'Crystal Blaze P3.91mm': 'https://orion-led-quotations.s3.ap-south-1.amazonaws.com/Product+specs+pdf+/Crystal-series/Crystal+Blaze+P3.91mm.pdf'
};

const productIdPdfMap: Record<string, string> = {
  'transparent-standard-p3.91-7.82-256x128': productPdfMap['Crystal Go P3.91 - 7.82mm Plus'],
  'transparent-standard-p3.91-7.82-256x64': productPdfMap['Crystal Go P3.91 - 7.82mm Lite'],
  'transparent-rollable-film-p8': productPdfMap['Crystal Flex P8-8mm'],
  'transparent-rollable-film-p6.25': productPdfMap['Crystal Flex P6.25-6.25mm'],
  'transparent-rollable-film-p5': productPdfMap['Crystal Flex P5-5mm'],
  'transparent-rollable-film-p20': productPdfMap['Crystal Flex P20-20mm'],
  'transparent-rollable-film-p15': productPdfMap['Crystal Flex P15-15mm'],
  'transparent-rollable-film-p10': productPdfMap['Crystal Flex P10-10mm'],
  'transparent-behind-glass-p6.5': productPdfMap['Crystal Elite P6.5-6.5mm'],
  'transparent-front-glass-p6.25': productPdfMap['Crystal Blaze P6.25-6.25mm'],
  'transparent-front-glass-p3.91': productPdfMap['Crystal Blaze P3.91mm']
};

const productNameAliasMap: Record<string, string> = {
  'Crystal Blaze P3.91': 'Crystal Blaze P3.91mm',
  'Crystal Blaze P6.25': 'Crystal Blaze P6.25-6.25mm',
  'Crystal Elite P6.5': 'Crystal Elite P6.5-6.5mm',
  'Crystal Flex P5': 'Crystal Flex P5-5mm',
  'Crystal Flex P6.25': 'Crystal Flex P6.25-6.25mm',
  'Crystal Flex P8': 'Crystal Flex P8-8mm',
  'Crystal Flex P10': 'Crystal Flex P10-10mm',
  'Crystal Flex P15': 'Crystal Flex P15-15mm',
  'Crystal Flex P20': 'Crystal Flex P20-20mm'
};

/**
 * Returns product spec PDF URL from dedicated map (preferred),
 * then existing product.pdf field as fallback.
 */
export function getProductPdfUrl(product: Product | null | undefined): string | null {
  if (!product) return null;
  const mappedById = productIdPdfMap[product.id];
  if (mappedById) return mappedById;

  const canonicalName = productNameAliasMap[product.name] || product.name;
  const mappedByName = productPdfMap[canonicalName];
  if (mappedByName) return mappedByName;

  return product.pdf || null;
}
