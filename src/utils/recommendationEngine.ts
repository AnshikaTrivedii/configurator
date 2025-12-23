import { Product } from '../types';
import { products } from '../data/products';

export interface DisplayConfig {
  width: number; // in mm
  height: number; // in mm
  unit: 'mm' | 'cm' | 'm' | 'ft';
  environment?: 'Indoor' | 'Outdoor' | null;
  viewingDistance?: string | null;
  viewingDistanceUnit?: 'meters' | 'feet';
  pixelPitch?: number | null;
  selectedProductName?: string | null;
  entryMode?: 'guided' | 'direct' | null;
}

export interface Recommendation {
  message: string;
  type: 'info' | 'recommendation' | 'warning';
  suggestedPixelPitches?: number[];
  suggestedProducts?: Product[];
  trigger?: 'environment' | 'viewingDistance' | 'dimensions' | 'pixelPitch' | 'product';
}

// Convert dimensions to meters for calculations
const convertToMeters = (value: number, unit: 'mm' | 'cm' | 'm' | 'ft'): number => {
  switch (unit) {
    case 'mm':
      return value / 1000;
    case 'cm':
      return value / 100;
    case 'ft':
      return value * 0.3048;
    case 'm':
      return value;
    default:
      return value / 1000;
  }
};

// Convert viewing distance to meters
const convertViewingDistanceToMeters = (distance: string, unit: 'meters' | 'feet'): number => {
  const num = parseFloat(distance);
  if (isNaN(num)) return 0;
  return unit === 'feet' ? num * 0.3048 : num;
};

// Calculate screen area in square meters
const calculateScreenArea = (width: number, height: number, unit: 'mm' | 'cm' | 'm' | 'ft'): number => {
  const widthM = convertToMeters(width, unit);
  const heightM = convertToMeters(height, unit);
  return widthM * heightM;
};

// Get viewing distance category
const getViewingDistanceCategory = (distance: string | null, unit: 'meters' | 'feet' | undefined): 'near' | 'medium' | 'far' | null => {
  if (!distance) return null;
  const distanceM = convertViewingDistanceToMeters(distance, unit || 'meters');
  
  if (distanceM <= 3) return 'near';
  if (distanceM <= 10) return 'medium';
  return 'far';
};

// Get recommended pixel pitches based on numeric viewing distance using table rules
const getRecommendedPixelPitchesByDistance = (distance: number, unit: 'meters' | 'feet'): number[] => {
  return getPixelPitchesForViewingDistance(distance, unit);
};

// Get recommended pixel pitch based on environment (using actual product data)
const getRecommendedPixelPitchByEnvironment = (environment: 'Indoor' | 'Outdoor' | null): number[] => {
  if (!environment) return [];
  
  // Get actual pixel pitches from enabled products
  const enabledProducts = products.filter(p => p.enabled !== false);
  const envProducts = enabledProducts.filter(p => {
    const env = p.environment?.toLowerCase().trim();
    return env === environment.toLowerCase();
  });
  
  const pitches = Array.from(new Set(envProducts.map(p => p.pixelPitch)))
    .sort((a, b) => a - b);
  
  if (environment === 'Indoor') {
    // Indoor: fine to medium pitch (P0.9 to P3)
    return pitches.filter(p => p <= 3).slice(0, 5);
  } else {
    // Outdoor: coarse pitch (P3.9 and above)
    return pitches.filter(p => p >= 3.9).slice(0, 5);
  }
};

