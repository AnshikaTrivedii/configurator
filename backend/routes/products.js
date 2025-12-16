import express from 'express';

const router = express.Router();

// Available pixel pitches in the product catalog
const AVAILABLE_PIXEL_PITCHES = [
  0.9375, 1.25, 1.5, 1.5625, 1.86, 2.5, 3, 4, 6.6, 10
];

/**
 * Normalize pixel pitch string to number
 * Converts strings like "P1.5625mm", "1.5625", "P1.8mm" to numeric values
 */
function normalize(pitch) {
  if (!pitch) return null;
  
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
 */
function getRecommendedPixelPitch(distance, unit) {
  // Convert distance to meters
  const distanceInMeters = unit === 'feet' ? distance * 0.3048 : distance;
  
  // Determine ideal pixel pitch range based on distance
  let idealMin, idealMax;
  
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
 */
function getRecommendedPixelPitchForRange(distanceRange, unit) {
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
 * Filter products based on guided mode and recommended pixel pitch
 * 
 * @param {Array} products - Array of product objects
 * @param {boolean} guidedMode - Whether user is in guided mode
 * @param {string|number|null} recommendedPixelPitch - Recommended pixel pitch to filter by
 * @returns {Array} Filtered products array
 */
function filterProductsByPixelPitch(products, guidedMode, recommendedPixelPitch) {
  if (!Array.isArray(products)) {
    return [];
  }
  
  // If not in guided mode or no recommended pitch, return all products
  if (!guidedMode || !recommendedPixelPitch) {
    return products;
  }
  
  // Normalize the recommended pitch
  const normalizedRecommendedPitch = normalize(recommendedPixelPitch);
  if (normalizedRecommendedPitch === null) {
    return products;
  }
  
  // Filter products to match the recommended pixel pitch
  return products.filter(product => {
    if (!product || product.pixelPitch === undefined || product.pixelPitch === null) {
      return false;
    }
    
    const productPitch = normalize(product.pixelPitch);
    if (productPitch === null) {
      return false;
    }
    
    // Strict matching with small tolerance (0.1mm) for exact matches
    return Math.abs(productPitch - normalizedRecommendedPitch) < 0.1;
  });
}

/**
 * GET /api/products
 * Get products with optional filtering
 * 
 * Query parameters:
 * - guidedMode: boolean (true/false) - Whether user is in guided mode
 * - recommendedPixelPitch: string|number - Recommended pixel pitch to filter by
 * - products: JSON string (optional) - Products array to filter (if not provided, returns empty array)
 * 
 * Note: Since products are currently loaded from frontend data file,
 * this endpoint is designed to filter products passed in the request body
 * or as a utility for future use when products are stored in backend.
 */
router.get('/', (req, res) => {
  try {
    const { guidedMode, recommendedPixelPitch } = req.query;
    
    // Parse guidedMode from query string
    const isGuidedMode = guidedMode === 'true' || guidedMode === true;
    
    // Get products from request body (if provided) or return empty array
    // In the future, this could load from a database
    let products = [];
    
    // If products are passed in query as JSON string, parse them
    if (req.query.products) {
      try {
        products = typeof req.query.products === 'string' 
          ? JSON.parse(req.query.products) 
          : req.query.products;
      } catch (e) {
        console.error('Error parsing products from query:', e);
        return res.status(400).json({
          success: false,
          message: 'Invalid products data in query parameter'
        });
      }
    }
    
    // Apply filtering if in guided mode with recommended pixel pitch
    let filteredProducts = products;
    if (isGuidedMode && recommendedPixelPitch) {
      filteredProducts = filterProductsByPixelPitch(
        products,
        isGuidedMode,
        recommendedPixelPitch
      );
    }
    
    res.json({
      success: true,
      products: filteredProducts,
      total: filteredProducts.length,
      filters: {
        guidedMode: isGuidedMode,
        recommendedPixelPitch: recommendedPixelPitch || null,
        applied: isGuidedMode && recommendedPixelPitch
      }
    });
  } catch (error) {
    console.error('Error in products endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * POST /api/products/filter
 * Filter products based on guided mode and recommended pixel pitch
 * 
 * Request body:
 * {
 *   products: Array<Product>,
 *   guidedMode: boolean,
 *   recommendedPixelPitch: string|number|null
 * }
 */
router.post('/filter', (req, res) => {
  try {
    const { products, guidedMode, recommendedPixelPitch } = req.body;
    
    if (!Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        message: 'Products must be an array'
      });
    }
    
    // Apply filtering
    const filteredProducts = filterProductsByPixelPitch(
      products,
      guidedMode || false,
      recommendedPixelPitch || null
    );
    
    res.json({
      success: true,
      products: filteredProducts,
      total: filteredProducts.length,
      originalTotal: products.length,
      filters: {
        guidedMode: guidedMode || false,
        recommendedPixelPitch: recommendedPixelPitch || null,
        applied: guidedMode && recommendedPixelPitch
      }
    });
  } catch (error) {
    console.error('Error in products filter endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

export default router;

