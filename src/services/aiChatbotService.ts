/**
 * AI Chatbot Service
 * 
 * Intelligent rule-based recommendation assistant for LED Screen Configurator
 * with high-accuracy recommendation engine and NLP question answering
 */

import { DisplayConfigState } from '../contexts/DisplayConfigContext';
import { Product } from '../types';
import { products } from '../data/products';

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
  config: DisplayConfigState;
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
// ====================================================

/**
 * Recommend pixel pitch based on environment
 */
export function recommendPixelPitchByEnvironment(environment: 'Indoor' | 'Outdoor' | null): number[] {
  if (!environment) return [];
  
  if (environment === 'Indoor') {
    return [0.9, 1.2, 1.5, 2.5];
  } else { // Outdoor
    return [3.9, 4.8, 6.6];
  }
}

/**
 * Recommend pixel pitch based on viewing distance
 * Rules: 0-8 ft → 0.9-1.5mm, 8-20 ft → 1.5-2.5mm, 20+ ft → 3.9-6.6mm
 */
export function recommendPixelPitchByViewingDistance(
  viewingDistance: string | null,
  unit: 'meters' | 'feet'
): number[] {
  if (!viewingDistance) return [];
  
  const distance = parseFloat(viewingDistance);
  if (isNaN(distance)) return [];
  
  // Convert to feet (all rules are in feet)
  const distanceFt = unit === 'meters' ? distance * 3.28084 : distance;
  
  if (distanceFt <= 8) {
    // Near viewing (0-8 ft) → 0.9-1.5mm
    return [0.9, 1.2, 1.5];
  } else if (distanceFt <= 20) {
    // Medium viewing (8-20 ft) → 1.5-2.5mm
    return [1.5, 2.5];
  } else {
    // Far viewing (20+ ft) → 3.9-6.6mm
    return [3.9, 4.8, 6.6];
  }
}

/**
 * Recommend pixel pitch based on screen size
 */
export function recommendPixelPitchByScreenSize(width: number, height: number, unit: 'mm' | 'cm' | 'm' | 'ft'): number[] {
  if (width <= 0 || height <= 0) return [];
  
  // Convert to feet for size calculation
  let widthFt: number;
  if (unit === 'mm') widthFt = width / 304.8;
  else if (unit === 'cm') widthFt = width / 30.48;
  else if (unit === 'm') widthFt = width * 3.28084;
  else widthFt = width;
  
  if (widthFt <= 6) {
    // Small screen (≤ 6ft width)
    return [0.9, 1.2, 1.5];
  } else if (widthFt <= 12) {
    // Medium screen (6-12ft width)
    return [1.5, 2.5];
  } else {
    // Large screen (12ft+ width)
    return [3.9, 4.8, 6.6];
  }
}

/**
 * Recommend product series based on pixel pitch
 */
export function recommendProductSeriesByPixelPitch(pixelPitch: number | null): string[] {
  if (!pixelPitch) return [];
  
  if (pixelPitch >= 0.9 && pixelPitch <= 2.5) {
    return ['Rigel Series'];
  } else if (pixelPitch >= 1.9 && pixelPitch <= 3.9) {
    return ['Betel Series'];
  } else if (pixelPitch >= 3.9 && pixelPitch <= 6.6) {
    return ['Bellatrix Series'];
  }
  
  return [];
}

/**
 * Get suitable use case for product series
 */
export function getUseCaseForProductSeries(series: string): string {
  const useCases: Record<string, string> = {
    'Rigel Series': 'Indoor Fine Pitch displays - ideal for close viewing in retail stores, showrooms, and indoor venues',
    'Betel Series': 'Indoor and Outdoor Mid Pitch displays - suitable for medium viewing distances in malls, lobbies, and outdoor installations',
    'Bellatrix Series': 'Outdoor Large Pitch displays - perfect for billboards, stadiums, and large outdoor displays with far viewing distances'
  };
  
  return useCases[series] || 'General LED display applications';
}

/**
 * Get comprehensive recommendation based on all factors
 */
