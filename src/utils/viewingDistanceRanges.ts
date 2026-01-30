

import { AVAILABLE_PIXEL_PITCHES } from './pixelPitchRecommendation';

export interface ViewingDistanceRange {
  pixelPitch: number;
  minMeters: number;
  maxMeters: number;
  minFeet: number;
  maxFeet: number;
  displayText: string;
  environment?: 'Indoor' | 'Outdoor'; // Optional environment filter
}

export const INDOOR_VIEWING_DISTANCE_RANGES: ViewingDistanceRange[] = [
  { pixelPitch: 0.9,  minMeters: 0.9,  maxMeters: 1.5,  minFeet: 3,   maxFeet: 4.9,  displayText: '0.9-1.5m (3-4.9ft)', environment: 'Indoor' },
  { pixelPitch: 1.25, minMeters: 0.9,  maxMeters: 1.5,  minFeet: 3,   maxFeet: 4.9,  displayText: '0.9-1.5m (3-4.9ft)', environment: 'Indoor' }, // P1.25 also in first row
  { pixelPitch: 1.25, minMeters: 1.25, maxMeters: 1.8,  minFeet: 4.1, maxFeet: 5.9,  displayText: '1.25-1.8m (4.1-5.9ft)', environment: 'Indoor' }, // P1.25 in second row
  { pixelPitch: 1.5625, minMeters: 1.25, maxMeters: 1.8,  minFeet: 4.1, maxFeet: 5.9,  displayText: '1.25-1.8m (4.1-5.9ft)', environment: 'Indoor' },
  { pixelPitch: 1.8,  minMeters: 1.8,  maxMeters: 3,    minFeet: 5.9,  maxFeet: 9.8,  displayText: '1.8-3m (5.9-9.8ft)', environment: 'Indoor' },
  { pixelPitch: 2.5,  minMeters: 1.8,  maxMeters: 3,    minFeet: 5.9,  maxFeet: 9.8,  displayText: '1.8-3m (5.9-9.8ft)', environment: 'Indoor' }
];

export const OUTDOOR_VIEWING_DISTANCE_RANGES: ViewingDistanceRange[] = [
  { pixelPitch: 2.5,  minMeters: 2.5,  maxMeters: 3,    minFeet: 8.2, maxFeet: 9.8,  displayText: '2.5-3m (8.2-9.8ft)', environment: 'Outdoor' },
  { pixelPitch: 3,    minMeters: 2.5,  maxMeters: 3,    minFeet: 8.2, maxFeet: 9.8,  displayText: '2.5-3m (8.2-9.8ft)', environment: 'Outdoor' },
  { pixelPitch: 4,    minMeters: 4,    maxMeters: 8,    minFeet: 13.1, maxFeet: 26.2, displayText: '4-8m (13.1-26.2ft)', environment: 'Outdoor' },
  { pixelPitch: 6.6,  minMeters: 4,    maxMeters: 8,    minFeet: 13.1, maxFeet: 26.2, displayText: '4-8m (13.1-26.2ft)', environment: 'Outdoor' },
  { pixelPitch: 6.6,  minMeters: 10,   maxMeters: 999,  minFeet: 32.8, maxFeet: 3278, displayText: '10m+ (32.8ft+)', environment: 'Outdoor' },
  { pixelPitch: 10,   minMeters: 10,   maxMeters: 999,  minFeet: 32.8, maxFeet: 3278, displayText: '10m+ (32.8ft+)', environment: 'Outdoor' }
];

export const VIEWING_DISTANCE_RANGES: ViewingDistanceRange[] = [
  ...INDOOR_VIEWING_DISTANCE_RANGES,
  ...OUTDOOR_VIEWING_DISTANCE_RANGES
];

/**
 * Get viewing distance range for a specific pixel pitch
 * @param pixelPitch - The pixel pitch value
 * @param environment - Optional environment filter ('Indoor' or 'Outdoor')
 */
export function getViewingDistanceRange(pixelPitch: number, environment?: 'Indoor' | 'Outdoor' | null): ViewingDistanceRange | undefined {
  const ranges = environment === 'Outdoor' 
    ? OUTDOOR_VIEWING_DISTANCE_RANGES 
    : environment === 'Indoor'
    ? INDOOR_VIEWING_DISTANCE_RANGES
    : VIEWING_DISTANCE_RANGES;
  
  return ranges.find(range => Math.abs(range.pixelPitch - pixelPitch) < 0.01);
}

/**
 * Get all viewing distance options for a specific pixel pitch
 * @param pixelPitch - The pixel pitch value
 * @param environment - Optional environment filter ('Indoor' or 'Outdoor')
 */
