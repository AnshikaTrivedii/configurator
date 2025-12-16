// Viewing Distance Ranges based on Pixel Pitch
// Data extracted from the provided spreadsheet

import { getRecommendedPixelPitchForRange } from './pixelPitchRecommendation';

export interface ViewingDistanceRange {
  pixelPitch: number;
  minMeters: number;
  maxMeters: number;
  minFeet: number;
  maxFeet: number;
  displayText: string;
}

export const VIEWING_DISTANCE_RANGES: ViewingDistanceRange[] = [
  { pixelPitch: 0.9, minMeters: 0.9, maxMeters: 1.8, minFeet: 3, maxFeet: 6, displayText: "0.9-1.8m (3-6ft)" },
  { pixelPitch: 1.25, minMeters: 1.25, maxMeters: 2.5, minFeet: 4, maxFeet: 8, displayText: "1.25-2.5m (4-8ft)" },
  { pixelPitch: 1.5, minMeters: 1.5, maxMeters: 3, minFeet: 5, maxFeet: 10, displayText: "1.5-3m (5-10ft)" },
  { pixelPitch: 1.8, minMeters: 1.8, maxMeters: 3.6, minFeet: 6, maxFeet: 12, displayText: "1.8-3.6m (6-12ft)" },
  { pixelPitch: 2.5, minMeters: 2.5, maxMeters: 5, minFeet: 8.2, maxFeet: 16.4, displayText: "2.5-5m (8.2-16.4ft)" },
  { pixelPitch: 2.6, minMeters: 2.6, maxMeters: 5.2, minFeet: 8.5, maxFeet: 17, displayText: "2.6-5.2m (8.5-17ft)" },
  { pixelPitch: 2.9, minMeters: 2.9, maxMeters: 5.8, minFeet: 9.5, maxFeet: 19, displayText: "2.9-5.8m (9.5-19ft)" },
  { pixelPitch: 3, minMeters: 3, maxMeters: 6, minFeet: 10, maxFeet: 20, displayText: "3-6m (10-20ft)" },
  { pixelPitch: 3.8, minMeters: 3.8, maxMeters: 7.6, minFeet: 12, maxFeet: 25, displayText: "3.8-7.6m (12-25ft)" },
  { pixelPitch: 3.91, minMeters: 3.91, maxMeters: 7.82, minFeet: 13, maxFeet: 26, displayText: "3.91-7.82m (13-26ft)" },
  { pixelPitch: 4, minMeters: 4, maxMeters: 8, minFeet: 13, maxFeet: 26, displayText: "4-8m (13-26ft)" },
  { pixelPitch: 4.8, minMeters: 4.8, maxMeters: 9.6, minFeet: 16, maxFeet: 31, displayText: "4.8-9.6m (16-31ft)" },
  { pixelPitch: 5, minMeters: 5, maxMeters: 10, minFeet: 16, maxFeet: 33, displayText: "5-10m (16-33ft)" },
  { pixelPitch: 6, minMeters: 6, maxMeters: 12, minFeet: 20, maxFeet: 39, displayText: "6-12m (20-39ft)" },
  { pixelPitch: 6.25, minMeters: 6.25, maxMeters: 12.5, minFeet: 20, maxFeet: 41, displayText: "6.25-12.5m (20-41ft)" },
  { pixelPitch: 6.5, minMeters: 6.5, maxMeters: 13, minFeet: 21, maxFeet: 43, displayText: "6.5-13m (21-43ft)" },
  { pixelPitch: 6.6, minMeters: 6.6, maxMeters: 13.2, minFeet: 22, maxFeet: 43, displayText: "6.6-13.2m (22-43ft)" },
  { pixelPitch: 8, minMeters: 8, maxMeters: 16, minFeet: 26, maxFeet: 52, displayText: "8-16m (26-52ft)" },
  { pixelPitch: 10, minMeters: 10, maxMeters: 20, minFeet: 32, maxFeet: 65, displayText: "10-20m (32-65ft)" },
  { pixelPitch: 15, minMeters: 15, maxMeters: 30, minFeet: 49, maxFeet: 98, displayText: "15-30m (49-98ft)" },
  { pixelPitch: 20, minMeters: 20, maxMeters: 40, minFeet: 65, maxFeet: 131, displayText: "20-40m (65-131ft)" }
];

/**
 * Get viewing distance range for a specific pixel pitch
 */
export function getViewingDistanceRange(pixelPitch: number): ViewingDistanceRange | undefined {
  return VIEWING_DISTANCE_RANGES.find(range => range.pixelPitch === pixelPitch);
}

/**
 * Get all viewing distance options for a specific pixel pitch
 */
export function getViewingDistanceOptions(pixelPitch: number): { value: string; label: string }[] {
  const range = getViewingDistanceRange(pixelPitch);
  if (!range) {
    return [];
  }

  const options = [];
  
  // Add minimum distance option
  options.push({
    value: `${range.minMeters}`,
    label: `${range.minMeters}m (${range.minFeet}ft) - Minimum`
  });

  // Add maximum distance option
  options.push({
    value: `${range.maxMeters}`,
    label: `${range.maxMeters}m (${range.maxFeet}ft) - Maximum`
  });

  // Add range option
  options.push({
    value: `${range.minMeters}-${range.maxMeters}`,
    label: `${range.displayText} - Recommended Range`
  });

  return options;
}

/**
 * Get the recommended viewing distance text for display
 */