export function getComprehensiveRecommendation(context: ChatbotContext): {
  pixelPitch: number[];
  productSeries: string[];
  reasoning: string;
} {
  const { config } = context;
  const recommendations: number[] = [];
  const reasoning: string[] = [];
  
  // Environment-based recommendation
  if (config.environment) {
    const envRec = recommendPixelPitchByEnvironment(config.environment);
    recommendations.push(...envRec);
    reasoning.push(`For ${config.environment} environment, recommended pixel pitches are: ${envRec.join('mm, ')}mm`);
  }
  
  // Viewing distance-based recommendation
  if (config.viewingDistance) {
    const distRec = recommendPixelPitchByViewingDistance(config.viewingDistance, config.viewingDistanceUnit);
    if (distRec.length > 0) {
      recommendations.push(...distRec);
      reasoning.push(`For viewing distance of ${config.viewingDistance} ${config.viewingDistanceUnit}, recommended pixel pitches are: ${distRec.join('mm, ')}mm`);
    }
  }
  
  // Screen size-based recommendation
  if (config.width > 0 && config.height > 0) {
    const sizeRec = recommendPixelPitchByScreenSize(config.width, config.height, config.unit);
    if (sizeRec.length > 0) {
      recommendations.push(...sizeRec);
      reasoning.push(`For your screen size, recommended pixel pitches are: ${sizeRec.join('mm, ')}mm`);
    }
  }
  
  // Get unique recommendations
  const uniqueRec = Array.from(new Set(recommendations)).sort((a, b) => a - b);
  
  // Get product series recommendations
  const productSeries: string[] = [];
  if (config.pixelPitch) {
    const series = recommendProductSeriesByPixelPitch(config.pixelPitch);
    productSeries.push(...series);
  } else if (uniqueRec.length > 0) {
    // Recommend series for the first recommended pitch
    const series = recommendProductSeriesByPixelPitch(uniqueRec[0]);
    productSeries.push(...series);
  }
  
  return {
    pixelPitch: uniqueRec,
    productSeries: Array.from(new Set(productSeries)),
    reasoning: reasoning.join('. ')
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
  
  // Extract environment (including Hindi context words)
  if (lowerMessage.match(/\b(indoor|inside|mall|shop|store|office|restaurant|andar|andarooni)\b/)) {
    extracted.environment = 'Indoor';
  } else if (lowerMessage.match(/\b(outdoor|outside|outdoor|billboard|stadium|facade|bahar|bahari)\b/)) {
    extracted.environment = 'Outdoor';
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
  
  return extracted;
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
        const rec = recommendPixelPitchByEnvironment(config.environment);
        if (rec.length > 0) {
          return `For **${config.environment}** environment, I recommend pixel pitches: **${rec.join('mm, ')}mm**. These are optimized for ${config.environment.toLowerCase()} installations.`;
        }
      }
      return null;
    }
    
    case 'viewingDistance': {
      if (config.viewingDistance) {
        const rec = recommendPixelPitchByViewingDistance(config.viewingDistance, config.viewingDistanceUnit);
        if (rec.length > 0) {
          const distanceText = `${config.viewingDistance} ${config.viewingDistanceUnit}`;
          return `For viewing distance of **${distanceText}**, the recommended pixel pitch is **${rec.join('mm, ')}mm**. This ensures optimal image quality at this distance.`;
        }
      }
      return null;
    }
    
    case 'pixelPitch': {
      if (config.pixelPitch) {
        const series = recommendProductSeriesByPixelPitch(config.pixelPitch);
        if (series.length > 0) {
          const useCase = getUseCaseForProductSeries(series[0]);
          return `The best matching product series for **${config.pixelPitch}mm** pixel pitch is **${series[0]}**. ${useCase}.`;
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
  const lowerMessage = userMessage.toLowerCase();
  const extracted = extractValuesFromMessage(userMessage);
  
  // Handle questions with extracted values - PRIORITY: Answer specific questions accurately
  if (extracted.size || extracted.environment || extracted.distance || extracted.pixelPitch) {
    let response = '';
    const recommendations: number[] = [];
    const productSeries: string[] = [];
    
    // Size-based recommendation (e.g., "Meri screen 10x6 ft hai, kya pixel pitch hoga?")
    if (extracted.size && extracted.size.width) {
      const width = extracted.size.width;
      const height = extracted.size.height || width; // Assume square if height not provided
      const unit = extracted.size.unit || 'm';
      
      // Convert to mm for calculation
      let widthMM = width;
      if (unit === 'cm') widthMM = width * 10;
      else if (unit === 'm') widthMM = width * 1000;
      else if (unit === 'ft') widthMM = width * 304.8;
      
      const rec = recommendPixelPitchByScreenSize(widthMM, height * (widthMM / width), 'mm');
      if (rec.length > 0) {
        recommendations.push(...rec);
        const sizeText = height ? `${width}${unit === 'ft' ? 'ft' : unit === 'm' ? 'm' : unit} × ${height}${unit === 'ft' ? 'ft' : unit === 'm' ? 'm' : unit}` : `${width}${unit === 'ft' ? 'ft' : unit === 'm' ? 'm' : unit}`;
        response += `आपकी screen size (${sizeText}) के लिए, मैं recommend करता हूं pixel pitch: **${rec.join('mm, ')}mm**. `;
      }
    }
    
    // Environment-based recommendation
    if (extracted.environment) {
      const rec = recommendPixelPitchByEnvironment(extracted.environment);
      if (rec.length > 0) {
        recommendations.push(...rec);
        response += `**${extracted.environment}** environment के लिए, recommended pixel pitches हैं: **${rec.join('mm, ')}mm**. `;
      }
    }
    
    // Distance-based recommendation (e.g., "Audience 15 ft door hoga, kya pitch select karein?")
    if (extracted.distance) {
      const rec = recommendPixelPitchByViewingDistance(
        extracted.distance.value.toString(),
        extracted.distance.unit
      );
      if (rec.length > 0) {
        recommendations.push(...rec);
        const distanceText = `${extracted.distance.value} ${extracted.distance.unit === 'feet' ? 'ft' : 'm'}`;
        response += `${distanceText} viewing distance के लिए, मैं recommend करता हूं pixel pitch: **${rec.join('mm, ')}mm**. `;
      }
    }
    
    // Pixel pitch to product series (e.g., "1.2mm indoor ke liye best model kaun sa hai?")
    if (extracted.pixelPitch) {
      const series = recommendProductSeriesByPixelPitch(extracted.pixelPitch);
      if (series.length > 0) {
        productSeries.push(...series);
        const useCase = getUseCaseForProductSeries(series[0]);
        
        // Find matching products
        const matchingProducts = products.filter(p => 
          p.enabled !== false && 
          Math.abs(p.pixelPitch - extracted.pixelPitch!) < 0.1 &&
          (!extracted.environment || p.environment?.toLowerCase() === extracted.environment.toLowerCase())
        );
        
        if (matchingProducts.length > 0) {
          const productList = matchingProducts.slice(0, 3).map(p => 
            `- **${p.name}**: ${p.pixelPitch}mm pitch, ${p.environment}`
          ).join('\n');
          response += `**${extracted.pixelPitch}mm** pixel pitch के लिए, best product series है **${series[0]}**. ${useCase}.\n\nAvailable products:\n${productList}`;
        } else {
          response += `**${extracted.pixelPitch}mm** pixel pitch के लिए, मैं recommend करता हूं **${series[0]}**. ${useCase}.`;
        }
      }
    }
    
    // Combined recommendation (e.g., "Outdoor long viewing ke liye kaunsa product?")
    if (extracted.environment && extracted.distance && !extracted.pixelPitch && !response) {
      // Get pitch recommendations
      const envRec = recommendPixelPitchByEnvironment(extracted.environment);
      const distRec = recommendPixelPitchByViewingDistance(
        extracted.distance.value.toString(),
        extracted.distance.unit
      );
      
      // Find intersection (pitches that match both environment and distance)
      const combinedRec = envRec.filter(p => distRec.includes(p));
      const finalRec = combinedRec.length > 0 ? combinedRec : [...new Set([...envRec, ...distRec])].sort((a, b) => a - b);
      
      if (finalRec.length > 0) {
        // Get product series for recommended pitches
        const allSeries: string[] = [];
        finalRec.forEach(pitch => {
          const series = recommendProductSeriesByPixelPitch(pitch);
          allSeries.push(...series);
        });
        const uniqueSeries = Array.from(new Set(allSeries));
        
        if (uniqueSeries.length > 0) {
          // Find products matching environment and recommended pitches
          const matchingProducts = products.filter(p => 
            p.enabled !== false && 
            p.environment?.toLowerCase() === extracted.environment!.toLowerCase() &&
            finalRec.some(pitch => Math.abs(p.pixelPitch - pitch) < 0.1)
          );
          
          if (matchingProducts.length > 0) {
            const productList = matchingProducts.slice(0, 5).map(p => 
              `- **${p.name}**: ${p.pixelPitch}mm pitch`
            ).join('\n');
            response += `${extracted.environment} environment और ${extracted.distance.value} ${extracted.distance.unit === 'feet' ? 'ft' : 'm'} viewing distance के लिए:\n\n**Recommended Pixel Pitch**: ${finalRec.join('mm, ')}mm\n**Recommended Product Series**: ${uniqueSeries.join(', ')}\n\n**Available Products**:\n${productList}`;
          } else {
            response += `${extracted.environment} environment और ${extracted.distance.value} ${extracted.distance.unit === 'feet' ? 'ft' : 'm'} viewing distance के लिए, recommended pixel pitch है: **${finalRec.join('mm, ')}mm**. Product series: **${uniqueSeries.join(', ')}**.`;
          }
        } else {
          response += `${extracted.environment} environment और ${extracted.distance.value} ${extracted.distance.unit === 'feet' ? 'ft' : 'm'} viewing distance के लिए, recommended pixel pitch है: **${finalRec.join('mm, ')}mm**.`;
        }
      }
    }
    
    // If we have recommendations but no specific response yet
    if (!response && recommendations.length > 0) {
      const uniqueRec = Array.from(new Set(recommendations)).sort((a, b) => a - b);
      response = `मैं recommend करता हूं pixel pitch: **${uniqueRec.join('mm, ')}mm**.`;
    }
    
    if (response) {
      return response.trim();
    }
  }
  
  // Product keyword search
  if (extracted.productKeywords && extracted.productKeywords.length > 0) {
    const matchingProducts = products.filter(p => 
      p.enabled !== false && 
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

  // Technical Questions - Pixel Pitch
  if (lowerMessage.includes('pixel pitch') || lowerMessage.includes('what is pixel pitch')) {
    const { config } = context;
    let response = `**Pixel Pitch** is the distance between the centers of two adjacent LED pixels, measured in millimeters (mm).

**Key Points:**
- **Smaller pitch** (0.9mm, 1.2mm, 1.5mm) = Higher resolution, better image quality for close viewing
- **Larger pitch** (3.9mm, 4.8mm, 6.6mm) = Lower resolution, cost-effective for distant viewing

**Recommendations:**
- **Indoor**: 0.9mm, 1.2mm, 1.5mm, 2.5mm
- **Outdoor**: 3.9mm, 4.8mm, 6.6mm
- **Near viewing (0-8 ft)**: 0.9mm-1.5mm
- **Medium viewing (8-20 ft)**: 1.5mm-2.5mm
- **Far viewing (20+ ft)**: 3.9mm-6.6mm`;

    if (config.environment || config.viewingDistance) {
      const rec = getComprehensiveRecommendation(context);
      if (rec.pixelPitch.length > 0) {
        response += `\n\n**For your configuration**, I recommend: **${rec.pixelPitch.join('mm, ')}mm**. ${rec.reasoning}`;
      }
    }

    return response;
  }

  // Technical Questions - Viewing Distance
  if (lowerMessage.includes('viewing distance') || lowerMessage.includes('what is viewing distance')) {
    return `**Viewing Distance** is how far viewers will typically be positioned from the LED display.

**Recommendations by Distance:**
- **Near viewing (0-8 ft / 0-2.4m)**: Use 0.9mm-1.5mm pixel pitch
- **Medium viewing (8-20 ft / 2.4-6m)**: Use 1.5mm-2.5mm pixel pitch
- **Far viewing (20+ ft / 6m+)**: Use 3.9mm-6.6mm pixel pitch

**Examples:**
- Retail stores: 3-5 meters → 0.9mm-1.5mm
- Shopping malls: 5-10 meters → 1.5mm-2.5mm
- Stadiums/Billboards: 20+ meters → 3.9mm-6.6mm

What's the viewing distance for your installation?`;
  }

  // Product selection help
  if (lowerMessage.includes('product') || lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
    const { config, selectedProduct } = context;
    
    if (selectedProduct) {
      return `You've selected: **${selectedProduct.name}**
- Pixel Pitch: ${selectedProduct.pixelPitch}mm
- Environment: ${selectedProduct.environment}
- Brightness: ${selectedProduct.brightness} cd/m²
- Category: ${selectedProduct.category}

This product is suitable for your configuration!`;
    }
    
    const rec = getComprehensiveRecommendation(context);
    if (rec.pixelPitch.length > 0 || rec.productSeries.length > 0) {
      let response = 'Based on your configuration, I recommend:\n\n';
      if (rec.pixelPitch.length > 0) {
        response += `**Pixel Pitch**: ${rec.pixelPitch.join('mm, ')}mm\n`;
      }
      if (rec.productSeries.length > 0) {
        response += `**Product Series**: ${rec.productSeries.join(', ')}\n`;
        rec.productSeries.forEach(series => {
          response += `- ${series}: ${getUseCaseForProductSeries(series)}\n`;
        });
      }
      return response;
    }
    
    return `To recommend products, I need:
1. Environment (Indoor/Outdoor)
2. Viewing distance
3. Screen size (optional)

Please provide these details, or use the configuration wizard!`;
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
  
  // Default helpful response with context
  const defaultHelp = 'I\'m here to help you configure your LED display! I can assist with:\n\n- Step-by-step guidance through the configuration process\n- Product recommendations based on your needs\n- Error detection and troubleshooting\n- Technical explanations in simple terms';
  
  let response = contextSpecificHelp || defaultHelp;
  
  if (errors.length > 0) {
    response += `\n\n⚠️ **Issues Detected:**\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\nWould you like help fixing these?`;
  }
  
  response += '\n\nWhat specific help do you need right now?';
  
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
      const recommendedPitches = recommendPixelPitchByViewingDistance(config.viewingDistance, config.viewingDistanceUnit);
      
      if (recommendedPitches.length > 0 && !recommendedPitches.some(p => Math.abs(p - config.pixelPitch!) < 0.1)) {
        errors.push(`Viewing distance (${config.viewingDistance} ${config.viewingDistanceUnit}) may not match ${config.pixelPitch}mm pixel pitch. Recommended pitches for this distance: ${recommendedPitches.join('mm, ')}mm.`);
      }
    }
  }

  return errors;
}

/**
 * Call Gemini API to generate AI response (fallback)
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

    const conversationParts: any[] = [];
    
    let firstUserMessage = true;
    
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        conversationParts.push({ role: 'user', parts: [{ text: msg.content }] });
        firstUserMessage = false;
      } else if (msg.role === 'assistant') {
        conversationParts.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

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
      return null;
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (generatedText) {
      return generatedText.trim();
    }

    return null;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
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
  
  // Try AI first, fall back to rule-based
  let content = await callGeminiAPI(userMessage, context);
  
  if (!content) {
    content = generateRuleBasedResponse(userMessage, context);
  }

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