export function getViewingDistanceOptions(pixelPitch: number, environment?: 'Indoor' | 'Outdoor' | null): { value: string; label: string }[] {
  const range = getViewingDistanceRange(pixelPitch, environment);
  if (!range) {
    return [];
  }

  const options = [];

  options.push({
    value: `${range.minMeters}`,
    label: `${range.minMeters}m (${range.minFeet}ft) - Minimum`
  });

  if (range.maxMeters < 999) {
    options.push({
      value: `${range.maxMeters}`,
      label: `${range.maxMeters}m (${range.maxFeet}ft) - Maximum`
    });
  }

  const rangeValue = range.maxMeters >= 999 ? `${range.minMeters}+` : `${range.minMeters}-${range.maxMeters}`;
  options.push({
    value: rangeValue,
    label: `${range.displayText} - Recommended Range`
  });

  return options;
}

/**
 * Get the recommended viewing distance text for display
 * @param pixelPitch - The pixel pitch value
 * @param environment - Optional environment filter ('Indoor' or 'Outdoor')
 */
export function getRecommendedViewingDistance(pixelPitch: number, environment?: 'Indoor' | 'Outdoor' | null): string {
  const range = getViewingDistanceRange(pixelPitch, environment);
  return range ? range.displayText : 'N/A';
}

/**
 * Check if a viewing distance is within the recommended range for a pixel pitch
 * @param pixelPitch - The pixel pitch value
 * @param distance - The viewing distance
 * @param unit - The unit ('meters' or 'feet')
 * @param environment - Optional environment filter ('Indoor' or 'Outdoor')
 */
export function isViewingDistanceInRange(pixelPitch: number, distance: number, unit: 'meters' | 'feet', environment?: 'Indoor' | 'Outdoor' | null): boolean {
  const range = getViewingDistanceRange(pixelPitch, environment);
  if (!range) return false;

  const distanceInMeters = unit === 'feet' ? distance * 0.3048 : distance;

  if (range.maxMeters >= 999) {
    return distanceInMeters >= range.minMeters;
  }
  return distanceInMeters >= range.minMeters && distanceInMeters <= range.maxMeters;
}

/**
 * Get all available viewing distance options for the dropdown
 * This provides a comprehensive list of all viewing distances from the predefined data
 */
export function getAllViewingDistanceOptions(): { value: string; label: string; pixelPitch?: number }[] {
  const options: { value: string; label: string; pixelPitch?: number }[] = [];

  VIEWING_DISTANCE_RANGES.forEach(range => {

    options.push({
      value: `${range.pixelPitch}-min`,
      label: `P${range.pixelPitch} - ${range.minMeters}m (${range.minFeet}ft) - Minimum`,
      pixelPitch: range.pixelPitch
    });

    options.push({
      value: `${range.pixelPitch}-max`,
      label: `P${range.pixelPitch} - ${range.maxMeters}m (${range.maxFeet}ft) - Maximum`,
      pixelPitch: range.pixelPitch
    });

    options.push({
      value: `${range.pixelPitch}-range`,
      label: `P${range.pixelPitch} - ${range.displayText} - Recommended Range`,
      pixelPitch: range.pixelPitch
    });
  });
  
  return options;
}

/**
 * Get viewing distance options for a specific pixel pitch
 * @param pixelPitch - The pixel pitch value
 * @param environment - Optional environment filter ('Indoor' or 'Outdoor')
 */
export function getViewingDistanceOptionsForPixelPitch(pixelPitch: number, environment?: 'Indoor' | 'Outdoor' | null): { value: string; label: string }[] {
  const range = getViewingDistanceRange(pixelPitch, environment);
  if (!range) {
    return [];
  }

  const options = [];

  options.push({
    value: `${range.pixelPitch}-min`,
    label: `${range.minMeters}m (${range.minFeet}ft) - Minimum`
  });

  if (range.maxMeters < 999) {
    options.push({
      value: `${range.pixelPitch}-max`,
      label: `${range.maxMeters}m (${range.maxFeet}ft) - Maximum`
    });
  }

  options.push({
    value: `${range.pixelPitch}-range`,
    label: `${range.displayText} - Recommended Range`
  });

  return options;
}

/**
 * Get viewing distance options based on unit (meters or feet) in min-to-max range format
 * @param unit - The unit ('meters' or 'feet')
 * @param environment - Optional environment filter ('Indoor' or 'Outdoor')
 */
export function getViewingDistanceOptionsByUnit(unit: 'meters' | 'feet', environment?: 'Indoor' | 'Outdoor' | null): { value: string; label: string; pixelPitch: number }[] {
  const options: { value: string; label: string; pixelPitch: number }[] = [];
  
  const ranges = environment === 'Outdoor' 
    ? OUTDOOR_VIEWING_DISTANCE_RANGES 
    : environment === 'Indoor'
    ? INDOOR_VIEWING_DISTANCE_RANGES
    : VIEWING_DISTANCE_RANGES;
  
  ranges.forEach(range => {
    if (unit === 'meters') {

      const maxValue = range.maxMeters >= 999 ? '+' : range.maxMeters;
      const label = range.maxMeters >= 999 ? `${range.minMeters}m+` : `${range.minMeters}-${range.maxMeters}m`;
      options.push({
        value: range.maxMeters >= 999 ? `${range.minMeters}+` : `${range.minMeters}-${range.maxMeters}`,
        label: label,
        pixelPitch: range.pixelPitch
      });
    } else {

      const maxValue = range.maxFeet >= 3278 ? '+' : range.maxFeet;
      const label = range.maxFeet >= 3278 ? `${range.minFeet}ft+` : `${range.minFeet}-${range.maxFeet}ft`;
      options.push({
        value: range.maxFeet >= 3278 ? `${range.minFeet}+` : `${range.minFeet}-${range.maxFeet}`,
        label: label,
        pixelPitch: range.pixelPitch
      });
    }
  });

  const uniqueOptions = options.filter((option, index, self) => 
    index === self.findIndex(o => o.value === option.value)
  );
  
  return uniqueOptions.sort((a, b) => a.pixelPitch - b.pixelPitch);
}

