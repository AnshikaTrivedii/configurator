/**
 * Sales Person catalog rate sheet.
 *
 * Unit prices are derived from the same sources quotation generation uses:
 * - products.ts catalog fields (price / siChannelPrice / resellerPrice)
 * - centralizedPricing.getCatalogUnitPrice (Modular wire pricing, Rental cabinet/curve lock)
 * - processorPrices.PROCESSOR_PRICES (controllers)
 * - NEXA_ADDON_PRICES (Nexa add-ons)
 *
 * This module never reads quotation records, Super Admin overrides, or discounts.
 */

import { Product } from '../types';
import { products } from '../data/products';
import { getCatalogUnitPrice, NEXA_ADDON_PRICES } from './centralizedPricing';
import { PROCESSOR_PRICES, getProcessorPrice } from './processorPrices';

export type RatePriceUnit = 'per Ft²' | 'per cabinet' | 'per unit';

export interface ProductRateRow {
  id: string;
  productName: string;
  series: string;
  variant: string;
  environment?: string;
  priceUnit: RatePriceUnit;
  endUserPrice: number | null;
  siChannelPrice: number | null;
  resellerPrice: number | null;
  competitivePrice: number | null;
}

export const SERIES_DISPLAY_ORDER = [
  'Core Series',
  'Edge Series',
  'Prime Series',
  'Modular Series',
  'Flexible Series',
  'Transparent Series',
  'Module/ Grid Series',
  'Digital Standee Series',
  'Rental Series',
  'Nexa Series',
  'Jumbo Series',
  'Controllers',
  'Add-ons'
] as const;

function displaySeries(category: string): string {
  if (category === 'Nexa-S' || category === 'Nexa-C') return 'Nexa Series';
  return category;
}

function formatPixelPitch(pitch: number): string {
  const formatted = parseFloat(pitch.toFixed(4)).toString();
  return `P${formatted}`;
}

function formatEnvironment(environment?: string): string | undefined {
  if (!environment) return undefined;
  return environment.charAt(0).toUpperCase() + environment.slice(1);
}

function getPriceUnit(product: Product): RatePriceUnit {
  const category = product.category?.toLowerCase() ?? '';
  if (category.includes('rental')) return 'per cabinet';
  if (product.isFixed || category.includes('digital standee') || category.includes('nexa')) {
    return 'per unit';
  }
  return 'per Ft²';
}

function catalogPrices(product: Product, wireType?: 'gold' | 'copper') {
  return {
    endUserPrice: getCatalogUnitPrice(product, 'End User', wireType),
    siChannelPrice: getCatalogUnitPrice(product, 'Channel', wireType),
    resellerPrice: getCatalogUnitPrice(product, 'Reseller', wireType),
    competitivePrice: getCatalogUnitPrice(product, 'Competitive', wireType)
  };
}

function variantLabel(parts: Array<string | undefined | null | false>): string {
  return parts.filter(Boolean).join(' · ');
}

function isModularSeries(product: Product): boolean {
  return product.category?.toLowerCase().includes('modular') ?? false;
}

function isRentalSeries(product: Product): boolean {
  return product.category?.toLowerCase().includes('rental') ?? false;
}

function buildProductRows(product: Product): ProductRateRow[] {
  const series = displaySeries(product.category);
  const environment = formatEnvironment(product.environment);
  const pitch = formatPixelPitch(product.pixelPitch);

  if (isModularSeries(product)) {
    const rigel =
      product.rigelVariant === 'lite'
        ? 'Rigel Lite'
        : product.rigelVariant === 'plus'
          ? 'Rigel Plus'
          : undefined;

    return (['gold', 'copper'] as const).map((wireType) => ({
      id: `${product.id}-${wireType}`,
      productName: product.name,
      series,
      variant: variantLabel([
        pitch,
        rigel,
        wireType === 'gold' ? 'Gold Wire' : 'Copper Wire',
        environment
      ]),
      environment,
      priceUnit: 'per Ft²',
      ...catalogPrices(product, wireType)
    }));
  }

  if (isRentalSeries(product) && product.prices) {
    const rows: ProductRateRow[] = [
      {
        id: `${product.id}-cabinet`,
        productName: product.name,
        series,
        variant: variantLabel([pitch, 'Cabinet', environment]),
        environment,
        priceUnit: 'per cabinet',
        ...catalogPrices({ ...product, rentalOption: 'cabinet' })
      }
    ];

    const curveLock = product.prices.curveLock;
    const hasCurveLock =
      !!curveLock &&
      (curveLock.endCustomer > 0 || curveLock.siChannel > 0 || curveLock.reseller > 0);

    if (hasCurveLock) {
      rows.push({
        id: `${product.id}-curvelock`,
        productName: product.name,
        series,
        variant: variantLabel([pitch, 'Cabinet + Curve Lock', environment]),
        environment,
        priceUnit: 'per cabinet',
        ...catalogPrices({ ...product, rentalOption: 'curve lock' })
      });
    }

    return rows;
  }

  const matrix = product.digitalStandeeCabinetGrid
    ? `${product.digitalStandeeCabinetGrid.columns}×${product.digitalStandeeCabinetGrid.rows}`
    : undefined;
  const nexaSubtype =
    product.category === 'Nexa-S' || product.category === 'Nexa-C'
      ? product.category
      : undefined;

  return [
    {
      id: product.id,
      productName: product.name,
      series,
      variant: variantLabel([pitch, nexaSubtype, matrix, environment]),
      environment,
      priceUnit: getPriceUnit(product),
      ...catalogPrices(product)
    }
  ];
}

function buildControllerRows(): ProductRateRow[] {
  return Object.entries(PROCESSOR_PRICES).map(([name, info]) => ({
    id: `controller-${name}`,
    productName: name,
    series: 'Controllers',
    variant: `${info.pixelCapacity} pixel capacity`,
    priceUnit: 'per unit',
    endUserPrice: getProcessorPrice(name, 'End User'),
    siChannelPrice: getProcessorPrice(name, 'Channel'),
    resellerPrice: getProcessorPrice(name, 'Reseller'),
    competitivePrice: null
  }));
}

function buildAddonRows(): ProductRateRow[] {
  return Object.entries(NEXA_ADDON_PRICES).map(([name, price]) => ({
    id: `addon-${name}`,
    productName: name,
    series: 'Add-ons',
    variant: 'Nexa Series add-on',
    priceUnit: 'per unit',
    endUserPrice: price,
    siChannelPrice: price,
    resellerPrice: price,
    competitivePrice: null
  }));
}

export function buildProductRateRows(): ProductRateRow[] {
  const catalogRows = (Array.isArray(products) ? products : [])
    .filter((product) => product.enabled !== false)
    .flatMap(buildProductRows);

  return [...catalogRows, ...buildControllerRows(), ...buildAddonRows()];
}

export function getRateSheetSeries(rows: ProductRateRow[]): string[] {
  const present = new Set(rows.map((row) => row.series));
  const ordered = SERIES_DISPLAY_ORDER.filter((series) => present.has(series));
  const extras = [...present]
    .filter((series) => !SERIES_DISPLAY_ORDER.includes(series as (typeof SERIES_DISPLAY_ORDER)[number]))
    .sort();
  return [...ordered, ...extras];
}