// Get recommended pixel pitch based on screen size (accurate thresholds)
const getRecommendedPixelPitchBySize = (widthM: number, heightM: number): number[] => {
  const areaSqM = widthM * heightM;
  const maxDimension = Math.max(widthM, heightM);
  
  // Convert to feet for better understanding
  const maxDimensionFt = maxDimension * 3.28084;
  
  if (maxDimensionFt < 5) {
    // Small screen (< 5ft) - fine pitch
    return [0.9, 1.25, 1.5, 1.8, 2.5];
  } else if (maxDimensionFt < 10) {
    // Medium screen (5-10ft) - medium pitch
    return [1.5, 2.5, 3, 3.9];
  } else if (maxDimensionFt < 15) {
    // Large screen (10-15ft) - medium to coarse
    return [2.5, 3.9, 4.8];
  } else {
    // Very large screen (≥ 15ft) - coarse pitch
    return [4.8, 6.25, 6.6, 8];
  }
};

// Get enabled products matching criteria
const getMatchingProducts = (
  pixelPitches: number[],
  environment?: 'Indoor' | 'Outdoor' | null
): Product[] => {
  return products.filter(product => {
    if (product.enabled === false) return false;
    
    const matchesPitch = pixelPitches.some(pitch => Math.abs(product.pixelPitch - pitch) < 0.1);
    if (!matchesPitch) return false;
    
    if (environment) {
      const productEnv = product.environment?.toLowerCase().trim();
      const selectedEnv = environment.toLowerCase();
      return productEnv === selectedEnv;
    }
    
    return true;
  });
};

// Get product series recommendations
const getSeriesRecommendation = (pixelPitch: number, environment: 'Indoor' | 'Outdoor' | null): string[] => {
  const enabledProducts = products.filter(p => p.enabled !== false);
  const matchingProducts = enabledProducts.filter(p => {
    const pitchMatch = Math.abs(p.pixelPitch - pixelPitch) < 0.1;
    if (!pitchMatch) return false;
    if (environment) {
      const env = p.environment?.toLowerCase().trim();
      return env === environment.toLowerCase();
    }
    return true;
  });
  
  const series = Array.from(new Set(matchingProducts.map(p => p.category)))
    .filter(s => s.includes('Rigel') || s.includes('Betel') || s.includes('Bellatrix'));
  
  return series;
};

// Unified recommendation engine - generates proactive recommendations
export interface ProactiveRecommendation {
  message: string;
  type: 'info' | 'recommendation' | 'warning';
  suggestedPixelPitches?: number[];
  suggestedProducts?: Product[];
  suggestedViewingDistance?: string;
  nextStep?: 'viewingDistance' | 'environment' | 'pixelPitch' | 'product';
  trigger?: 'dimensions' | 'viewingDistance' | 'environment' | 'pixelPitch' | 'product';
}

