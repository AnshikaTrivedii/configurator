/**
 * AI Chatbot Service
 * 
 * Intelligent rule-based recommendation assistant for LED Screen Configurator
 * with high-accuracy recommendation engine and NLP question answering
 * 
 * IMPORTANT: All recommendations use actual product data from /src/data/products.ts
 * - Only recommends products where enabled === true
 * - Excludes: Rental, Flexible, Transparent, Jumbo products
 * - All pixel pitches and product suggestions come from real product data
 * - No hardcoded values or hallucinated products
 */

import { DisplayConfigState } from '../contexts/DisplayConfigContext';
import { Product } from '../types';
import { products } from '../data/products';
import {
  filterProducts,
  getAvailablePixelPitches,
  getProductSeries,
  getRecommendedPixelPitchesForViewingDistance,
  getRecommendedPixelPitchesForViewingDistanceRange,
  getIdealPixelPitchRange,
  findClosestAvailablePitch,
  ProductFilterOptions
} from '../utils/productFilter';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    suggestedActions?: string[];
    detectedErrors?: string[];
    workflowStep?: string;
  };
}

export interface ChatbotContext {
  config: DisplayConfigState & { purpose?: string };
  selectedProduct?: Product | null;
  currentStep?: string;
  userRole?: 'normal' | 'sales' | 'super' | 'super_admin';
  workflowStage?: 'landing' | 'wizard' | 'configurator' | 'quoting';
  conversationHistory: ChatMessage[];
}

// Check if Gemini API key is available (user can add their own)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Rate limiting and caching
const requestCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CONVERSATION_HISTORY = 10; // Keep last 10 messages for context

// ====================================================
// HIGH-ACCURACY RECOMMENDATION ENGINE
// Uses the SAME filtering logic as ProductSelector
// ====================================================

/**
 * Recommend pixel pitch based on environment (from actual products)
 */
export function recommendPixelPitchByEnvironment(environment: 'Indoor' | 'Outdoor' | null): number[] {
  if (!environment) return [];
  
  // Use actual product data filtered by environment
  return getAvailablePixelPitches({ environment, enabled: true });
}

/**
 * Recommend pixel pitch based on viewing distance (from actual viewing distance ranges)
 * Uses actual product data to ensure only existing pitches are recommended
 * Returns both ideal range and available pitches
 */
export function recommendPixelPitchByViewingDistance(
  viewingDistance: string | null,
  unit: 'meters' | 'feet',
  environment?: 'Indoor' | 'Outdoor' | null
): {
  idealRange: { ideal: number; min: number; max: number } | null;
  availablePitches: number[];
  closestPitch: number | null;
} {
  if (!viewingDistance) {
    return { idealRange: null, availablePitches: [], closestPitch: null };
  }
  
  // Check if it's a range format (e.g., "3-6")
  if (viewingDistance.includes('-')) {
    const rangePitches = getRecommendedPixelPitchesForViewingDistanceRange(viewingDistance, unit);
    // Intersect with actual available pitches
    const availablePitches = getAvailablePixelPitches({ 
      enabled: true, 
      environment: environment || undefined 
    });
    const filteredPitches = rangePitches.filter(pitch =>
      availablePitches.some(available => Math.abs(available - pitch) < 0.1)
    );
    return {
      idealRange: null, // Range format doesn't have ideal range
      availablePitches: filteredPitches,
      closestPitch: filteredPitches.length > 0 ? filteredPitches[0] : null
    };
  }
  
  // Single value
  const distance = parseFloat(viewingDistance);
  if (isNaN(distance) || distance <= 0) {
    return { idealRange: null, availablePitches: [], closestPitch: null };
  }
  
  return getRecommendedPixelPitchesForViewingDistance(distance, unit, environment);
}

/**
 * Recommend pixel pitch based on screen size (from actual products)
 * Screen size doesn't directly filter products, but we can suggest based on common use cases
 */
export function recommendPixelPitchByScreenSize(width: number, height: number, unit: 'mm' | 'cm' | 'm' | 'ft'): number[] {
  if (width <= 0 || height <= 0) return [];
  
  // Convert to feet for size calculation
  let widthFt: number;
  if (unit === 'mm') widthFt = width / 304.8;
  else if (unit === 'cm') widthFt = width / 30.48;
  else if (unit === 'm') widthFt = width * 3.28084;
  else widthFt = width;
  
  // For screen size, we can't directly filter products, but we can suggest common pitches
  // based on typical use cases. However, we should still use actual available products.
  // Return all available pitches - the user should combine with environment/distance for better filtering
  return getAvailablePixelPitches({ enabled: true });
}

/**
 * Recommend product series based on pixel pitch (from actual products)
 */
export function recommendProductSeriesByPixelPitch(pixelPitch: number | null): string[] {
  if (!pixelPitch) return [];
  
  // Filter products by pixel pitch and get their series
  const filteredProducts = filterProducts({ pixelPitch, enabled: true });
  return getProductSeries(filteredProducts);
}

/**
 * Get suitable use case for product series (from actual products)
 * Only uses enabled products, excludes rental/flexible/transparent/jumbo
 */
export function getUseCaseForProductSeries(series: string): string {
  // Find products in this series using the filter function (ensures enabled=true and excludes unwanted categories)
  const seriesName = series.replace(' Series', '').toLowerCase();
  const seriesProducts = filterProducts({ enabled: true }).filter(p => {
    const category = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    return category.includes(seriesName) || name.includes(seriesName);
  });
  
  if (seriesProducts.length > 0) {
    const firstProduct = seriesProducts[0];
    const env = firstProduct.environment || 'General';
    const pitch = firstProduct.pixelPitch;
    const pitchRange = seriesProducts.length > 1 
      ? `${Math.min(...seriesProducts.map(p => p.pixelPitch))}mm-${Math.max(...seriesProducts.map(p => p.pixelPitch))}mm`
      : `${pitch}mm`;
    return `${env} ${series} - ${pitchRange} pixel pitch displays suitable for various viewing distances`;
  }
  
  return `${series} - LED display applications`;
}

/**
 * Get comprehensive recommendation based on all factors (using actual product filtering)
 * Follows strict rules: recommend pixel pitch FIRST, then match products
 */
export function getComprehensiveRecommendation(context: ChatbotContext): {
  idealRange: { ideal: number; min: number; max: number } | null;
  pixelPitch: number[];
  closestPitch: number | null;
  productSeries: string[];
  products: Product[];
  reasoning: string;
} {
  const { config } = context;
  
  console.log('[getComprehensiveRecommendation] ============================================');
  console.log('[getComprehensiveRecommendation] Config:', {
    viewingDistance: config.viewingDistance,
    viewingDistanceUnit: config.viewingDistanceUnit,
    environment: config.environment,
    pixelPitch: config.pixelPitch
  });
  
  // STEP 1: Get ideal pixel pitch range and available pitches based on viewing distance (NEW FORMULA)
  let idealRange: { ideal: number; min: number; max: number } | null = null;
  let recommendedPitches: number[] = [];
  let closestPitch: number | null = null;
  
  if (config.viewingDistance) {
    if (config.viewingDistance.includes('-')) {
      // Range format - use existing utility, then intersect with available products
      const rangePitches = getRecommendedPixelPitchesForViewingDistanceRange(
        config.viewingDistance,
        config.viewingDistanceUnit
      );
      const availablePitches = getAvailablePixelPitches({ 
        enabled: true, 
        environment: config.environment || undefined 
      });
      recommendedPitches = rangePitches.filter(pitch =>
        availablePitches.some(available => Math.abs(available - pitch) < 0.1)
      );
      if (recommendedPitches.length > 0) {
        closestPitch = recommendedPitches[0];
      }
    } else {
      // Single value - use NEW rules
      const distanceValue = parseFloat(config.viewingDistance);
      if (!isNaN(distanceValue)) {
        const result = getRecommendedPixelPitchesForViewingDistance(
          distanceValue,
          config.viewingDistanceUnit,
          config.environment || undefined
        );
        idealRange = result.idealRange;
        recommendedPitches = result.availablePitches;
        closestPitch = result.closestPitch;
      }
    }
  }
  
  // STEP 2: Filter by environment to get available pitches
  const environmentFilter: ProductFilterOptions = {
    enabled: true,
    environment: config.environment || undefined, // CRITICAL: Use config.environment (should be detected from user message)
  };
  
  console.log('[getComprehensiveRecommendation] Environment filter:', environmentFilter);
  
  const availablePitchesForEnv = getAvailablePixelPitches(environmentFilter);
  console.log('[getComprehensiveRecommendation] Available pitches for environment:', availablePitchesForEnv);
  
  // STEP 3: Determine final recommended pitches
  // CRITICAL RULE: Never default to P1.8, never repeat same pitch if inputs differ
  let finalRecommendedPitches: number[] = [];
  if (recommendedPitches.length > 0) {
    // Use pitches from viewing distance recommendation (these are already filtered by environment and range)
    finalRecommendedPitches = recommendedPitches;
    console.log('[getComprehensiveRecommendation] Using recommended pitches from viewing distance:', finalRecommendedPitches);
  } else if (idealRange && closestPitch) {
    // If we have ideal range but no exact matches, use closest pitch
    // CRITICAL: closestPitch should be HIGHER than ideal if no exact match (never default to P1.8)
    finalRecommendedPitches = [closestPitch];
    console.log('[getComprehensiveRecommendation] Using closest pitch:', closestPitch, 'for ideal:', idealRange.ideal);
    
    // Validate: closest pitch should be reasonable (not defaulting to P1.8)
    if (closestPitch === 1.8 && idealRange.ideal > 2.0) {
      console.warn('[getComprehensiveRecommendation] ⚠️ WARNING: Closest pitch is P1.8 but ideal is', idealRange.ideal, '- this might be wrong!');
    }
  } else if (availablePitchesForEnv.length > 0 && !config.viewingDistance) {
    // If no viewing distance specified, use available pitches for environment
    // But NEVER default to P1.8 if we have other options
    finalRecommendedPitches = availablePitchesForEnv.filter(p => p !== 1.8 || availablePitchesForEnv.length === 1);
    console.log('[getComprehensiveRecommendation] Using available pitches for environment:', finalRecommendedPitches);
  }
  
  // STEP 4: Filter products by recommended pitches and environment
  // CRITICAL: MUST match environment strictly - NEVER recommend wrong environment
  const filterOptions: ProductFilterOptions = {
    enabled: true,
    environment: config.environment || undefined, // Strict environment filter
  };
  
  // Filter products by recommended pitches
  let filteredProducts: Product[] = [];
  if (finalRecommendedPitches.length > 0) {
    // Get products for each recommended pitch
    finalRecommendedPitches.forEach(pitch => {
      const pitchProducts = filterProducts({ ...filterOptions, pixelPitch: pitch });
      // DOUBLE CHECK: Ensure environment matches (safety check)
      const envFiltered = pitchProducts.filter(p => {
        if (!config.environment) return true;
        return p.environment?.toLowerCase() === config.environment.toLowerCase();
      });
      filteredProducts.push(...envFiltered);
    });
    // Remove duplicates
    filteredProducts = filteredProducts.filter((p, i, arr) => 
      arr.findIndex(x => x.id === p.id) === i
    );
  } else {
    // No recommended pitches, just filter by environment (strict)
    filteredProducts = filterProducts(filterOptions);
    // DOUBLE CHECK: Ensure environment matches
    if (config.environment) {
      filteredProducts = filteredProducts.filter(p => 
        p.environment?.toLowerCase() === config.environment.toLowerCase()
      );
    }
  }
  
  // Sort by pixel pitch
  filteredProducts.sort((a, b) => a.pixelPitch - b.pixelPitch);
  
  // Get product series from filtered products
  const productSeries = getProductSeries(filteredProducts);
  
  // Build reasoning with new formula
  const reasoning: string[] = [];
  if (config.viewingDistance && idealRange) {
    const distanceValue = parseFloat(config.viewingDistance);
    if (!isNaN(distanceValue)) {
      const distanceFt = config.viewingDistanceUnit === 'feet' ? distanceValue : distanceValue * 3.28084;
      reasoning.push(`Using formula: IdealPitch = ViewingDistance(feet) ÷ 10, calculated ideal pitch P${idealRange.ideal.toFixed(1)} for ${distanceFt.toFixed(1)}ft viewing distance`);
      reasoning.push(`Acceptable range: P${idealRange.min.toFixed(1)}–P${idealRange.max.toFixed(1)} (±30%)`);
    }
  }
  if (config.environment) {
    reasoning.push(`${config.environment} environment requirement`);
  }
  if (config.width > 0 && config.height > 0) {
    const widthFt = config.unit === 'ft' ? config.width : 
                   config.unit === 'm' ? config.width * 3.28084 :
                   config.unit === 'cm' ? config.width / 30.48 : config.width / 304.8;
    reasoning.push(`screen size of ${widthFt.toFixed(1)}ft width`);
  }
  if (closestPitch) {
    if (idealRange && closestPitch >= idealRange.min && closestPitch <= idealRange.max) {
      reasoning.push(`closest available pitch P${closestPitch} is within ideal range`);
    } else {
      reasoning.push(`closest available pitch P${closestPitch} from database`);
    }
  }
  if (filteredProducts.length === 0) {
    reasoning.push('no matching products found');
  } else {
    reasoning.push(`found ${filteredProducts.length} matching product(s) in database`);
  }
  
  return {
    idealRange,
    pixelPitch: finalRecommendedPitches.length > 0 ? finalRecommendedPitches : availablePitchesForEnv,
    closestPitch: closestPitch || (finalRecommendedPitches.length > 0 ? finalRecommendedPitches[0] : null),
    productSeries,
    products: filteredProducts,
    reasoning: reasoning.join(', ')
  };
}