export function getRecommendedViewingDistance(pixelPitch: number): string {
  const range = getViewingDistanceRange(pixelPitch);
  return range ? range.displayText : 'N/A';
}

/**
 * Check if a viewing distance is within the recommended range for a pixel pitch
 */
export function isViewingDistanceInRange(pixelPitch: number, distance: number, unit: 'meters' | 'feet'): boolean {
  const range = getViewingDistanceRange(pixelPitch);
  if (!range) return false;
  
  // Convert distance to meters if needed
  const distanceInMeters = unit === 'feet' ? distance * 0.3048 : distance;
  
  // Check if distance is within the recommended range
  return distanceInMeters >= range.minMeters && distanceInMeters <= range.maxMeters;
}

/**
 * Get all available viewing distance options for the dropdown
 * This provides a comprehensive list of all viewing distances from the predefined data
 */
export function getAllViewingDistanceOptions(): { value: string; label: string; pixelPitch?: number }[] {
  const options: { value: string; label: string; pixelPitch?: number }[] = [];
  
  // Add all pixel pitch ranges
  VIEWING_DISTANCE_RANGES.forEach(range => {
    // Add minimum distance option
    options.push({
      value: `${range.pixelPitch}-min`,
      label: `P${range.pixelPitch} - ${range.minMeters}m (${range.minFeet}ft) - Minimum`,
      pixelPitch: range.pixelPitch
    });
    
    // Add maximum distance option
    options.push({
      value: `${range.pixelPitch}-max`,
      label: `P${range.pixelPitch} - ${range.maxMeters}m (${range.maxFeet}ft) - Maximum`,
      pixelPitch: range.pixelPitch
    });
    
    // Add range option
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
 */
export function getViewingDistanceOptionsForPixelPitch(pixelPitch: number): { value: string; label: string }[] {
  const range = getViewingDistanceRange(pixelPitch);
  if (!range) {
    return [];
  }

  const options = [];
  
  // Add minimum distance option
  options.push({
    value: `${range.pixelPitch}-min`,
    label: `${range.minMeters}m (${range.minFeet}ft) - Minimum`
  });

  // Add maximum distance option
  options.push({
    value: `${range.pixelPitch}-max`,
    label: `${range.maxMeters}m (${range.maxFeet}ft) - Maximum`
  });

  // Add range option
  options.push({
    value: `${range.pixelPitch}-range`,
    label: `${range.displayText} - Recommended Range`
  });

  return options;
}

/**
 * Get viewing distance options based on unit (meters or feet) in min-to-max range format
 */
export function getViewingDistanceOptionsByUnit(unit: 'meters' | 'feet'): { value: string; label: string; pixelPitch: number }[] {
  const options: { value: string; label: string; pixelPitch: number }[] = [];
  
  VIEWING_DISTANCE_RANGES.forEach(range => {
    if (unit === 'meters') {
      // Show distances in meters as min-to-max range (without pixel pitch info)
      options.push({
        value: `${range.minMeters}-${range.maxMeters}`,
        label: `${range.minMeters}-${range.maxMeters}m`,
        pixelPitch: range.pixelPitch
      });
    } else {
      // Show distances in feet as min-to-max range (without pixel pitch info)
      options.push({
        value: `${range.minFeet}-${range.maxFeet}`,
        label: `${range.minFeet}-${range.maxFeet}ft`,
        pixelPitch: range.pixelPitch
      });
    }
  });
  
  // Remove duplicates and sort by pixel pitch
  const uniqueOptions = options.filter((option, index, self) => 
    index === self.findIndex(o => o.value === option.value)
  );
  
  return uniqueOptions.sort((a, b) => a.pixelPitch - b.pixelPitch);
}

/**
 * Get pixel pitches that match a specific viewing distance range and unit
 * Returns only the recommended pixel pitch from available product catalog pitches
 */
export function getPixelPitchesForViewingDistanceRange(distanceRange: string, unit: 'meters' | 'feet'): number[] {
  const recommendedPitch = getRecommendedPixelPitchForRange(distanceRange, unit);
  
  // Return array with the recommended pitch, or empty array if no recommendation
  if (recommendedPitch !== null) {
    return [recommendedPitch];
  }
  
  return [];
}

/**
 * Get the specific pixel pitch for a viewing distance range
 * Returns the recommended pixel pitch based on the distance range
 * Uses the new recommendation logic that only returns pitches from the product catalog
 */
export function getPixelPitchForViewingDistanceRange(distanceRange: string, unit: 'meters' | 'feet'): number | null {
  return getRecommendedPixelPitchForRange(distanceRange, unit);
}

/**
 * Get pixel pitches that match a specific viewing distance and unit (for single values)
 */
export function getPixelPitchesForViewingDistance(distance: number, unit: 'meters' | 'feet'): number[] {
  const matchingPixelPitches: number[] = [];
  
  VIEWING_DISTANCE_RANGES.forEach(range => {
    let minDistance: number;
    let maxDistance: number;
    
    if (unit === 'meters') {
      minDistance = range.minMeters;
      maxDistance = range.maxMeters;
    } else {
      minDistance = range.minFeet;
      maxDistance = range.maxFeet;
    }
    
    // Check if the selected distance falls within this pixel pitch range
    if (distance >= minDistance && distance <= maxDistance) {
      matchingPixelPitches.push(range.pixelPitch);
    }
  });
  
  return matchingPixelPitches;
}