export const generateProactiveRecommendation = (config: DisplayConfig): ProactiveRecommendation | null => {
  const widthM = convertToMeters(config.width, config.unit);
  const heightM = convertToMeters(config.height, config.unit);
  const hasDimensions = widthM > 0 && heightM > 0;
  const hasViewingDistance = !!config.viewingDistance;
  const hasEnvironment = !!config.environment;
  const hasPixelPitch = config.pixelPitch !== null;
  const hasProduct = !!config.selectedProductName;

  // Priority sequence: size → distance → environment → pixel pitch → product
  // But also handle direct browse mode where environment might be selected first
  
  // Step 1: If dimensions are set but no viewing distance, recommend viewing distance (guided flow)
  if (hasDimensions && !hasViewingDistance && !hasEnvironment) {
    const maxDimensionFt = Math.max(widthM, heightM) * 3.28084;
    let recommendedDistance = '';
    
    if (maxDimensionFt < 5) {
      recommendedDistance = '3-5 meters (close viewing)';
    } else if (maxDimensionFt < 10) {
      recommendedDistance = '5-10 meters (medium viewing)';
    } else if (maxDimensionFt < 15) {
      recommendedDistance = '8-15 meters (medium to far viewing)';
    } else {
      recommendedDistance = '10+ meters (far viewing)';
    }
    
    return {
      message: `Based on your screen size (${maxDimensionFt.toFixed(1)}ft), please choose your viewing distance. Recommended distance is ${recommendedDistance}.`,
      type: 'recommendation',
      nextStep: 'viewingDistance',
      suggestedViewingDistance: recommendedDistance,
      trigger: 'dimensions'
    };
  }

  // Step 2: If viewing distance is set, recommend pixel pitch strictly from table
  if (hasViewingDistance && !hasPixelPitch) {
    const numericDistance = parseFloat(config.viewingDistance || '0');
    if (!isNaN(numericDistance) && numericDistance > 0) {
      const distPitches = getRecommendedPixelPitchesByDistance(numericDistance, config.viewingDistanceUnit);
      const distProducts = getMatchingProducts(distPitches, config.environment || undefined);

      const distanceText =
        config.viewingDistanceUnit === 'meters'
          ? `${config.viewingDistance}m viewing distance`
          : `${config.viewingDistance}ft viewing distance`;

      const pitchText = distPitches.length
        ? distPitches.map(p => `P${p}`).join(', ')
        : 'no suitable pixel pitch available for this distance';

      return {
        message:
          distPitches.length > 0
            ? `For ${distanceText}, the suitable pixel pitches are ${pitchText}.`
            : `For ${distanceText}, no suitable pixel pitch is available in the current product range.`,
        type: 'recommendation',
        nextStep: 'pixelPitch',
        suggestedPixelPitches: distPitches.slice(0, 3),
        suggestedProducts: distProducts.slice(0, 3),
        trigger: 'viewingDistance'
      };
    }
  }

  // Step 3: If environment is set (in direct browse mode), recommend pixel pitch based on environment
  if (hasEnvironment && !hasPixelPitch) {
    const envPitches = getRecommendedPixelPitchByEnvironment(config.environment);
    const envProducts = getMatchingProducts(envPitches, config.environment);
    
    if (config.environment === 'Indoor') {
      const pitchList = envPitches.slice(0, 3).map(p => `P${p}`).join(', ');
      return {
        message: `Since you chose Indoor, fine pixel pitch (${pitchList}) will give excellent clarity for close viewing.`,
        type: 'recommendation',
        nextStep: 'pixelPitch',
        suggestedPixelPitches: envPitches.slice(0, 3),
        suggestedProducts: envProducts.slice(0, 3),
        trigger: 'environment'
      };
    } else {
      const pitchList = envPitches.slice(0, 3).map(p => `P${p}`).join(', ');
      return {
        message: `For Outdoor environment, mid to large pixel pitch (${pitchList}) is ideal for better visibility from distance.`,
        type: 'recommendation',
        nextStep: 'pixelPitch',
        suggestedPixelPitches: envPitches.slice(0, 3),
        suggestedProducts: envProducts.slice(0, 3),
        trigger: 'environment'
      };
    }
  }

  // Step 4: If pixel pitch is set, recommend product series
  if (hasPixelPitch && !hasProduct) {
    const series = getSeriesRecommendation(config.pixelPitch!, config.environment || null);
    const pitchProducts = products.filter(p => 
      p.enabled !== false && 
      Math.abs(p.pixelPitch - config.pixelPitch!) < 0.1 &&
      (!config.environment || p.environment?.toLowerCase().trim() === config.environment.toLowerCase())
    );
    
    const seriesText = series.length > 0 ? series.join(', ') : 'available series';
    
    return {
      message: `Based on this pitch (P${config.pixelPitch}), the best product series are ${seriesText}.`,
      type: 'recommendation',
      nextStep: 'product',
      suggestedPixelPitches: [config.pixelPitch!],
      suggestedProducts: pitchProducts.slice(0, 3),
      trigger: 'pixelPitch'
    };
  }

  // Step 5: If all steps are complete, recommend final product
  if (hasDimensions && hasViewingDistance && hasPixelPitch && hasProduct) {
    const finalProduct = products.find(p => 
      p.enabled !== false && 
      p.name === config.selectedProductName
    );
    
    if (finalProduct) {
      return {
        message: `Recommended final product based on all your selections: ${finalProduct.name}. This product matches your requirements perfectly!`,
        type: 'recommendation',
        suggestedProducts: [finalProduct],
        trigger: 'product'
      };
    }
  }

  return null;
};