// ====================================================
// NLP QUESTION ANSWERING - VALUE EXTRACTION
// ====================================================

interface ExtractedValues {
  size?: { width?: number; height?: number; unit?: 'mm' | 'cm' | 'm' | 'ft' };
  environment?: 'Indoor' | 'Outdoor';
  distance?: { value: number; unit: 'meters' | 'feet' };
  pixelPitch?: number;
  productKeywords?: string[];
  purpose?: string; // advertisement, indoor display, stage, showroom, info board
}

/**
 * Extract values from user message using NLP (supports Hindi/English mixed)
 */
export function extractValuesFromMessage(message: string): ExtractedValues {
  const lowerMessage = message.toLowerCase();
  const extracted: ExtractedValues = {};
  
  // Extract size (e.g., "10x6 ft", "12ft", "8 meter", "6m x 4m", "10x6 ft hai")
  const sizePatterns = [
    /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(ft|feet|meter|meters|m|mm|cm|metre|metres)/i,
    /(\d+(?:\.\d+)?)\s*(ft|feet|meter|meters|m|mm|cm|metre|metres)\s*x\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(ft|feet|meter|meters|m|mm|cm|metre|metres)/i,
    /screen\s+(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(ft|feet|meter|meters|m|mm|cm)/i,
  ];
  
  for (const pattern of sizePatterns) {
    const match = message.match(pattern);
    if (match) {
      const unitMap: Record<string, 'mm' | 'cm' | 'm' | 'ft'> = {
        'mm': 'mm', 'cm': 'cm', 'm': 'm', 'meter': 'm', 'meters': 'm', 'metre': 'm', 'metres': 'm',
        'ft': 'ft', 'feet': 'ft'
      };
      
      const unit = unitMap[match[match.length - 1]?.toLowerCase()] || 'm';
      
      if (match.length >= 4 && match[2] && !isNaN(parseFloat(match[2]))) {
        // Two dimensions
        extracted.size = {
          width: parseFloat(match[1]),
          height: parseFloat(match[2] || match[3]),
          unit
        };
      } else {
        // Single dimension (assume square or width)
        extracted.size = {
          width: parseFloat(match[1]),
          unit
        };
      }
      break;
    }
  }
  
  // Extract environment (including Hindi context words and common use cases)
  // Outdoor keywords: outdoor, bahar, outside, hoarding, billboard, roadside, external
  // Indoor keywords: indoor, andar, mall, office, conference, shop, hotel
  if (lowerMessage.match(/\b(outdoor|bahar|outside|hoarding|billboard|roadside|external)\b/)) {
    extracted.environment = 'Outdoor';
  } else if (lowerMessage.match(/\b(indoor|andar|mall|office|conference|shop|hotel)\b/)) {
    extracted.environment = 'Indoor';
  }
  
  // Extract viewing distance (e.g., "near", "far", "8 feet", "25 ft", "long distance", "door", "dur")
  if (lowerMessage.match(/\b(near|close|short distance|paas|nazdeek)\b/)) {
    extracted.distance = { value: 5, unit: 'feet' }; // Default to 5 ft for near
  } else if (lowerMessage.match(/\b(far|distant|long distance|door|dur|doori)\b/)) {
    extracted.distance = { value: 25, unit: 'feet' }; // Default to 25 ft for far
  } else {
    const distancePatterns = [
      /(\d+(?:\.\d+)?)\s*(ft|feet|meter|meters|m|metre|metres)\b/i,
      /(\d+(?:\.\d+)?)\s*(ft|feet|meter|meters|m)\s*(door|distance|dur)/i,
    ];
    
    for (const pattern of distancePatterns) {
      const match = message.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2]?.toLowerCase().includes('ft') || match[2]?.toLowerCase().includes('feet')
          ? 'feet' : 'meters';
        extracted.distance = { value, unit };
        break;
      }
    }
  }
  
  // Extract pixel pitch (e.g., "P2.5", "2.5mm", "pixel pitch 1.5", "1.2mm")
  const pitchPatterns = [
    /p(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*mm\s*(?:pitch|pixel)?/i,
    /pixel\s*pitch\s*(\d+(?:\.\d+)?)/i,
    /pitch\s*(\d+(?:\.\d+)?)/i,
  ];
  
  for (const pattern of pitchPatterns) {
    const match = message.match(pattern);
    if (match) {
      extracted.pixelPitch = parseFloat(match[1]);
      break;
    }
  }
  
  // Extract product keywords (including Hindi context)
  const productKeywords: string[] = [];
  if (lowerMessage.includes('rigel')) productKeywords.push('Rigel');
  if (lowerMessage.includes('betel')) productKeywords.push('Betel');
  if (lowerMessage.includes('bellatrix')) productKeywords.push('Bellatrix');
  if (lowerMessage.includes('flexible')) productKeywords.push('Flexible');
  if (lowerMessage.includes('rental')) productKeywords.push('Rental');
  if (lowerMessage.includes('jumbo')) productKeywords.push('Jumbo');
  if (lowerMessage.includes('standee')) productKeywords.push('Standee');
  if (lowerMessage.includes('transparent')) productKeywords.push('Transparent');
  
  if (productKeywords.length > 0) {
    extracted.productKeywords = productKeywords;
  }
  
  // Extract purpose/use-case (advertisement, indoor display, stage, showroom, info board)
  if (lowerMessage.match(/\b(advertisement|ad|advertising|promotion|marketing)\b/)) {
    extracted.purpose = 'advertisement';
  } else if (lowerMessage.match(/\b(indoor display|indoor screen|indoor led)\b/)) {
    extracted.purpose = 'indoor display';
  } else if (lowerMessage.match(/\b(stage|concert|event|performance|show)\b/)) {
    extracted.purpose = 'stage';
  } else if (lowerMessage.match(/\b(showroom|retail|store|shop display)\b/)) {
    extracted.purpose = 'showroom';
  } else if (lowerMessage.match(/\b(info board|information|signage|wayfinding)\b/)) {
    extracted.purpose = 'info board';
  }
  
  // Infer environment from purpose if not explicitly stated
  if (!extracted.environment && extracted.purpose) {
    if (extracted.purpose === 'stage' || extracted.purpose === 'advertisement') {
      // Could be either, but more likely outdoor for advertisement
      if (lowerMessage.match(/\b(billboard|hoarding|roadside|external)\b/)) {
        extracted.environment = 'Outdoor';
      }
    } else if (extracted.purpose === 'showroom' || extracted.purpose === 'indoor display') {
      extracted.environment = 'Indoor';
    }
  }
  
  return extracted;
}

// ====================================================
// MODE DETECTION - NORMAL vs RECOMMENDATION
// ====================================================

type ChatbotMode = 'NORMAL' | 'RECOMMENDATION';

/**
 * Determine which mode the chatbot should use based on user input
 * 
 * RECOMMENDATION MODE: ONLY if user:
 * - Asks "which product should I choose?"
 * - Gives viewing distance
 * - Gives screen size
 * - Asks for product suggestion
 * 
 * NORMAL MODE: Everything else (explanations, concepts, general questions)
 */
function determineChatbotMode(
  userMessage: string,
  extracted: ExtractedValues,
  context: ChatbotContext
): ChatbotMode {
  const lowerMessage = userMessage.toLowerCase().trim();
  
  // RECOMMENDATION MODE triggers (STRICT):
  // 1. Explicit product questions
  const explicitProductRequest = lowerMessage.includes('which product') ||
                                 lowerMessage.includes('what product') ||
                                 lowerMessage.includes('recommend product') ||
                                 lowerMessage.includes('suggest product') ||
                                 lowerMessage.includes('show me product') ||
                                 lowerMessage.includes('choose product') ||
                                 lowerMessage.includes('which should i choose') ||
                                 lowerMessage.includes('product suggestion');
  
  // 2. User provided viewing distance OR screen size (with intent to get recommendations)
  const hasViewingDistance = extracted.distance || context.config.viewingDistance;
  const hasScreenSize = extracted.size && extracted.size.width;
  const askingForRecommendation = lowerMessage.includes('recommend') || 
                                   lowerMessage.includes('suggest') ||
                                   lowerMessage.includes('which');
  
  // Enter RECOMMENDATION MODE only if:
  // - Explicit product request, OR
  // - (Viewing distance OR screen size) AND asking for recommendation
  if (explicitProductRequest || 
      (hasViewingDistance && askingForRecommendation) ||
      (hasScreenSize && askingForRecommendation)) {
    return 'RECOMMENDATION';
  }
  
  // NORMAL MODE: Everything else
  return 'NORMAL';
}

