/**
 * Product Filtering Utility
 * 
 * Shared filtering logic used by ProductSelector
 * Ensures consistent product recommendations across the application
 * 
 * IMPORTANT: All functions use data from /src/data/products.ts
 * - Only uses products where enabled === true
 * - Excludes: Rental, Flexible, Transparent, Jumbo products
 * - All recommendations are based on actual product data, not hardcoded values
 */

import { Product } from '../types';
import { products } from '../data/products';
import { getPixelPitchesForViewingDistanceRange, getPixelPitchesForViewingDistance } from './viewingDistanceRanges';

export interface ProductFilterOptions {
  environment?: 'Indoor' | 'Outdoor' | null;
  indoorType?: 'SMD' | 'COB' | null;
  category?: string | null;
  pixelPitch?: number | null;
  viewingDistance?: string | null; // Range format: "min-max"
  viewingDistanceUnit?: 'meters' | 'feet';
  viewingDistanceValue?: number | null; // Single value
  enabled?: boolean; // Default: true (only enabled products)
}

/**
 * Normalize environment string for comparison
 */
function normalizeEnv(env: string): string {
  return env.trim().toLowerCase();
}

/**
 * Get product type (SMD/COB) from product
 */
function getProductType(product: Product): 'SMD' | 'COB' | undefined {
  const normalizeType = (type: string | undefined) => (type || '').toLowerCase();
  
  // Check ledType property
  if (product.ledType) {
    if (normalizeType(product.ledType).includes('cob')) return 'COB';
    if (normalizeType(product.ledType).includes('smd')) return 'SMD';
  }
  // Check pixelComposition property
  if (product.pixelComposition) {
    if (normalizeType(product.pixelComposition).includes('cob')) return 'COB';
    if (normalizeType(product.pixelComposition).includes('smd')) return 'SMD';
  }
  // Check product name
  if (product.name.toLowerCase().includes('cob')) return 'COB';
  if (product.name.toLowerCase().includes('smd')) return 'SMD';
  return undefined;
}

/**
 * Filter products using the same logic as ProductSelector
 */
export function filterProducts(options: ProductFilterOptions = {}): Product[] {
  const {
    environment = null,
    indoorType = null,
    category = null,
    pixelPitch = null,
    viewingDistance = null,
    viewingDistanceUnit = 'meters',
    viewingDistanceValue = null,
    enabled = true
  } = options;

  let filtered = [...products];

  // Filter by enabled status
  if (enabled) {
    filtered = filtered.filter((p) => p.enabled === true); // Only enabled: true, not false or undefined
  }
  
  // Exclude rental, flexible, transparent, jumbo products
  filtered = filtered.filter((p) => {
    const category = (p.category || '').toLowerCase();
    return !category.includes('rental') && 
           !category.includes('flexible') && 
           !category.includes('transparent') && 
           !category.includes('jumbo');
  });

  // Filter by environment
  if (environment) {
    filtered = filtered.filter((p) => normalizeEnv(p.environment) === normalizeEnv(environment));
  }

  // Filter by indoor type (SMD/COB) - only applies when Indoor is selected
  if (environment === 'Indoor' && indoorType) {
    filtered = filtered.filter((p) => getProductType(p) === indoorType);
  }

  // Filter by category
  if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }

  // Filter by pixel pitch (exact match with tolerance)
  if (pixelPitch !== null) {
    filtered = filtered.filter((p) => Math.abs(p.pixelPitch - pixelPitch) < 0.1);
  }

  // Filter by viewing distance
  if (viewingDistance) {
    // Viewing distance is a range (e.g., "3-6")
    const recommendedPixelPitches = getPixelPitchesForViewingDistanceRange(viewingDistance, viewingDistanceUnit, environment);
    if (recommendedPixelPitches.length > 0) {
      filtered = filtered.filter((p) =>
        recommendedPixelPitches.some(pitch => Math.abs(p.pixelPitch - pitch) < 0.1)
      );
    }
  } else if (viewingDistanceValue !== null) {
    // Viewing distance is a single value
    const recommendedPixelPitches = getPixelPitchesForViewingDistance(viewingDistanceValue, viewingDistanceUnit, environment);
    if (recommendedPixelPitches.length > 0) {
      filtered = filtered.filter((p) =>
        recommendedPixelPitches.some(pitch => Math.abs(p.pixelPitch - pitch) < 0.1)
      );
    }
  }

  // Remove duplicates and sort by pixel pitch
  const unique = filtered.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
  return unique.sort((a, b) => a.pixelPitch - b.pixelPitch);
}

/**
 * Get available pixel pitches from filtered products
 */
export function getAvailablePixelPitches(options: ProductFilterOptions = {}): number[] {
  const filtered = filterProducts(options);
  return Array.from(new Set(filtered.map(p => p.pixelPitch))).sort((a, b) => a - b);
}

/**
 * Get product series from filtered products
 */
export function getProductSeries(filteredProducts: Product[]): string[] {
  const series = new Set<string>();
  filteredProducts.forEach(product => {
    // Extract series from category or name
    const category = product.category || '';
    if (category.includes('Rigel')) series.add('Rigel Series');
    if (category.includes('Betel')) series.add('Betel Series');
    if (category.includes('Bellatrix')) series.add('Bellatrix Series');
    if (category.includes('Flexible')) series.add('Flexible Series');
    if (category.includes('Rental')) series.add('Rental Series');
    if (category.includes('Jumbo')) series.add('Jumbo Series');
    if (category.includes('Standee')) series.add('Standee Series');
    if (category.includes('Transparent')) series.add('Transparent Series');
  });
  return Array.from(series);
}