// Generate step-specific recommendations (for backward compatibility)
export const getStepRecommendation = (
  config: DisplayConfig,
  changedField: 'environment' | 'viewingDistance' | 'dimensions' | 'pixelPitch' | 'product'
): Recommendation | null => {
  const widthM = convertToMeters(config.width, config.unit);
  const heightM = convertToMeters(config.height, config.unit);
  
  switch (changedField) {
    case 'environment': {
      if (!config.environment) return null;
      
      const envPitches = getRecommendedPixelPitchByEnvironment(config.environment);
      const envProducts = getMatchingProducts(envPitches, config.environment);
      
      if (config.environment === 'Indoor') {
        return {
          message: `Since you chose Indoor, P1.25, P1.5, or P2.5 will give excellent clarity for close viewing.`,
          type: 'recommendation',
          trigger: 'environment',
          suggestedPixelPitches: envPitches.slice(0, 3),
          suggestedProducts: envProducts.slice(0, 3)
        };
      } else {
        return {
          message: `For Outdoor environment, P3.9, P4.8, or P6.25 pixel pitch is ideal for better visibility from distance.`,
          type: 'recommendation',
          trigger: 'environment',
          suggestedPixelPitches: envPitches.slice(0, 3),
          suggestedProducts: envProducts.slice(0, 3)
        };
      }
    }
    
    case 'viewingDistance': {
      if (!config.viewingDistance) return null;
      
      const distanceCategory = getViewingDistanceCategory(config.viewingDistance, config.viewingDistanceUnit);
      if (!distanceCategory) return null;
      
      const distPitches = getRecommendedPixelPitchByDistance(distanceCategory);
      const distProducts = getMatchingProducts(distPitches, config.environment || undefined);
      
      const distanceText = distanceCategory === 'near' ? 'close (≤ 3m)' :
                          distanceCategory === 'medium' ? 'medium (3-10m)' : 'far (≥ 10m)';
      const pitchText = distanceCategory === 'near' ? 'P1.25 to P2.5' :
                       distanceCategory === 'medium' ? 'P2.5 to P3.9' : 'P4.8 to P6.6';
      
      return {
        message: `For ${distanceText} viewing distance, ${pitchText} pixel pitch is recommended.`,
        type: 'recommendation',
        trigger: 'viewingDistance',
        suggestedPixelPitches: distPitches.slice(0, 3),
        suggestedProducts: distProducts.slice(0, 3)
      };
    }
    
    case 'dimensions': {
      if (widthM <= 0 || heightM <= 0) return null;
      
      const sizePitches = getRecommendedPixelPitchBySize(widthM, heightM);
      const sizeProducts = getMatchingProducts(sizePitches, config.environment || undefined);
      
      const maxDimensionFt = Math.max(widthM, heightM) * 3.28084;
      const sizeText = maxDimensionFt < 5 ? 'small' :
                      maxDimensionFt < 10 ? 'medium' :
                      maxDimensionFt < 15 ? 'large' : 'very large';
      const pitchText = sizePitches.slice(0, 2).map(p => `P${p}`).join(' or ');
      
      return {
        message: `Your screen size is ${sizeText} (${maxDimensionFt.toFixed(1)}ft), so ${pitchText} pixel pitch is recommended.`,
        type: 'recommendation',
        trigger: 'dimensions',
        suggestedPixelPitches: sizePitches.slice(0, 2),
        suggestedProducts: sizeProducts.slice(0, 2)
      };
    }
    
    case 'pixelPitch': {
      if (!config.pixelPitch) return null;
      
      const series = getSeriesRecommendation(config.pixelPitch, config.environment || null);
      const pitchProducts = products.filter(p => 
        p.enabled !== false && 
        Math.abs(p.pixelPitch - config.pixelPitch!) < 0.1 &&
        (!config.environment || p.environment?.toLowerCase().trim() === config.environment.toLowerCase())
      );
      
      const seriesText = series.length > 0 ? series.join(', ') : 'available series';
      
      return {
        message: `P${config.pixelPitch} pixel pitch is available in ${seriesText}. These products are suitable for your configuration.`,
        type: 'recommendation',
        trigger: 'pixelPitch',
        suggestedPixelPitches: [config.pixelPitch],
        suggestedProducts: pitchProducts.slice(0, 3)
      };
    }
    
    default:
      return null;
  }
};