/**
 * Detect environment from user message (CRITICAL)
 * 
 * ENVIRONMENT RULES:
 * 1. If user explicitly mentions "outdoor" → OUTDOOR
 * 2. If user explicitly mentions "indoor" → INDOOR
 * 3. If NOT specified → return null (ask user)
 * 4. NEVER default to indoor
 */
function detectEnvironment(userMessage: string, extracted: ExtractedValues, context: ChatbotContext): 'Indoor' | 'Outdoor' | null {
  const lowerMessage = userMessage.toLowerCase().trim();
  
  console.log('[detectEnvironment] Checking message:', lowerMessage);
  console.log('[detectEnvironment] Extracted environment:', extracted.environment);
  console.log('[detectEnvironment] Context environment:', context.config.environment);
  
  // Priority 1: User explicitly mentions outdoor
  if (lowerMessage.includes('outdoor') || 
      lowerMessage.includes('bahar') ||
      lowerMessage.includes('outside') ||
      lowerMessage.includes('hoarding') ||
      lowerMessage.includes('billboard') ||
      lowerMessage.includes('roadside') ||
      lowerMessage.includes('external')) {
    console.log('[detectEnvironment] ✅ Detected: Outdoor (from explicit mention)');
    return 'Outdoor';
  }
  
  // Priority 2: User explicitly mentions indoor
  if (lowerMessage.includes('indoor') || 
      lowerMessage.includes('andar') ||
      lowerMessage.includes('mall') ||
      lowerMessage.includes('office') ||
      lowerMessage.includes('conference') ||
      lowerMessage.includes('shop') ||
      lowerMessage.includes('hotel')) {
    console.log('[detectEnvironment] ✅ Detected: Indoor (from explicit mention)');
    return 'Indoor';
  }
  
  // Priority 3: Extracted value from NLP (only if explicitly extracted from current message)
  if (extracted.environment) {
    console.log('[detectEnvironment] ✅ Detected:', extracted.environment, '(from NLP extraction)');
    return extracted.environment;
  }
  
  // CRITICAL: DO NOT use context.config.environment as fallback
  // This was causing the issue - if user says "25 feet" without "outdoor",
  // we should ask, not assume from previous context
  // Only use context if it's from the current conversation flow (e.g., wizard step)
  
  // Priority 4: Only use context if we're in wizard and environment step is completed
  // Otherwise, return null to ask user
  if (context.workflowStage === 'wizard' && context.currentStep === 'environment' && context.config.environment) {
    console.log('[detectEnvironment] ✅ Using context environment (wizard step):', context.config.environment);
    return context.config.environment as 'Indoor' | 'Outdoor';
  }
  
  // No environment specified - return null (will ask user)
  console.log('[detectEnvironment] ❌ No environment detected - will ask user');
  return null;
}

// ====================================================
// FORMATTED RECOMMENDATION GENERATION
// ====================================================

/**
 * Format recommendation in the required format
 * Shows ideal pitch, closest available pitch, and ALL matching products
 * Always generates fresh, customized responses based on user input
 */
export function formatRecommendation(
  idealRange: { ideal: number; min: number; max: number } | null,
  recommendedPitches: number[],
  closestPitch: number | null,
  products: Product[],
  reasoning: string,
  context?: ChatbotContext
): string {
  // CRITICAL: Environment rules - NEVER recommend wrong environment
  // If no products match, we MUST still respect environment
  let productsToShow = products;
  let pitchToUse = closestPitch;
  
  // DOUBLE CHECK: Filter out any products that don't match environment
  if (context?.config.environment) {
    productsToShow = productsToShow.filter(p => 
      p.environment?.toLowerCase() === context.config.environment.toLowerCase()
    );
  }
  
  if (productsToShow.length === 0 && closestPitch) {
    // Fallback: Get products with closest pitch and SAME environment (strict)
    const fallbackOptions: ProductFilterOptions = {
      pixelPitch: closestPitch,
      environment: context?.config.environment || undefined, // MUST match environment
      enabled: true
    };
    productsToShow = filterProducts(fallbackOptions);
    
    // CRITICAL: NEVER try without environment filter if environment is specified
    // If no products found with closest pitch in correct environment, that's okay
    // We should inform user, not recommend wrong environment products
  }
  
  // Get TOP 3 products (sorted by relevance: ideal pitch match, then brightness for outdoor)
  let productsToDisplay = productsToShow.length > 0 ? productsToShow : products;
  
  // Sort products by relevance
  if (idealRange && productsToDisplay.length > 0) {
    productsToDisplay = [...productsToDisplay].sort((a, b) => {
      // Prioritize products within ideal range
      const aInRange = a.pixelPitch >= idealRange.min && a.pixelPitch <= idealRange.max;
      const bInRange = b.pixelPitch >= idealRange.min && b.pixelPitch <= idealRange.max;
      
      if (aInRange && !bInRange) return -1;
      if (!aInRange && bInRange) return 1;
      
      // If both in range or both out, prioritize closest to ideal pitch
      const aDiff = Math.abs(a.pixelPitch - idealRange.ideal);
      const bDiff = Math.abs(b.pixelPitch - idealRange.ideal);
      if (Math.abs(aDiff - bDiff) > 0.1) {
        return aDiff - bDiff;
      }
      
      // For outdoor, prioritize higher brightness
      if (context?.config.environment === 'Outdoor' || a.environment === 'Outdoor') {
        return (b.brightness || 0) - (a.brightness || 0);
      }
      
      // Otherwise, sort by pixel pitch
      return a.pixelPitch - b.pixelPitch;
    });
  }
  
  // Take TOP 3 products
  const topProducts = productsToDisplay.slice(0, 3);
  
  let response = '';
  
  // CORE RULES: RESPONSE FORMAT
  // Always reply in this structure:
  // 📌 **Ideal Pixel Pitch:** P(x.x)
  // 📌 **Acceptable Range:** P(a.b – c.d)
  // 📌 **Recommended Products:**
  //   1. Product Name
  //      - Pixel Pitch:
  //      - Environment:
  //      - Why
  
  if (idealRange) {
    response += `📌 **Ideal Pixel Pitch:** P${idealRange.ideal.toFixed(1)}\n`;
    response += `📌 **Acceptable Range:** P${idealRange.min.toFixed(1)} – P${idealRange.max.toFixed(1)}\n\n`;
  }
  
  // Get closest pitch if no ideal range
  const finalClosestPitch = pitchToUse || closestPitch || (recommendedPitches.length > 0 ? recommendedPitches[0] : null);
  if (!idealRange && finalClosestPitch) {
    response += `📌 **Closest Available Pixel Pitch:** P${finalClosestPitch}\n\n`;
  }
  
  // Recommended Products (top 3 max)
  if (topProducts.length > 0) {
    response += `📌 **Recommended Products:**\n\n`;
    
    topProducts.forEach((product, index) => {
      response += `${index + 1}. ${product.name}\n`;
      response += `   - Pixel Pitch: P${product.pixelPitch}\n`;
      response += `   - Environment: ${product.environment}\n`;
      
      // Why - short reason based on user's input
      const whyReasons: string[] = [];
      
      // Match viewing distance
      if (context?.config.viewingDistance && idealRange) {
        const distance = parseFloat(context.config.viewingDistance);
        const unit = context.config.viewingDistanceUnit || 'feet';
        const distanceText = unit === 'meters' ? `${distance}m` : `${distance}ft`;
        
        if (product.pixelPitch >= idealRange.min && product.pixelPitch <= idealRange.max) {
          whyReasons.push(`Pixel pitch P${product.pixelPitch} matches ideal range for ${distanceText} viewing distance`);
        } else if (finalClosestPitch && Math.abs(product.pixelPitch - finalClosestPitch) < 0.1) {
          whyReasons.push(`Closest available pitch (P${product.pixelPitch}) for ${distanceText} viewing distance`);
        }
      }
      
      // Match environment
      if (context?.config.environment && product.environment?.toLowerCase() === context.config.environment.toLowerCase()) {
        whyReasons.push(`Matches ${context.config.environment.toLowerCase()} environment requirement`);
      }
      
      // Brightness for outdoor
      if (product.environment === 'Outdoor' && product.brightness && product.brightness >= 5000) {
        whyReasons.push(`High brightness (${product.brightness} cd/m²) for outdoor visibility`);
      }
      
      // If no exact match, explain why it's the closest
      if (whyReasons.length === 0 && finalClosestPitch && Math.abs(product.pixelPitch - finalClosestPitch) < 0.1) {
        whyReasons.push(`Closest match to ideal pitch for your viewing distance`);
      }
      
      if (whyReasons.length > 0) {
        response += `   - Why: ${whyReasons.join('; ')}\n`;
      } else {
        response += `   - Why: Matches your specified environment and viewing distance\n`;
      }
      
      response += `\n`;
    });
  } else {
    // No products match - explain why and suggest closest
    if (finalClosestPitch && context?.config.environment) {
      response += `📌 **Recommended Products:**\n\n`;
      response += `No products found matching the exact criteria. The closest available pixel pitch is P${finalClosestPitch}.\n\n`;
      response += `Please try:\n`;
      response += `- Adjusting your viewing distance\n`;
      response += `- Checking products with P${finalClosestPitch} pitch\n`;
      response += `- Contacting sales for custom solutions\n`;
    } else {
      response += `📌 **Recommended Products:**\n\n`;
      response += `No products match the exact criteria in our database. Please provide:\n`;
      if (!context?.config.environment) {
        response += `- Environment (Indoor or Outdoor)\n`;
      }
      if (!context?.config.viewingDistance) {
        response += `- Viewing distance\n`;
      }
    }
  }
  
  return response;
}

// ====================================================
// AUTO-SUGGESTION GENERATION
// ====================================================

/**
 * Generate auto-suggestion message based on config change
 */