/**
 * Get IDEAL pixel pitch based on viewing distance (NEW FORMULA)
 * Formula: IdealPitch = ViewingDistance(feet) ÷ 10
 * Accept pitch ± 30% range
 * Example: 25 ft → ideal ≈ P2.5, range: P1.75–P3.25
 */
export function getIdealPixelPitchRange(
  distance: number,
  unit: 'meters' | 'feet'
): { ideal: number; min: number; max: number } | null {
  if (distance <= 0) return null;
  
  // Convert to feet
  const distanceFt = unit === 'meters' ? distance * 3.28084 : distance;
  
  // Calculate ideal pitch: IdealPitch = ViewingDistance(feet) ÷ 10
  const idealPitch = distanceFt / 10;
  
  // ± 30% range
  const min = idealPitch * 0.7; // 30% below
  const max = idealPitch * 1.3; // 30% above
  
  return {
    ideal: idealPitch,
    min: Math.max(0.9, min), // Minimum practical pitch
    max: Math.min(20, max) // Maximum practical pitch
  };
}

/**
 * Find closest available pixel pitch to ideal pitch
 * Uses ideal pitch value (not just range)
 */
export function findClosestAvailablePitch(
  idealPitch: number,
  idealMin: number,
  idealMax: number,
  availablePitches: number[]
): number | null {
  if (availablePitches.length === 0) return null;
  
  // Find pitches within ideal range (± 40%)
  const inRange = availablePitches.filter(p => p >= idealMin && p <= idealMax);
  if (inRange.length > 0) {
    // Return the one closest to ideal pitch
    return inRange.reduce((closest, current) => 
      Math.abs(current - idealPitch) < Math.abs(closest - idealPitch) ? current : closest
    );
  }
  
  // If no pitch in range, find closest to ideal pitch
  return availablePitches.reduce((closest, current) => 
    Math.abs(current - idealPitch) < Math.abs(closest - idealPitch) ? current : closest
  );
}

/**
 * Get recommended pixel pitches based on viewing distance (NEW RULES)
 * Returns both ideal range and closest available pitches
 * 
 * IMPORTANT: Only returns pitches that actually exist in enabled products
 */
export function getRecommendedPixelPitchesForViewingDistance(
  distance: number,
  unit: 'meters' | 'feet',
  environment?: 'Indoor' | 'Outdoor' | null
): {
  idealRange: { ideal: number; min: number; max: number } | null;
  availablePitches: number[];
  closestPitch: number | null;
} {
  // Get ideal range
  const idealRange = getIdealPixelPitchRange(distance, unit);
  
  // Get all available pitches from actual products (excluding rental/flexible/transparent/jumbo)
  const allAvailablePitches = getAvailablePixelPitches({ 
    enabled: true, 
    environment: environment || undefined 
  });
  
  // Find closest available pitch if ideal range exists
  let closestPitch: number | null = null;
  if (idealRange) {
    closestPitch = findClosestAvailablePitch(
      idealRange.ideal,
      idealRange.min,
      idealRange.max,
      allAvailablePitches
    );
  }
  
  // Get pitches within ideal range (if any)
  const pitchesInRange = idealRange
    ? allAvailablePitches.filter(p => p >= idealRange.min && p <= idealRange.max)
    : [];
  
  // CRITICAL RULE: If no pitches in range, use closest HIGHER pitch (never default to P1.8)
  // Return only pitches that are actually in range, or closest pitch if none in range
  // Don't return all available pitches as fallback - that's too broad
  let finalAvailablePitches: number[] = [];
  if (pitchesInRange.length > 0) {
    // Use pitches within ideal range
    finalAvailablePitches = pitchesInRange;
  } else if (closestPitch) {
    // Use closest pitch (should be higher than ideal if no exact match)
    finalAvailablePitches = [closestPitch];
    
    // CRITICAL: Validate closest pitch is reasonable
    // If ideal is > 2.0 and closest is 1.8, that's wrong - find next higher pitch
    if (idealRange && closestPitch === 1.8 && idealRange.ideal > 2.0) {
      // Find next higher pitch
      const higherPitches = allAvailablePitches.filter(p => p > idealRange.ideal);
      if (higherPitches.length > 0) {
        const nextHigher = higherPitches.sort((a, b) => a - b)[0];
        console.log('[getRecommendedPixelPitchesForViewingDistance] ⚠️ Closest pitch P1.8 seems wrong for ideal', idealRange.ideal, '- using next higher:', nextHigher);
        finalAvailablePitches = [nextHigher];
      }
    }
  }
  
  return {
    idealRange,
    availablePitches: finalAvailablePitches,
    closestPitch
  };
}

/**
 * Get recommended pixel pitches based on viewing distance range
 */
export function getRecommendedPixelPitchesForViewingDistanceRange(
  range: string,
  unit: 'meters' | 'feet',
  environment?: 'Indoor' | 'Outdoor' | null
): number[] {
  return getPixelPitchesForViewingDistanceRange(range, unit, environment);
}