// Enhanced Q&A parser
export const answerQuestion = (question: string, config: DisplayConfig): Recommendation => {
  const lowerQuestion = question.toLowerCase();
  
  // Extract dimensions from question (e.g., "10×6 ft", "12ft x 8ft", "10 feet by 6 feet")
  const dimensionPattern = /(\d+(?:\.\d+)?)\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|m|meter|meters)/gi;
  const dimensionMatch = dimensionPattern.exec(question);
  let extractedWidth: number | null = null;
  let extractedHeight: number | null = null;
  let extractedUnit: 'ft' | 'm' | null = null;
  
  if (dimensionMatch) {
    extractedWidth = parseFloat(dimensionMatch[1]);
    extractedHeight = parseFloat(dimensionMatch[2]);
    const unitText = dimensionMatch[0].toLowerCase();
    extractedUnit = unitText.includes('ft') || unitText.includes('feet') ? 'ft' : 'm';
  }
  
  // Extract pixel pitch (e.g., "P3.9", "3.9 pixel pitch", "pixel pitch 3.9")
  const pitchPattern = /p?(\d+\.?\d*)\s*(?:pixel\s*pitch|pitch|mm)/gi;
  const pitchMatch = pitchPattern.exec(question);
  let extractedPitch: number | null = null;
  if (pitchMatch) {
    extractedPitch = parseFloat(pitchMatch[1]);
  }
  
  // Extract environment
  const hasIndoor = /indoor|andar|inside|interior/i.test(question);
  const hasOutdoor = /outdoor|bahar|outside|exterior/i.test(question);
  const extractedEnv: 'Indoor' | 'Outdoor' | null = hasIndoor ? 'Indoor' : hasOutdoor ? 'Outdoor' : null;
  
  // Extract viewing distance
  const hasNear = /near|close|paas|kam\s*duri|3\s*m|5\s*m/i.test(question);
  const hasFar = /far|door|zyada\s*duri|10\s*m|15\s*m/i.test(question);
  const hasMedium = /medium|beech|5.*10|7\s*m|8\s*m/i.test(question);
  
  // Use extracted values or fall back to config
  const queryConfig: DisplayConfig = {
    width: extractedWidth ? (extractedUnit === 'ft' ? extractedWidth * 304.8 : extractedWidth * 1000) : config.width,
    height: extractedHeight ? (extractedUnit === 'ft' ? extractedHeight * 304.8 : extractedHeight * 1000) : config.height,
    unit: extractedUnit || config.unit,
    environment: extractedEnv || config.environment || undefined,
    viewingDistance: config.viewingDistance || undefined,
    viewingDistanceUnit: config.viewingDistanceUnit,
    pixelPitch: extractedPitch || config.pixelPitch || undefined,
    selectedProductName: config.selectedProductName || undefined
  };
  
  // Answer based on extracted information
  if (extractedWidth && extractedHeight) {
    const widthM = convertToMeters(queryConfig.width, queryConfig.unit);
    const heightM = convertToMeters(queryConfig.height, queryConfig.unit);
    const sizePitches = getRecommendedPixelPitchBySize(widthM, heightM);
    const matchingProducts = getMatchingProducts(sizePitches, queryConfig.environment || undefined);
    
    const pitchList = sizePitches.slice(0, 3).map(p => `P${p}`).join(', ');
    return {
      message: `For a ${extractedWidth}×${extractedHeight} ${extractedUnit || 'ft'} screen${queryConfig.environment ? ` in ${queryConfig.environment} environment` : ''}, I recommend ${pitchList} pixel pitch.`,
      type: 'recommendation',
      suggestedPixelPitches: sizePitches.slice(0, 3),
      suggestedProducts: matchingProducts.slice(0, 3)
    };
  }
  
  // Pixel pitch questions
  if (/pixel\s*pitch|pitch|pixel/i.test(lowerQuestion) && !extractedPitch) {
    if (queryConfig.environment) {
      const pitches = getRecommendedPixelPitchByEnvironment(queryConfig.environment);
      const matchingProducts = getMatchingProducts(pitches, queryConfig.environment);
      const pitchList = pitches.slice(0, 3).map(p => `P${p}`).join(', ');
      
      if (queryConfig.environment === 'Indoor') {
        return {
          message: `Indoor ke liye best pixel pitch ${pitchList} hai. Ye fine pitch options close viewing ke liye perfect hain.`,
          type: 'recommendation',
          suggestedPixelPitches: pitches.slice(0, 3),
          suggestedProducts: matchingProducts.slice(0, 3)
        };
      } else {
        return {
          message: `Outdoor ke liye best pixel pitch ${pitchList} hai. Ye coarse pitch options distance viewing aur brightness ke liye ideal hain.`,
          type: 'recommendation',
          suggestedPixelPitches: pitches.slice(0, 3),
          suggestedProducts: matchingProducts.slice(0, 3)
        };
      }
    }
  }
  
  // Viewing distance questions
  if (/viewing\s*distance|distance|duri|kitni\s*dur/i.test(lowerQuestion)) {
    if (queryConfig.pixelPitch) {
      const viewingDistance = queryConfig.pixelPitch <= 2.5 ? '3-5 meters (close viewing)' :
                             queryConfig.pixelPitch <= 3.9 ? '5-10 meters (medium viewing)' :
                             '10+ meters (far viewing)';
      return {
        message: `P${queryConfig.pixelPitch} pixel pitch ke liye recommended viewing distance ${viewingDistance} hai.`,
        type: 'info'
      };
    }
    
    if (hasNear) {
      const pitches = [0.9, 1.25, 1.5, 2.5];
      return {
        message: `Close viewing (≤ 3m) ke liye fine pixel pitch recommended hai: P0.9, P1.25, P1.5, ya P2.5.`,
        type: 'recommendation',
        suggestedPixelPitches: pitches
      };
    } else if (hasFar) {
      const pitches = [4.8, 6.25, 6.6];
      return {
        message: `Far viewing (≥ 10m) ke liye coarse pixel pitch recommended hai: P4.8, P6.25, ya P6.6.`,
        type: 'recommendation',
        suggestedPixelPitches: pitches
      };
    }
  }
  
  // Product/series questions
  if (/product|model|series|kaunsa\s*model|best\s*model/i.test(lowerQuestion)) {
    if (queryConfig.environment) {
      const pitches = getRecommendedPixelPitchByEnvironment(queryConfig.environment);
      const matchingProducts = getMatchingProducts(pitches, queryConfig.environment);
      
      if (matchingProducts.length > 0) {
        const productNames = matchingProducts.slice(0, 3).map(p => p.name).join(', ');
        return {
          message: `${queryConfig.environment} environment ke liye best models hain: ${productNames}`,
          type: 'recommendation',
          suggestedProducts: matchingProducts.slice(0, 3)
        };
      }
    }
  }
  
  // Default response
  return {
    message: 'Main aapki madad kar sakta hoon pixel pitch, environment, viewing distance, aur product selection ke baare mein. Aap specific sawal puchh sakte hain, jaise "10×6 ft screen ke liye kaun sa pixel pitch?"',
    type: 'info'
  };
};