export function generateAutoSuggestion(
  changeType: 'dimensions' | 'environment' | 'viewingDistance' | 'pixelPitch' | 'product',
  context: ChatbotContext
): string | null {
  const { config, selectedProduct } = context;
  
  switch (changeType) {
    case 'dimensions': {
      if (config.width > 0 && config.height > 0) {
        const rec = recommendPixelPitchByScreenSize(config.width, config.height, config.unit);
        if (rec.length > 0) {
          const widthFt = config.unit === 'ft' ? config.width : 
                         config.unit === 'm' ? config.width * 3.28084 :
                         config.unit === 'cm' ? config.width / 30.48 : config.width / 304.8;
          return `Based on your screen size (${widthFt.toFixed(1)}ft width), the ideal pixel pitch range is **${rec.join('mm, ')}mm**. Please select your viewing distance to get more specific recommendations.`;
        }
      }
      return null;
    }
    
    case 'environment': {
      if (config.environment) {
        // Get actual available pixel pitches for this environment
        const rec = recommendPixelPitchByEnvironment(config.environment);
        if (rec.length > 0) {
          // Also get product count
          const filteredProducts = filterProducts({ environment: config.environment, enabled: true });
          return `For **${config.environment}** environment, available pixel pitches are: **${rec.join('mm, ')}mm**. Found **${filteredProducts.length} product(s)** matching this environment.`;
        } else {
          // SAFETY RULE: Never say "No products available" - always fallback to closest
          // If no products for this environment, show any available products
          const anyProducts = filterProducts({ enabled: true });
          if (anyProducts.length > 0) {
            const otherEnv = config.environment === 'Indoor' ? 'Outdoor' : 'Indoor';
            const otherEnvProducts = filterProducts({ enabled: true, environment: otherEnv });
            if (otherEnvProducts.length > 0) {
              return `For **${config.environment}** environment, no products found. However, we have **${otherEnvProducts.length} ${otherEnv.toLowerCase()}** products available. Would you like to see ${otherEnv.toLowerCase()} options, or please check our full product catalog.`;
            }
            return `For **${config.environment}** environment, no products found. Please check our product catalog for available options.`;
          }
          return `For **${config.environment}** environment, please check our product catalog for available options.`;
        }
      }
      return null;
    }
    
    case 'viewingDistance': {
      if (config.viewingDistance) {
        // Get recommended pitches using NEW rules (already filtered by available products)
        const distanceValue = parseFloat(config.viewingDistance);
        if (!isNaN(distanceValue)) {
          const rec = recommendPixelPitchByViewingDistance(
            config.viewingDistance, 
            config.viewingDistanceUnit,
            config.environment || undefined
          );
          
          if (rec.availablePitches.length > 0 || rec.closestPitch) {
            // Filter products by these pitches and environment (if set)
            const filterOptions: ProductFilterOptions = {
              environment: config.environment || undefined,
              enabled: true
            };
            
            // Use closest pitch if no exact matches
            const pitchesToUse = rec.availablePitches.length > 0 ? rec.availablePitches : (rec.closestPitch ? [rec.closestPitch] : []);
            
            // Filter products by recommended pitches
            let filteredProducts: Product[] = [];
            pitchesToUse.forEach(pitch => {
              const pitchProducts = filterProducts({ ...filterOptions, pixelPitch: pitch });
              filteredProducts.push(...pitchProducts);
            });
            filteredProducts = filteredProducts.filter((p, i, arr) => 
              arr.findIndex(x => x.id === p.id) === i
            );
            
            const distanceText = `${config.viewingDistance} ${config.viewingDistanceUnit}`;
            let response = '';
            
            if (rec.idealRange) {
              response += `For viewing distance of **${distanceText}**, ideal pixel pitch is **P${rec.idealRange.min}–P${rec.idealRange.max}**. `;
            }
            
            if (rec.availablePitches.length > 0) {
              response += `Available pitches matching ideal range: **${rec.availablePitches.join('mm, ')}mm**. `;
            } else if (rec.closestPitch) {
              response += `Closest available pitch in our catalog: **P${rec.closestPitch}mm**. `;
            }
            
            if (filteredProducts.length > 0) {
              response += `Found **${filteredProducts.length} product(s)** matching this criteria. Top products: ${filteredProducts.slice(0, 2).map(p => p.name).join(', ')}.`;
            } else {
              response += `No products match${config.environment ? ` in ${config.environment} environment` : ''}. Please adjust your filters.`;
            }
            
            return response;
          } else {
            const distanceText = `${config.viewingDistance} ${config.viewingDistanceUnit}`;
            return `For viewing distance of **${distanceText}**, no matching pixel pitches are available in our product catalog${config.environment ? ` for ${config.environment} environment` : ''}. Please adjust your viewing distance or environment.`;
          }
        }
      }
      return null;
    }
    
    case 'pixelPitch': {
      if (config.pixelPitch) {
        // Filter products by pixel pitch and environment (if set)
        const filterOptions: ProductFilterOptions = {
          pixelPitch: config.pixelPitch,
          environment: config.environment || undefined,
          enabled: true
        };
        const filteredProducts = filterProducts(filterOptions);
        
        if (filteredProducts.length > 0) {
          const series = getProductSeries(filteredProducts);
          const productNames = filteredProducts.slice(0, 3).map(p => p.name).join(', ');
          
          if (series.length > 0) {
            return `For **${config.pixelPitch}mm** pixel pitch${config.environment ? ` in ${config.environment} environment` : ''}, I found **${filteredProducts.length} product(s)**: ${series.join(', ')}. Examples: ${productNames}.`;
          } else {
            return `For **${config.pixelPitch}mm** pixel pitch, I found **${filteredProducts.length} product(s)**: ${productNames}.`;
          }
        } else {
          // SAFETY RULE: Never say "No products available" - always fallback to closest
          const allPitches = getAvailablePixelPitches({ 
            enabled: true, 
            environment: config.environment || undefined 
          });
          if (allPitches.length > 0) {
            const closest = allPitches.reduce((prev, curr) => 
              Math.abs(curr - config.pixelPitch!) < Math.abs(prev - config.pixelPitch!) ? curr : prev
            );
            const fallbackProducts = filterProducts({ 
              pixelPitch: closest, 
              environment: config.environment || undefined,
              enabled: true 
            });
            if (fallbackProducts.length > 0) {
              return `For **${config.pixelPitch}mm** pixel pitch${config.environment ? ` in ${config.environment} environment` : ''}, we don't have exact matches. However, the closest available pitch in our database is **P${closest}**. Available products: ${fallbackProducts.slice(0, 3).map(p => p.name).join(', ')}.`;
            }
          }
          // Last resort: show any available products
          const anyProducts = filterProducts({ enabled: true, environment: config.environment || undefined });
          if (anyProducts.length > 0) {
            return `For **${config.pixelPitch}mm** pixel pitch${config.environment ? ` in ${config.environment} environment` : ''}, exact matches not found. Here are available ${config.environment || ''} products: ${anyProducts.slice(0, 3).map(p => `${p.name} (P${p.pixelPitch})`).join(', ')}.`;
          }
          return `For **${config.pixelPitch}mm** pixel pitch${config.environment ? ` in ${config.environment} environment` : ''}, please check our product catalog for available options.`;
        }
      }
      return null;
    }

    case 'product': {
      if (selectedProduct) {
        const reasons: string[] = [];
        if (selectedProduct.environment && config.environment) {
          if (selectedProduct.environment.toLowerCase() === config.environment.toLowerCase()) {
            reasons.push(`perfect for ${config.environment.toLowerCase()} environment`);
          }
        }
        if (selectedProduct.pixelPitch && config.pixelPitch) {
          if (Math.abs(selectedProduct.pixelPitch - config.pixelPitch) < 0.1) {
            reasons.push(`matches your ${config.pixelPitch}mm pixel pitch requirement`);
          }
        }
        if (selectedProduct.brightness) {
          reasons.push(`brightness of ${selectedProduct.brightness} cd/m²`);
        }
        
        const reasonText = reasons.length > 0 
          ? `This product is suitable because: ${reasons.join(', ')}.`
          : `This product has ${selectedProduct.pixelPitch}mm pixel pitch and is designed for ${selectedProduct.environment || 'general'} use.`;
        
        return reasonText;
      }
      return null;
    }
    
    default:
    return null;
  }
}

// ====================================================
// RULE-BASED RESPONSE GENERATION
// ====================================================

/**
 * Generate rule-based response with NLP parsing
 */