/**
 * Get pixel pitches that match a specific viewing distance range and unit
 * Returns only the recommended pixel pitch from available product catalog pitches
 * @param distanceRange - The distance range string (e.g., "2.5-3" or "10+")
 * @param unit - The unit ('meters' or 'feet')
 * @param environment - Optional environment filter ('Indoor' or 'Outdoor')
 */
export function getPixelPitchesForViewingDistanceRange(
  distanceRange: string,
  unit: 'meters' | 'feet',
  environment?: 'Indoor' | 'Outdoor' | null
): number[] {
  if (!distanceRange) return [];

  const isPlusRange = distanceRange.endsWith('+');
  const cleanRange = isPlusRange ? distanceRange.slice(0, -1) : distanceRange;
  const [minStr, maxStr] = cleanRange.split('-');
  const selectedMin = parseFloat(minStr);
  const selectedMax = isPlusRange ? 999 : parseFloat(maxStr || minStr);

  if (isNaN(selectedMin)) {
    return [];
  }

  const matchingPixelPitches: number[] = [];
  
  const ranges = environment === 'Outdoor' 
    ? OUTDOOR_VIEWING_DISTANCE_RANGES 
    : environment === 'Indoor'
    ? INDOOR_VIEWING_DISTANCE_RANGES
    : VIEWING_DISTANCE_RANGES;

  ranges.forEach(range => {
    let rangeMin: number;
    let rangeMax: number;

    if (unit === 'meters') {
      rangeMin = range.minMeters;
      rangeMax = range.maxMeters;
    } else {
      rangeMin = range.minFeet;
      rangeMax = range.maxFeet;
    }

    if (isPlusRange) {
      if (Math.abs(selectedMin - rangeMin) < 0.01 && rangeMax >= 999) {
        matchingPixelPitches.push(range.pixelPitch);
      }
    } else {

      if (Math.abs(selectedMin - rangeMin) < 0.01 && Math.abs(selectedMax - rangeMax) < 0.01) {
        matchingPixelPitches.push(range.pixelPitch);
      }
    }
  });

  return Array.from(new Set(matchingPixelPitches));
}

/**
 * Get the specific pixel pitch for a viewing distance range
 * Returns the recommended pixel pitch based on the distance range
 * Uses the new recommendation logic that only returns pitches from the product catalog
 * @param distanceRange - The distance range string
 * @param unit - The unit ('meters' or 'feet')
 * @param environment - Optional environment filter ('Indoor' or 'Outdoor')
 */
export function getPixelPitchForViewingDistanceRange(
  distanceRange: string,
  unit: 'meters' | 'feet',
  environment?: 'Indoor' | 'Outdoor' | null
): number | null {
  const pitches = getPixelPitchesForViewingDistanceRange(distanceRange, unit, environment);
  return pitches.length > 0 ? pitches[0] : null;
}

/**
 * Get pixel pitches that match a specific viewing distance and unit (for single values)
 * @param distance - The viewing distance value
 * @param unit - The unit ('meters' or 'feet')
 * @param environment - Optional environment filter ('Indoor' or 'Outdoor')
 */
export function getPixelPitchesForViewingDistance(distance: number, unit: 'meters' | 'feet', environment?: 'Indoor' | 'Outdoor' | null): number[] {
  const matchingPixelPitches: number[] = [];
  
  const ranges = environment === 'Outdoor' 
    ? OUTDOOR_VIEWING_DISTANCE_RANGES 
    : environment === 'Indoor'
    ? INDOOR_VIEWING_DISTANCE_RANGES
    : VIEWING_DISTANCE_RANGES;
  
  ranges.forEach(range => {
    let minDistance: number;
    let maxDistance: number;
    
    if (unit === 'meters') {
      minDistance = range.minMeters;
      maxDistance = range.maxMeters;
    } else {
      minDistance = range.minFeet;
      maxDistance = range.maxFeet;
    }

    if (maxDistance >= 999) {
      if (distance >= minDistance) {
        matchingPixelPitches.push(range.pixelPitch);
      }
    } else {
      if (distance >= minDistance && distance <= maxDistance) {
        matchingPixelPitches.push(range.pixelPitch);
      }
    }
  });
  
  return matchingPixelPitches;
}