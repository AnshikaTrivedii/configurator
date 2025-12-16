/**
 * Pixel Pitch Recommendation Utility
 * 
 * Provides distance-based pixel pitch recommendations using only
 * pitches that exist in the actual product catalog.
 */

// Available pixel pitches in the product catalog
export const AVAILABLE_PIXEL_PITCHES = [
  0.9375, 1.25, 1.5, 1.5625, 1.86, 2.5, 3, 4, 6.6, 10
];

/**
 * Normalize pixel pitch string to number
 * Converts strings like "P1.5625mm", "1.5625", "P1.8mm" to numeric values
 */
export function normalize(pitch: string | number | null | undefined): number | null {
  if (pitch === null || pitch === undefined) return null;
  
  // If already a number, return it
  if (typeof pitch === 'number') return pitch;
  
  // Convert string to number
  const normalized = parseFloat(
    pitch.toString()
      .replace(/^P/i, '') // Remove leading P
      .replace(/mm$/i, '') // Remove trailing mm
      .trim()
  );
  
  return isNaN(normalized) ? null : normalized;
}

/**
 * Get recommended pixel pitch based on viewing distance
 * 
 * Distance → Ideal Pixel Pitch Range:
 * 0.9–1.4m → 0.9–1.2
 * 1.5–2.0m → 1.2–1.5
 * 2.0–3.0m → 1.5–1.8
 * 3.0–4.0m → 1.8–2.5
 * 4.0–6.0m → 2.5–3
 * 6.0–10m → 3–4
 * 10m+ → 4–10
 * 
 * @param distance - Viewing distance value
 * @param unit - Unit of distance ('meters' or 'feet')
 * @returns Recommended pixel pitch from available pitches, or null if no match
 */
export function getRecommendedPixelPitch(
  distance: number,
  unit: 'meters' | 'feet'
): number | null {
  // Convert distance to meters
  const distanceInMeters = unit === 'feet' ? distance * 0.3048 : distance;
  
  // Determine ideal pixel pitch range based on distance
  let idealMin: number;
  let idealMax: number;
  
  if (distanceInMeters <= 1.4) {
    idealMin = 0.9;
    idealMax = 1.2;
  } else if (distanceInMeters <= 2.0) {
    idealMin = 1.2;
    idealMax = 1.5;
  } else if (distanceInMeters <= 3.0) {
    idealMin = 1.5;
    idealMax = 1.8;
  } else if (distanceInMeters <= 4.0) {
    idealMin = 1.8;
    idealMax = 2.5;
  } else if (distanceInMeters <= 6.0) {
    idealMin = 2.5;
    idealMax = 3;
  } else if (distanceInMeters <= 10.0) {
    idealMin = 3;
    idealMax = 4;
  } else {
    idealMin = 4;
    idealMax = 10;
  }
  
  // Filter available pitches within the ideal range
  const valid = AVAILABLE_PIXEL_PITCHES.filter(p => p >= idealMin && p <= idealMax);
  
  // If none found, choose the closest overall to idealMin
  if (valid.length === 0) {
    return AVAILABLE_PIXEL_PITCHES.reduce((prev, curr) =>
      Math.abs(curr - idealMin) < Math.abs(prev - idealMin) ? curr : prev
    );
  }
  
  // Select the closest to mid-range
  const mid = (idealMin + idealMax) / 2;
  return valid.reduce((prev, curr) =>
    Math.abs(curr - mid) < Math.abs(prev - mid) ? curr : prev
  );
}

/**
 * Get recommended pixel pitch for a viewing distance range
 * Uses the midpoint of the range to determine recommendation
 * 
 * @param distanceRange - Range string in format "min-max" (e.g., "1.8-3.6")
 * @param unit - Unit of distance ('meters' or 'feet')
 * @returns Recommended pixel pitch from available pitches, or null if invalid
 */
export function getRecommendedPixelPitchForRange(
  distanceRange: string,
  unit: 'meters' | 'feet'
): number | null {
  // Parse the range (format: "min-max")
  const [minStr, maxStr] = distanceRange.split('-');
  const selectedMin = parseFloat(minStr);
  const selectedMax = parseFloat(maxStr);
  
  if (isNaN(selectedMin) || isNaN(selectedMax)) {
    return null;
  }
  
  // Use the midpoint of the range
  const midpoint = (selectedMin + selectedMax) / 2;
  
  return getRecommendedPixelPitch(midpoint, unit);
}

/**
 * Check if a pixel pitch is in the available list
 */
export function isAvailablePixelPitch(pitch: number | string | null): boolean {
  const normalized = normalize(pitch);
  if (normalized === null) return false;
  
  return AVAILABLE_PIXEL_PITCHES.some(available => 
    Math.abs(available - normalized) < 0.01
  );
}

/**
 * Get all available pixel pitches (for display/selection)
 */
export function getAvailablePixelPitches(): number[] {
  return [...AVAILABLE_PIXEL_PITCHES];
}