function generateRuleBasedResponse(
  userMessage: string,
  context: ChatbotContext
): string {
  const lowerMessage = userMessage.toLowerCase().trim();
  
  // CRITICAL: Log user message and timestamp to track uniqueness
  const messageHash = userMessage.substring(0, 50).replace(/\s+/g, '_');
  console.log('[generateRuleBasedResponse] ============================================');
  console.log('[generateRuleBasedResponse] NEW MESSAGE:', userMessage);
  console.log('[generateRuleBasedResponse] Message hash:', messageHash);
  console.log('[generateRuleBasedResponse] Context:', {
    viewingDistance: context.config.viewingDistance,
    environment: context.config.environment,
    workflowStage: context.workflowStage,
    selectedProduct: context.selectedProduct?.name
  });
  console.log('[generateRuleBasedResponse] ============================================');
  
  // Extract values first to determine mode
  const extracted = extractValuesFromMessage(userMessage);
  console.log('[generateRuleBasedResponse] Extracted values:', extracted);
  
  // Determine which mode to use
  const mode = determineChatbotMode(userMessage, extracted, context);
  console.log('[generateRuleBasedResponse] Mode:', mode);
  
  // ====================================================
  // MODE 2: PRODUCT RECOMMENDATION MODE
  // ====================================================
  if (mode === 'RECOMMENDATION') {
    console.log('[generateRuleBasedResponse] 🎯 RECOMMENDATION MODE - Calculating recommendations');
    
    // CRITICAL: Detect environment using strict rules
    const detectedEnvironment = detectEnvironment(userMessage, extracted, context);
    
    // ENVIRONMENT RULE: If NOT specified, ASK - do NOT assume
    // CRITICAL: For viewing distances > 20 feet, outdoor is more likely, but we still ask
    if (!detectedEnvironment) {
      // Check if viewing distance suggests outdoor (but still ask to be sure)
      const viewingDistance = extracted.distance ? extracted.distance.value : 
                              (context.config.viewingDistance ? parseFloat(context.config.viewingDistance) : null);
      const viewingDistanceUnit = extracted.distance ? extracted.distance.unit : 
                                 (context.config.viewingDistanceUnit || 'feet');
      
      let distanceInFeet = viewingDistance;
      if (viewingDistance && viewingDistanceUnit === 'meters') {
        distanceInFeet = viewingDistance * 3.28084;
      }
      
      // If distance > 20 feet, suggest outdoor but still ask
      if (distanceInFeet && distanceInFeet > 20) {
        return `I see you mentioned a viewing distance of ${distanceInFeet.toFixed(0)} feet. For such distances, **outdoor** installations are more common.\n\n**Is your requirement indoor or outdoor?**\n\nI need to know the environment to recommend the correct products. I will only recommend products that match your specified environment.`;
      }
      
      return `Is your requirement **indoor** or **outdoor**?\n\nI need to know the environment to recommend the correct products. I will only recommend products that match your specified environment.`;
    }
    
    console.log('[generateRuleBasedResponse] Environment detected:', detectedEnvironment);
    console.log('[generateRuleBasedResponse] Viewing distance:', extracted.distance || context.config.viewingDistance);
    
    // Build filter context from extracted values
    // CRITICAL: Use detectedEnvironment (strict environment detection)
    // NEVER use context.config.environment if detectedEnvironment is null (already handled above)
    const tempContext: ChatbotContext = {
      ...context,
      config: {
        ...context.config,
        environment: detectedEnvironment, // Use detected environment (NEVER assume)
        viewingDistance: extracted.distance ? extracted.distance.value.toString() : context.config.viewingDistance,
        viewingDistanceUnit: extracted.distance ? extracted.distance.unit : context.config.viewingDistanceUnit,
        pixelPitch: extracted.pixelPitch || context.config.pixelPitch,
        purpose: extracted.purpose || context.config.purpose,
      }
    };
    
    console.log('[generateRuleBasedResponse] Temp context environment:', tempContext.config.environment);
    console.log('[generateRuleBasedResponse] Temp context viewing distance:', tempContext.config.viewingDistance, tempContext.config.viewingDistanceUnit);
    
    // If size is provided, update config
    if (extracted.size && extracted.size.width) {
      const width = extracted.size.width;
      const height = extracted.size.height || width;
      const unit = extracted.size.unit || 'm';
      
      // Convert to mm
      let widthMM = width;
      if (unit === 'cm') widthMM = width * 10;
      else if (unit === 'm') widthMM = width * 1000;
      else if (unit === 'ft') widthMM = width * 304.8;
      
      tempContext.config.width = widthMM;
      tempContext.config.height = height * (widthMM / width);
      tempContext.config.unit = unit === 'ft' ? 'ft' : unit === 'm' ? 'm' : 'mm';
    }
    
    // Get comprehensive recommendation
    const rec = getComprehensiveRecommendation(tempContext);
    
    // Validate recommendation data before formatting
    if (!rec.idealRange && !rec.closestPitch && rec.products.length === 0 && rec.pixelPitch.length === 0) {
      // No data at all - provide helpful guidance
      let guidance = `I understand you're looking for:\n`;
      if (extracted.size) {
        guidance += `- Size: ${extracted.size.width}${extracted.size.unit || 'm'} × ${extracted.size.height || extracted.size.width}${extracted.size.unit || 'm'}\n`;
      }
      if (extracted.environment) {
        guidance += `- Environment: ${extracted.environment}\n`;
      }
      if (extracted.distance) {
        guidance += `- Viewing distance: ${extracted.distance.value} ${extracted.distance.unit}\n`;
      }
      guidance += `\nTo provide accurate recommendations, I need:\n`;
      if (!extracted.environment && !tempContext.config.environment) {
        guidance += `- **Environment** (Indoor or Outdoor)\n`;
      }
      if (!extracted.distance && !tempContext.config.viewingDistance) {
        guidance += `- **Viewing distance** (how far viewers will be from the screen)\n`;
      }
      guidance += `\nOnce you provide this information, I can recommend the best pixel pitch and products for your needs.`;
      return guidance;
    }
    
    // If no products found but we have pitch recommendations, still show them
    if (rec.products.length === 0 && (rec.idealRange || rec.closestPitch || rec.pixelPitch.length > 0)) {
      let guidance = `Based on your requirements:\n`;
      if (extracted.size) {
        guidance += `- Size: ${extracted.size.width}${extracted.size.unit || 'm'} × ${extracted.size.height || extracted.size.width}${extracted.size.unit || 'm'}\n`;
      }
      if (extracted.environment || tempContext.config.environment) {
        guidance += `- Environment: ${extracted.environment || tempContext.config.environment}\n`;
      }
      if (extracted.distance || tempContext.config.viewingDistance) {
        const dist = extracted.distance ? `${extracted.distance.value} ${extracted.distance.unit}` : 
                     tempContext.config.viewingDistance ? `${tempContext.config.viewingDistance} ${tempContext.config.viewingDistanceUnit}` : '';
        if (dist) guidance += `- Viewing distance: ${dist}\n`;
      }
      if (rec.idealRange) {
        guidance += `\n**📌 Ideal Pixel Pitch**: P${rec.idealRange.ideal.toFixed(1)} (Range: P${rec.idealRange.min.toFixed(1)}–P${rec.idealRange.max.toFixed(1)})\n`;
      }
      if (rec.closestPitch) {
        guidance += `**📌 Closest Available Pixel Pitch**: P${rec.closestPitch}\n`;
      }
      if (rec.pixelPitch.length > 0) {
        guidance += `**📌 Available Pixel Pitches**: ${rec.pixelPitch.join('mm, ')}mm\n`;
      }
      guidance += `\nUnfortunately, I couldn't find products matching these exact criteria in our database. Please try:\n`;
      guidance += `- Adjusting your viewing distance or environment\n`;
      guidance += `- Checking our full product catalog\n`;
      guidance += `- Contacting sales for custom solutions\n`;
      return guidance;
    }
    
    // Format using the required format
    return formatRecommendation(
      rec.idealRange,
      rec.pixelPitch,
      rec.closestPitch,
      rec.products,
      rec.reasoning,
      tempContext
    );
  }
  
  // ====================================================
  // MODE 1: NORMAL CONVERSATION MODE
  // ====================================================
  console.log('[generateRuleBasedResponse] 💬 NORMAL MODE - Answering questions, NO recommendations');
  
  // Handle "choose/select/pick" queries
  const isChooseQuery = lowerMessage === 'choose' || 
                        lowerMessage === 'select' || 
                        lowerMessage === 'pick' ||
                        lowerMessage.startsWith('choose ') ||
                        lowerMessage.startsWith('select ') ||
                        lowerMessage.startsWith('pick ');
  
  if (isChooseQuery) {
    const { config, selectedProduct, workflowStage } = context;
    if (workflowStage === 'wizard') {
      return `What would you like to choose?\n\n- **Product** - Select a product for your display\n- **Pixel Pitch** - Choose the pixel pitch\n- **Environment** - Select Indoor or Outdoor\n- **Dimensions** - Set your display size\n\nOr tell me what you need help with!`;
    } else if (workflowStage === 'configurator') {
      if (!selectedProduct) {
        return `What would you like to choose?\n\n- **Product** - Select a product for your display\n- **Dimensions** - Adjust your display size\n\nOr ask me for product recommendations based on your requirements!`;
      } else {
        return `You've already selected **${selectedProduct.name}**. What would you like to do next?\n\n- **Change product** - Select a different product\n- **Configure wiring** - Set up data and power connections\n- **Generate quote** - Get pricing information\n- **Adjust dimensions** - Modify display size`;
      }
    } else {
      return `What would you like to choose or configure?\n\n- **Start Configuration** - I'll guide you step-by-step\n- **Choose Product** - Select a product directly\n- **Get Recommendations** - Tell me your requirements and I'll suggest products\n\nWhat would you like to do?`;
    }
  }
  
  // Handle other short responses
  if (lowerMessage.length <= 3 && (lowerMessage === 'yes' || lowerMessage === 'no' || lowerMessage === 'ok' || lowerMessage === 'okay')) {
    return `Got it! What would you like help with next?\n\n- Product recommendations\n- Configuration help\n- Technical questions\n- Something else?`;
  }
  
  // In NORMAL mode, we do NOT generate recommendations
  // Only answer questions and provide guidance
  
  // Product keyword search (use filtered products)
  if (extracted.productKeywords && extracted.productKeywords.length > 0) {
    const matchingProducts = filterProducts({ enabled: true }).filter(p => 
      extracted.productKeywords!.some(keyword => 
        p.name.toLowerCase().includes(keyword.toLowerCase()) ||
        p.category?.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    if (matchingProducts.length > 0) {
      const productList = matchingProducts.slice(0, 3).map(p => 
        `- **${p.name}**: ${p.pixelPitch}mm pitch, ${p.environment}, ${p.brightness} cd/m²`
      ).join('\n');
      return `Here are products matching **${extracted.productKeywords.join(', ')}**:\n\n${productList}\n\nWould you like more details about any of these?`;
    } else {
      return `No products found matching **${extracted.productKeywords.join(', ')}**. Please try different keywords or check available products.`;
    }
  }
  
  // Fallback to existing rule-based responses
  const errors = detectErrors(context);
  
  // Error detection responses
  if (errors.length > 0 && (lowerMessage.includes('help') || lowerMessage.includes('error') || lowerMessage.includes('issue'))) {
    return `I've detected some issues that need attention:\n\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\nLet me know if you'd like help fixing any of these!`;
  }

  // Greeting responses
  if (lowerMessage.match(/^(hi|hello|hey|greetings|howdy)/)) {
    const { workflowStage, currentStep, selectedProduct, config } = context;
    
    if (workflowStage === 'landing') {
      return `Hello! 👋 I'm your LED Display Configuration Assistant. I'll guide you step-by-step through configuring your LED display.

**Quick Start:**
1. Click **"Start Configuration"** - I'll guide you through each step (recommended for first-time users)
2. Click **"Choose Product Directly"** - Skip to product selection if you know what you need

Which option would you like to use? I can help you decide!`;
    } else if (workflowStage === 'wizard') {
      const stepNames: Record<string, string> = {
        dimensions: 'Setting Dimensions',
        viewingDistance: 'Setting Viewing Distance',
        environment: 'Choosing Environment',
        pixelPitch: 'Selecting Pixel Pitch',
        product: 'Choosing Product'
      };
      return `Hello! 👋 I'm here to help you configure your LED display.

**Current Status:**
- Step: ${stepNames[currentStep || ''] || currentStep || 'Unknown'}
- ${config.width > 0 && config.height > 0 ? `Dimensions: ${config.width}mm × ${config.height}mm` : 'Dimensions: Not set yet'}
- ${config.environment ? `Environment: ${config.environment}` : 'Environment: Not selected'}
- ${selectedProduct ? `Product: ${selectedProduct.name}` : 'Product: Not selected'}

**What I can help with:**
- Complete the current step
- Explain any technical terms
- Recommend products based on your needs
- Detect and fix configuration issues

What do you need help with on this step?`;
    } else if (workflowStage === 'configurator') {
      return `Hello! 👋 I'm here to help you finish configuring your LED display.

**Current Status:**
- ${selectedProduct ? `✅ Product Selected: ${selectedProduct.name}` : '⚠️ No product selected yet'}
- ${config.width > 0 && config.height > 0 ? `Dimensions: ${config.width}mm × ${config.height}mm` : 'Dimensions: Not set'}

**What you can do now:**
- Adjust dimensions and aspect ratios
- Select or change product
- Configure wiring (data & power)
- Generate quote

What would you like to do next?`;
    }
    
    return `Hello! 👋 I'm your LED Display Configuration Assistant. I'm here to help you configure your LED display step-by-step. 

What would you like to configure today?`;
  }

  // Technical Questions - Pixel Pitch (KNOWLEDGE MODE only - no calculations)
  // This is handled above in the KNOWLEDGE MODE section
  // Removed duplicate to prevent auto-recommendations in NORMAL mode

  // Technical Questions - Viewing Distance (KNOWLEDGE MODE)
  // Only explain concept, don't calculate or recommend unless user asks
  if ((lowerMessage.includes('viewing distance') || lowerMessage.includes('what is viewing distance')) &&
      !lowerMessage.includes('recommend') && !lowerMessage.includes('calculate') && !lowerMessage.includes('which')) {
    return `**Viewing Distance** is how far viewers will typically be positioned from the LED display.

**General Guidelines:**
- **Near viewing (0-8 ft / 0-2.4m)**: Use 0.9mm-1.5mm pixel pitch
- **Medium viewing (8-20 ft / 2.4-6m)**: Use 1.5mm-2.5mm pixel pitch
- **Far viewing (20+ ft / 6m+)**: Use 3.9mm-6.6mm pixel pitch

**Examples:**
- Retail stores: 3-5 meters → 0.9mm-1.5mm
- Shopping malls: 5-10 meters → 1.5mm-2.5mm
- Stadiums/Billboards: 20+ meters → 3.9mm-6.6mm

If you tell me your viewing distance, environment, and screen size, I can calculate the ideal pixel pitch and recommend products!`;
  }
  
  // ====================================================
  // TECHNICAL QUESTIONS - LED INDUSTRY SPECIFIC
  // ====================================================
  
  // Rule 4: Technical Questions - Power Wiring
  if (lowerMessage.includes('power wiring') || lowerMessage.includes('what is power wiring')) {
    return `**Power Wiring** refers to the cables that supply electrical power to LED cabinets/modules.

**Purpose:**
- Provides electrical power to each LED cabinet/module in the display
- Ensures consistent power distribution across the entire display
- Critical for display operation and safety

**Key Components:**
- **Power Cables**: Connect LED cabinets to power supply units (PSUs)
- **Power Distribution**: Power distribution boxes for large displays
- **Safety**: Proper grounding and circuit protection

**Important Considerations:**
- Calculate total power consumption based on display size
- Use appropriate wire gauge for power requirements
- Follow electrical safety codes and regulations
- Ensure adequate power supply capacity for your display size`;
  }
  
  // Rule 4: Technical Questions - Data Wiring
  if (lowerMessage.includes('data wiring') || lowerMessage.includes('what is data wiring')) {
    return `**Data Wiring** refers to the cables that transmit video/data signals to LED cabinets/modules.

**Purpose:**
- Transmits video content from the source (computer, media player) to the LED display
- Connects video source to the LED display controller
- Distributes video signals to individual LED cabinets/modules

**Key Components:**
- **Data Cables**: Connect video source to LED display controller
- **Network Cables**: For network-based control systems
- **Signal Distribution**: Data hubs and extenders for large displays

**Types:**
- **HDMI/DVI**: For direct video connections from computer to controller
- **Network (Ethernet)**: For network-based video transmission
- **Fiber Optic**: For long-distance signal transmission
- **Data Hubs**: Distribute signals to multiple LED cabinets

**Important:**
- Data wiring is separate from power wiring
- Required for video content display
- Must match controller specifications`;
  }
  
  // Technical Questions - LED Display Concepts
  if (lowerMessage.includes('what is led') || lowerMessage.includes('led display')) {
    return `**LED Display** (Light Emitting Diode Display) is a flat panel display that uses an array of LEDs as pixels.

**Key Features:**
- **High Brightness**: Visible even in bright sunlight (outdoor models)
- **Energy Efficient**: Lower power consumption than traditional displays
- **Long Lifespan**: Typically 50,000+ hours
- **Modular Design**: Can be customized to any size

**Common Applications:**
- Outdoor billboards and signage
- Indoor retail displays
- Stadium scoreboards
- Conference room displays
- Stage backdrops

Would you like to know more about specific aspects of LED displays, or help configuring one for your needs?`;
  }

  // Product selection help - Use formatted recommendation
  // CRITICAL: Only trigger if explicitly asking for products/recommendations
  // DO NOT trigger for vague queries like "choose", "product", etc.
  // Must explicitly ask: "recommend product", "suggest product", "which product", etc.
  const isProductQuery = (lowerMessage.includes('product') && 
                          (lowerMessage.includes('recommend') || 
                           lowerMessage.includes('suggest') || 
                           lowerMessage.includes('which product') ||
                           lowerMessage.includes('what product') ||
                           lowerMessage.includes('show me product'))) ||
                        (lowerMessage.includes('recommend') && !lowerMessage.includes('choose') && !lowerMessage.match(/^(choose|select|pick)$/)) || 
                        (lowerMessage.includes('suggest') && !lowerMessage.includes('choose') && !lowerMessage.match(/^(choose|select|pick)$/)) ||
                        lowerMessage.includes('which product') ||
                        lowerMessage.includes('what product') ||
                        lowerMessage.includes('show me product');
  
  // CRITICAL: Don't trigger if user just said "choose" or similar
  if (isProductQuery && !lowerMessage.match(/^(choose|select|pick)$/)) {
    const { config, selectedProduct } = context;
    
    if (selectedProduct) {
      // Show why selected product is suitable
      const reasons: string[] = [];
      if (selectedProduct.environment && config.environment) {
        if (selectedProduct.environment.toLowerCase() === config.environment.toLowerCase()) {
          reasons.push(`perfect for ${config.environment.toLowerCase()} environment`);
        }
      }
      if (selectedProduct.pixelPitch && config.pixelPitch) {
        if (Math.abs(selectedProduct.pixelPitch - config.pixelPitch) < 0.1) {
          reasons.push(`matches your ${config.pixelPitch}mm pixel pitch requirement`);
        }
      }
      if (selectedProduct.brightness) {
        reasons.push(`brightness: ${selectedProduct.brightness} cd/m²`);
      }
      
      let response = `You've selected: **${selectedProduct.name}**\n`;
      response += `- Series: ${selectedProduct.category}\n`;
      response += `- Pixel Pitch: ${selectedProduct.pixelPitch}mm\n`;
      response += `- Environment: ${selectedProduct.environment}\n`;
      response += `- Cabinet size: ${selectedProduct.cabinetDimensions.width} × ${selectedProduct.cabinetDimensions.height} mm\n`;
      
      if (reasons.length > 0) {
        response += `\n**Why suitable**: ${reasons.join(', ')}.`;
      }
      
      return response;
    }
    
    // CRITICAL: Only generate recommendations if user EXPLICITLY asked for them
    // Check if the query actually contains recommendation keywords
    const hasExplicitRequest = lowerMessage.includes('recommend') || 
                               lowerMessage.includes('suggest') ||
                               lowerMessage.includes('which product') ||
                               lowerMessage.includes('what product') ||
                               lowerMessage.includes('show me product');
    
    // If user just said "product" without asking for recommendations, ask what they want
    if (!hasExplicitRequest) {
      return `What would you like to know about products?\n\n- **Recommend products** - I can suggest products based on your requirements\n- **Product information** - Ask about specific products\n- **Compare products** - Compare different product options\n\nOr tell me your requirements (viewing distance, environment, size) and I'll recommend the best products!`;
    }
    
    // Only generate recommendations if we have enough context AND user explicitly asked
    if (!context.config.viewingDistance && !context.config.environment && !extracted.size && !extracted.distance && !extracted.environment) {
      return `To recommend products, I need some information:\n\n1. **Viewing distance** - How far will viewers be from the screen?\n2. **Environment** - Indoor or Outdoor?\n3. **Screen size** (optional) - Dimensions of your display\n\nYou can tell me like: "I need a product for 20 feet viewing distance, outdoor use" or ask me to recommend based on your current configuration.`;
    }
    
    // Get comprehensive recommendation and format it
    const rec = getComprehensiveRecommendation(context);
    return formatRecommendation(
      rec.idealRange,
      rec.pixelPitch,
      rec.closestPitch,
      rec.products,
      rec.reasoning,
      context
    );
  }
  
  // Pixel pitch recommendation
  if (lowerMessage.includes('pixel pitch') && (lowerMessage.includes('best') || lowerMessage.includes('recommend') || lowerMessage.includes('which'))) {
    const rec = getComprehensiveRecommendation(context);
    let response = '';
    if (rec.idealRange) {
      response += `**📌 Ideal Pixel Pitch:** P${rec.idealRange.ideal.toFixed(1)} (Range: P${rec.idealRange.min.toFixed(1)}–P${rec.idealRange.max.toFixed(1)})\n\n`;
    }
    if (rec.closestPitch && rec.idealRange && !rec.pixelPitch.some(p => p >= rec.idealRange!.min && p <= rec.idealRange!.max)) {
      response += `**📌 Closest Available Pixel Pitch in Our Catalog:** P${rec.closestPitch}\n\n`;
    }
    if (rec.pixelPitch.length > 0) {
      response += `**📌 Available Pixel Pitches:** ${rec.pixelPitch.join('mm, ')}mm\n\n`;
    }
    response += `**📌 Reasoning:**\n${rec.reasoning}`;
    return response || `No pixel pitches available for your current filters. Please adjust environment or viewing distance.`;
  }

  // Handle questions about dimensions/size
  if (lowerMessage.includes('size') || lowerMessage.includes('dimension') || lowerMessage.includes('width') || lowerMessage.includes('height')) {
    const { config } = context;
    if (config.width > 0 && config.height > 0) {
      const widthFt = config.unit === 'ft' ? config.width : 
                     config.unit === 'm' ? config.width * 3.28084 :
                     config.unit === 'cm' ? config.width / 30.48 : config.width / 304.8;
      const heightFt = config.unit === 'ft' ? config.height : 
                      config.unit === 'm' ? config.height * 3.28084 :
                      config.unit === 'cm' ? config.height / 30.48 : config.height / 304.8;
      return `Your current display dimensions are:\n- **Width**: ${widthFt.toFixed(1)}ft (${config.width}${config.unit === 'ft' ? 'ft' : config.unit === 'm' ? 'm' : config.unit === 'cm' ? 'cm' : 'mm'})\n- **Height**: ${heightFt.toFixed(1)}ft (${config.height}${config.unit === 'ft' ? 'ft' : config.unit === 'm' ? 'm' : config.unit === 'cm' ? 'cm' : 'mm'})\n\nYou can adjust these in the configurator. Would you like recommendations based on this size?`;
    } else {
      return `To configure your LED display, I need to know the dimensions. Please provide:\n\n1. **Width** (e.g., 5 meters, 10 feet)\n2. **Height** (e.g., 3 meters, 6 feet)\n3. **Unit** (meters, feet, cm, or mm)\n\nYou can enter this in the configuration wizard, or tell me directly like: "I need a 5m x 3m screen"`;
    }
  }

  // Handle "what" questions
  if (lowerMessage.startsWith('what') || lowerMessage.startsWith('how')) {
    if (lowerMessage.includes('next') || lowerMessage.includes('do')) {
      const { workflowStage, currentStep } = context;
      if (workflowStage === 'wizard') {
        const stepNames: Record<string, string> = {
          dimensions: 'Setting Dimensions',
          viewingDistance: 'Setting Viewing Distance',
          environment: 'Choosing Environment',
          pixelPitch: 'Selecting Pixel Pitch',
          product: 'Choosing Product'
        };
        return `**Next Step**: ${stepNames[currentStep || ''] || currentStep || 'Continue with the wizard'}\n\nFollow the instructions on screen to complete this step. Once done, click "Next" to proceed.\n\nIf you need help with the current step, just ask!`;
      } else if (workflowStage === 'configurator') {
        return `**What to do next**:\n\n1. **Select a product** (if not selected yet)\n2. **Adjust dimensions** if needed\n3. **Configure wiring** (data and power connections)\n4. **Generate quote** to get pricing\n\nWhat would you like to do?`;
      }
    }
  }

  // Handle "help" requests
  if (lowerMessage.includes('help') || lowerMessage.includes('assist')) {
    const { workflowStage, currentStep, config } = context;
    if (workflowStage === 'wizard') {
      return `I'm here to help! You're currently on the **${currentStep || 'configuration'}** step.\n\n**I can help you with:**\n- Understanding what information is needed\n- Explaining technical terms\n- Recommending products\n- Fixing configuration issues\n\nWhat specific help do you need?`;
    } else {
      return `I'm here to help you configure your LED display! I can assist with:\n\n- **Product recommendations** based on your needs\n- **Technical explanations** (pixel pitch, viewing distance, etc.)\n- **Step-by-step guidance** through the configuration\n- **Error detection** and troubleshooting\n\nWhat would you like help with?`;
    }
  }

  // Try to understand what the user is asking about
  const questionKeywords = {
    price: ['price', 'cost', 'pricing', 'how much', 'rupee', '₹'],
    installation: ['install', 'installation', 'setup', 'mount'],
    technical: ['brightness', 'refresh', 'resolution', 'specification', 'spec'],
    comparison: ['compare', 'difference', 'vs', 'versus', 'better'],
    availability: ['available', 'stock', 'delivery', 'lead time'],
    warranty: ['warranty', 'guarantee', 'support', 'service']
  };
  
  // Check for specific question types
  for (const [type, keywords] of Object.entries(questionKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      const { config, selectedProduct } = context;
      
      if (type === 'price' && selectedProduct) {
        return `For pricing information on **${selectedProduct.name}**, please:\n\n1. Configure your display dimensions\n2. Select your user type (End User/Channel/Reseller)\n3. Click "Get a Quote" to see detailed pricing\n\nI can help you with the configuration if needed!`;
      }
      
      if (type === 'technical' && selectedProduct) {
        let techInfo = `**Technical Specifications for ${selectedProduct.name}:**\n\n`;
        techInfo += `- Pixel Pitch: P${selectedProduct.pixelPitch}mm\n`;
        techInfo += `- Environment: ${selectedProduct.environment}\n`;
        if (selectedProduct.brightness) techInfo += `- Brightness: ${selectedProduct.brightness} cd/m²\n`;
        if (selectedProduct.refreshRate) techInfo += `- Refresh Rate: ${selectedProduct.refreshRate} Hz\n`;
        if (selectedProduct.cabinetDimensions) {
          techInfo += `- Cabinet Size: ${selectedProduct.cabinetDimensions.width} × ${selectedProduct.cabinetDimensions.height} mm\n`;
        }
        if (selectedProduct.weightPerCabinet) {
          techInfo += `- Weight: ${selectedProduct.weightPerCabinet} kg per cabinet\n`;
        }
        return techInfo;
      }
      
      // For other question types, provide context-aware response
      return `I can help you with ${type} information! ${selectedProduct ? `For **${selectedProduct.name}**, ` : ''}please provide more details about what specifically you'd like to know, or ask me about:\n\n- Product recommendations\n- Configuration help\n- Technical specifications\n- Pricing information`;
    }
  }
  
  // Context-aware default response
  const { workflowStage, currentStep, config: configState, selectedProduct: selProduct } = context;
  
  let contextSpecificHelp = '';
  
  if (workflowStage === 'landing') {
    contextSpecificHelp = `You're on the landing page. I recommend:\n\n1. Click "Start Configuration" if you're new - I'll guide you through each step\n2. Click "Choose Product Directly" if you already know which product you need\n\nWhat would you like to do?`;
  } else if (workflowStage === 'wizard') {
    const stepHelp: Record<string, string> = {
      dimensions: `Current Step: Setting Dimensions\n\nWhat I need from you:\n1. Enter your display width (e.g., 5 for 5 meters)\n2. Enter your display height (e.g., 3 for 3 meters)\n3. Choose your unit (m, ft, cm, or mm)\n\nOnce you enter these, click "Next" to continue.`,
      viewingDistance: `Current Step: Viewing Distance\n\nEnter how far viewers will typically be from the display (in meters or feet). This helps recommend the right pixel pitch.\n\nExample: For a retail store, typical viewing distance is 3-5 meters.`,
      environment: `Current Step: Environment Selection\n\nChoose:\n- **Indoor**: For indoor installations (shopping malls, offices, restaurants)\n- **Outdoor**: For outdoor installations (building facades, billboards)\n\nThis affects product recommendations and brightness requirements.`,
      pixelPitch: `Current Step: Pixel Pitch Selection\n\nPixel pitch determines image quality:\n- **Lower pitch** (0.9mm, 1.2mm, 1.5mm) = Better quality, closer viewing\n- **Higher pitch** (3.9mm, 4.8mm, 6.6mm) = Lower cost, farther viewing\n\nBased on your viewing distance, I can help you choose.`,
      product: `Current Step: Product Selection\n\nChoose from products that match:\n- Your viewing distance\n- Your environment (Indoor/Outdoor)\n- Your pixel pitch preference\n\nI can help you compare products if needed!`
    };
    contextSpecificHelp = stepHelp[currentStep || ''] || `You're in the configuration wizard. Current step: ${currentStep || 'unknown'}\n\nTell me what you need help with on this step, or ask me about any specific question.`;
  } else if (workflowStage === 'configurator') {
    contextSpecificHelp = `You're in the Display Configurator. Here's what you can do:\n\n1. **Adjust dimensions** - Modify width, height, or aspect ratio\n2. **Select/change product** - Choose a different product if needed\n3. **View preview** - See how your display will look\n4. **Configure wiring** - Set up data and power connections\n5. **Generate quote** - Get pricing and quotation\n\n${!selProduct ? '⚠️ No product selected yet. I recommend selecting a product first.' : `✅ Product: ${selProduct.name}\nYou can now configure wiring and generate a quote.`}`;
  }
  
  // ====================================================
  // RULE 5: CHECK IF QUESTION IS NOT RELATED TO LED DISPLAYS
  // ====================================================
  
  // Check for non-LED display related questions
  const nonLEDKeywords = [
    'weather', 'temperature', 'cooking', 'recipe', 'movie', 'music', 'sports',
    'news', 'politics', 'health', 'medical', 'education', 'travel', 'restaurant',
    'hotel booking', 'shopping', 'fashion', 'beauty', 'fitness', 'gym', 'yoga'
  ];
  
  const isNonLEDQuestion = nonLEDKeywords.some(keyword => lowerMessage.includes(keyword)) &&
                           !lowerMessage.includes('led') && 
                           !lowerMessage.includes('display') &&
                           !lowerMessage.includes('screen') &&
                           !lowerMessage.includes('pixel') &&
                           !lowerMessage.includes('brightness');
  
  if (isNonLEDQuestion) {
    return `I can only assist with LED display recommendations and technical information.\n\nI can help you with:\n- LED display product recommendations\n- Technical specifications and explanations\n- Configuration guidance\n- Installation and wiring information\n\nWhat would you like to know about LED displays?`;
  }
  
  // ====================================================
  // RULE 8: IF USER INPUT IS INCOMPLETE - ASK FOLLOW-UP
  // ====================================================
  
  // Check if user is asking for recommendations but missing critical info
  const wantsRecommendation = lowerMessage.includes('recommend') || 
                              lowerMessage.includes('suggest') ||
                              lowerMessage.includes('which product') ||
                              lowerMessage.includes('what product') ||
                              lowerMessage.includes('choose product');
  
  if (wantsRecommendation) {
    const hasEnvironment = extracted.environment || context.config.environment;
    const hasViewingDistance = extracted.distance || context.config.viewingDistance;
    
    if (!hasEnvironment && !hasViewingDistance) {
      return `To provide accurate product recommendations, I need:\n\n1. **Environment** - Is this for indoor or outdoor use?\n2. **Viewing Distance** - How far will viewers be from the display? (in feet or meters)\n\nPlease provide these details so I can recommend the best products for your needs.`;
    }
    
    if (!hasEnvironment) {
      return `I need to know the **environment** for your LED display:\n\n- **Indoor** - For indoor installations (shopping malls, offices, restaurants)\n- **Outdoor** - For outdoor installations (building facades, billboards, hoardings)\n\nThis is critical because indoor and outdoor products have different specifications (brightness, weatherproofing, etc.). Which environment do you need?`;
    }
    
    if (!hasViewingDistance) {
      const distance = extracted.distance ? `${extracted.distance.value} ${extracted.distance.unit}` : 
                      context.config.viewingDistance ? `${context.config.viewingDistance} ${context.config.viewingDistanceUnit}` : null;
      return `I need to know the **viewing distance** for your LED display:\n\n- How far will viewers typically be from the display? (e.g., 10 feet, 25 feet, 5 meters)\n\nThis helps me calculate the ideal pixel pitch for optimal image quality. What is your viewing distance?`;
    }
  }
  
  // CRITICAL: Make default response dynamic based on user's actual message
  // This prevents the same response every time
  let response = '';
  
  // Analyze user's message to provide relevant response
  if (lowerMessage.includes('product')) {
    response = `I can help you with products! To recommend the best products, I need:\n\n1. **Environment** - Indoor or Outdoor?\n2. **Viewing distance** - How far will viewers be?\n3. **Screen size** (optional) - Dimensions of your display\n\nTell me these details and I'll recommend the perfect products for you!`;
  } else if (lowerMessage.includes('pixel') || lowerMessage.includes('pitch')) {
    response = `I can help you choose the right pixel pitch! The ideal pixel pitch depends on:\n\n- **Viewing distance** - How far viewers will be from the screen\n- **Environment** - Indoor or Outdoor use\n\nTell me your viewing distance and environment, and I'll calculate the ideal pixel pitch for you!`;
  } else if (lowerMessage.includes('install') || lowerMessage.includes('setup')) {
    response = `I can help you with installation! Here's what you need to know:\n\n**Installation Steps:**\n1. Prepare the mounting structure\n2. Install LED cabinets according to your configuration\n3. Connect data and power wiring\n4. Configure the control system\n5. Test the display\n\nWould you like detailed guidance for any specific step?`;
  } else if (lowerMessage.includes('wiring') || lowerMessage.includes('cable')) {
    response = `I can help you with wiring! LED displays require:\n\n**Data Wiring:**\n- Connect video source to controller\n- Use appropriate cables (HDMI, network, fiber)\n\n**Power Wiring:**\n- Ensure adequate power supply\n- Follow safety guidelines\n\nOnce you select a product in the configurator, you can configure the wiring setup. Need help with a specific wiring question?`;
  } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    response = `I can help you with pricing! To get accurate pricing:\n\n1. **Select a product** in the configurator\n2. **Set your dimensions**\n3. **Choose your user type** (End User/Channel/Reseller)\n4. Click **"Get a Quote"** for detailed pricing\n\nWould you like help selecting a product or configuring dimensions?`;
  } else if (contextSpecificHelp) {
    // Use context-specific help if available
    response = contextSpecificHelp;
  } else {
    // Generic but still dynamic response
    const { workflowStage, selectedProduct } = context;
    if (workflowStage === 'wizard') {
      response = `I'm here to help you through the configuration wizard! What would you like help with?\n\n- Understanding the current step\n- Explaining technical terms\n- Product recommendations\n- Troubleshooting issues`;
    } else if (workflowStage === 'configurator') {
      if (selectedProduct) {
        response = `You're configuring **${selectedProduct.name}**. What would you like to do?\n\n- Adjust dimensions\n- Configure wiring\n- Get pricing quote\n- Change product\n- Ask technical questions`;
      } else {
        response = `You're in the configurator. What would you like to do?\n\n- Select a product\n- Set dimensions\n- Get product recommendations\n- Ask questions`;
      }
    } else {
      response = `I'm here to help you configure your LED display! What would you like to do?\n\n- Start configuration\n- Get product recommendations\n- Learn about LED displays\n- Ask technical questions`;
    }
  }
  
  // Add error detection if needed
  if (errors.length > 0 && !response.toLowerCase().includes('issue') && !response.toLowerCase().includes('error')) {
    response += `\n\n⚠️ **I noticed some issues:**\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\nWould you like help fixing these?`;
  }
  
  return response;
}

/**
 * Detect errors and misconfigurations in current state
 */
export function detectErrors(context: ChatbotContext): string[] {
  const errors: string[] = [];
  const { config, selectedProduct } = context;

  // Check for missing dimensions
  if (config.width <= 0 || config.height <= 0) {
    errors.push('Display dimensions are not set. Please enter valid width and height values.');
  }

  // Check for unrealistic dimensions
  if (config.width > 0 && config.height > 0) {
    const areaM2 = (config.width * config.height) / 1_000_000;
    if (areaM2 < 0.01) {
      errors.push('Display size is very small. Please verify your dimensions.');
    }
    if (areaM2 > 1000) {
      errors.push('Display size seems very large. Please verify your dimensions.');
    }
  }

  // Check environment selection
  if (context.workflowStage === 'wizard' && !config.environment) {
    errors.push('Environment (Indoor/Outdoor) is not selected. This is required for product recommendations.');
  }

  // Check product-environment mismatch
  if (selectedProduct && config.environment) {
    const productEnv = selectedProduct.environment?.toLowerCase();
    const configEnv = config.environment.toLowerCase();
    if (productEnv && !productEnv.includes(configEnv) && !configEnv.includes(productEnv)) {
      errors.push(`The selected product "${selectedProduct.name}" is designed for ${selectedProduct.environment} environment, but you selected ${config.environment}. Please verify your selection.`);
    }
  }

  // Check viewing distance and pixel pitch match
  if (config.viewingDistance && config.pixelPitch && selectedProduct) {
    const viewingDistanceM = parseFloat(config.viewingDistance);
    if (!isNaN(viewingDistanceM)) {
      const unitMultiplier = config.viewingDistanceUnit === 'feet' ? 0.3048 : 1;
      const distanceM = viewingDistanceM * unitMultiplier;
      const pitchRecommendation = recommendPixelPitchByViewingDistance(
        config.viewingDistance, 
        config.viewingDistanceUnit,
        config.environment || undefined
      );
      
      const recommendedPitches = pitchRecommendation.availablePitches.length > 0 
        ? pitchRecommendation.availablePitches 
        : (pitchRecommendation.closestPitch ? [pitchRecommendation.closestPitch] : []);
      
      if (recommendedPitches.length > 0 && !recommendedPitches.some(p => Math.abs(p - config.pixelPitch!) < 0.1)) {
        errors.push(`Viewing distance (${config.viewingDistance} ${config.viewingDistanceUnit}) may not match ${config.pixelPitch}mm pixel pitch. Recommended pitches for this distance: ${recommendedPitches.join('mm, ')}mm.`);
      }
    }
  }

  return errors;
}

/**
 * Call Gemini API to generate AI response (enhancement)
 */
async function callGeminiAPI(
  userMessage: string,
  context: ChatbotContext
): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    return null; // No API key, fall back to rule-based
  }

  try {
    const recentHistory = context.conversationHistory
      .slice(-MAX_CONVERSATION_HISTORY)
      .filter(msg => msg.role !== 'system');

    // Build context information
    const contextInfo: string[] = [];
    if (context.config.width > 0 && context.config.height > 0) {
      contextInfo.push(`Display size: ${context.config.width}${context.config.unit || 'mm'} × ${context.config.height}${context.config.unit || 'mm'}`);
    }
    if (context.config.environment) {
      contextInfo.push(`Environment: ${context.config.environment}`);
    }
    if (context.config.viewingDistance) {
      contextInfo.push(`Viewing distance: ${context.config.viewingDistance} ${context.config.viewingDistanceUnit || 'meters'}`);
    }
    if (context.config.pixelPitch) {
      contextInfo.push(`Pixel pitch: P${context.config.pixelPitch}`);
    }
    if (context.selectedProduct) {
      contextInfo.push(`Selected product: ${context.selectedProduct.name}`);
    }
    if (context.workflowStage) {
      contextInfo.push(`Current stage: ${context.workflowStage}`);
    }
    if (context.currentStep) {
      contextInfo.push(`Current step: ${context.currentStep}`);
    }

    const systemPrompt = `You are a helpful LED display configuration assistant. You help users configure LED displays by:
- Recommending products based on viewing distance, environment, and screen size
- Explaining technical terms like pixel pitch, viewing distance, brightness
- Guiding users through the configuration process
- Detecting and helping fix configuration issues

Current context: ${contextInfo.length > 0 ? contextInfo.join(', ') : 'No configuration set yet'}

Be concise, helpful, and accurate. Use markdown formatting for emphasis. If the user asks about products, viewing distance, or pixel pitch, provide specific recommendations based on the context.`;

    const conversationParts: any[] = [];
    
    // Add system context as first message
    if (contextInfo.length > 0) {
      conversationParts.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      conversationParts.push({
        role: 'model',
        parts: [{ text: 'I understand. I\'ll help you configure your LED display based on the current context.' }]
      });
    }
    
    // Add conversation history
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        conversationParts.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        conversationParts.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    // Add current user message
    conversationParts.push({ role: 'user', parts: [{ text: userMessage }] });

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: conversationParts,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.debug('Gemini API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    
    // Check for API errors
    if (data.error) {
      console.debug('Gemini API returned error:', data.error);
      return null;
    }
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (generatedText && generatedText.trim().length > 10) {
      return generatedText.trim();
    }

    return null;
  } catch (error) {
    console.debug('Error calling Gemini API:', error);
    return null;
  }
}

/**
 * Generate AI-powered response
 */
export async function generateChatbotResponse(
  userMessage: string,
  context: ChatbotContext
): Promise<ChatMessage> {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Detect errors first
  const errors = detectErrors(context);
  
  // CRITICAL: Check for "choose" FIRST before calling generateRuleBasedResponse
  // This ensures we never generate recommendations for "choose"
  const lowerMessage = userMessage.toLowerCase().trim();
  if (lowerMessage === 'choose' || lowerMessage === 'select' || lowerMessage === 'pick') {
    console.log('[generateChatbotResponse] ⚠️ User said "choose" - returning early, NOT generating recommendations');
    const { config, selectedProduct, workflowStage } = context;
    let chooseResponse = '';
    if (workflowStage === 'wizard') {
      chooseResponse = `What would you like to choose?\n\n- **Product** - Select a product for your display\n- **Pixel Pitch** - Choose the pixel pitch\n- **Environment** - Select Indoor or Outdoor\n- **Dimensions** - Set your display size\n\nOr tell me what you need help with!`;
    } else if (workflowStage === 'configurator') {
      if (!selectedProduct) {
        chooseResponse = `What would you like to choose?\n\n- **Product** - Select a product for your display\n- **Dimensions** - Adjust your display size\n\nOr ask me for product recommendations based on your requirements!`;
      } else {
        chooseResponse = `You've already selected **${selectedProduct.name}**. What would you like to do next?\n\n- **Change product** - Select a different product\n- **Configure wiring** - Set up data and power connections\n- **Generate quote** - Get pricing information\n- **Adjust dimensions** - Modify display size`;
      }
    } else {
      chooseResponse = `What would you like to choose or configure?\n\n- **Start Configuration** - I'll guide you step-by-step\n- **Choose Product** - Select a product directly\n- **Get Recommendations** - Tell me your requirements and I'll suggest products\n\nWhat would you like to do?`;
    }
    
    return {
      id: messageId,
      role: 'assistant',
      content: chooseResponse,
      timestamp: new Date(),
      metadata: {
        suggestedActions: undefined,
        detectedErrors: errors.length > 0 ? errors : undefined,
        workflowStep: context.currentStep,
      },
    };
  }
  
  // Generate rule-based response
  let content = generateRuleBasedResponse(userMessage, context);
  
  // Debug: Log what response we got
  console.log('[generateChatbotResponse] Rule-based response for:', userMessage);
  console.log('[generateChatbotResponse] Response preview:', content.substring(0, 150));
  console.log('[generateChatbotResponse] Response length:', content.length);
  
  // CRITICAL: DISABLE AI ENHANCEMENT COMPLETELY
  // AI enhancement was causing repetitive responses
  // Rule-based responses are more accurate and consistent
  console.log('[generateChatbotResponse] Using rule-based response only (AI enhancement disabled to prevent repetitive responses)');
  
  // AI enhancement is disabled to ensure:
  // 1. Responses are always based on user's actual input
  // 2. No repetitive AI-generated responses
  // 3. Consistent, accurate rule-based logic

  // Add proactive error detection if not already mentioned
  if (errors.length > 0 && !content.toLowerCase().includes('issue') && !content.toLowerCase().includes('error') && !content.toLowerCase().includes('detected')) {
    content += `\n\n⚠️ **Important**: I noticed ${errors.length > 1 ? 'some issues' : 'an issue'}:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}\n\nWould you like help fixing ${errors.length > 1 ? 'these' : 'this'}?`;
  }

  // Determine suggested actions based on context
  const suggestedActions: string[] = [];
  if (context.workflowStage === 'landing') {
    suggestedActions.push('Start Configuration Wizard', 'Choose Product Directly');
  } else if (context.workflowStage === 'wizard') {
    if (context.currentStep === 'dimensions') {
      suggestedActions.push('Enter dimensions', 'Choose unit');
    } else if (context.currentStep === 'product') {
      suggestedActions.push('View product details', 'Compare products');
    }
  }

  return {
    id: messageId,
    role: 'assistant',
    content,
    timestamp: new Date(),
    metadata: {
      suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
      detectedErrors: errors.length > 0 ? errors : undefined,
      workflowStep: context.currentStep,
    },
  };
}

/**
 * Get proactive suggestions based on current state
 */
export function getProactiveSuggestions(context: ChatbotContext): string[] {
  const suggestions: string[] = [];
  const { config, workflowStage, selectedProduct } = context;

  if (workflowStage === 'landing') {
    suggestions.push('Start with the Configuration Wizard for step-by-step guidance');
    suggestions.push('Or choose a product directly if you already know what you need');
  }

  if (workflowStage === 'wizard') {
    if (!config.width || !config.height) {
      suggestions.push('Set your display dimensions to continue');
    } else if (!config.environment) {
      suggestions.push('Select Indoor or Outdoor environment');
    } else if (!selectedProduct) {
      suggestions.push('Choose a product that matches your requirements');
    }
  }

  if (workflowStage === 'configurator' && !selectedProduct) {
    suggestions.push('Select a product to see the preview and configuration options');
  }

  return suggestions;
}

