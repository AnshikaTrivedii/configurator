import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Package } from 'lucide-react';
import { Product } from '../types';
import { products } from '../data/products';
import { getViewingDistanceOptionsByUnit, getPixelPitchesForViewingDistanceRange, getPixelPitchForViewingDistanceRange } from '../utils/viewingDistanceRanges';
import { useDisplayConfig } from '../contexts/DisplayConfigContext';
import { normalize, getRecommendedPixelPitchForRange, AVAILABLE_PIXEL_PITCHES } from '../utils/pixelPitchRecommendation';

interface ConfigurationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: {
    width: number;
    height: number;
    unit: 'mm' | 'cm' | 'm' | 'ft';
    viewingDistance: string;
    viewingDistanceUnit: 'meters' | 'feet';
    environment: 'Indoor' | 'Outdoor';
    pixelPitch: number | null;
    selectedProduct: Product | null;
  }) => void;
}

type Step = 'dimensions' | 'viewingDistance' | 'environment' | 'pixelPitch' | 'product';

export const ConfigurationWizard: React.FC<ConfigurationWizardProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { updateDimensions, updateConfig } = useDisplayConfig();
  const [currentStep, setCurrentStep] = useState<Step>('environment');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [unit, setUnit] = useState<'mm' | 'cm' | 'm' | 'ft'>('m');
  const [viewingDistance, setViewingDistance] = useState<string>('');
  const [viewingDistanceUnit, setViewingDistanceUnit] = useState<'meters' | 'feet'>('meters');
  const [environment, setEnvironment] = useState<'Indoor' | 'Outdoor' | ''>('');
  const [pixelPitch, setPixelPitch] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [hasSkippedPixelPitch, setHasSkippedPixelPitch] = useState<boolean>(false);

  const steps: { key: Step; label: string }[] = [
    { key: 'environment', label: 'Environment' },
    { key: 'viewingDistance', label: 'Viewing Distance' },
    { key: 'pixelPitch', label: 'Pixel Pitch' },
    { key: 'dimensions', label: 'Dimensions' },
    { key: 'product', label: 'Product' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  // Reset wizard when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('environment');
      setWidth('');
      setHeight('');
      setUnit('m');
      setViewingDistance('');
      setViewingDistanceUnit('meters');
      setEnvironment('');
      setPixelPitch(null);
      setSelectedProduct(null);
      setHasSkippedPixelPitch(false);
    }
  }, [isOpen]);

  // Convert dimensions to mm with high precision
  const convertToMM = (value: number, fromUnit: 'mm' | 'cm' | 'm' | 'ft'): number => {
    switch (fromUnit) {
      case 'mm': return value;
      case 'cm': return value * 10;
      case 'm': return value * 1000;
      case 'ft': return value * 304.8; // Exact conversion: 1 ft = 304.8 mm
      default: return value;
    }
  };
  
  // Convert mm back to original unit for verification
  const convertFromMM = (mm: number, toUnit: 'mm' | 'cm' | 'm' | 'ft'): number => {
    switch (toUnit) {
      case 'mm': return mm;
      case 'cm': return mm / 10;
      case 'm': return mm / 1000;
      case 'ft': return mm / 304.8; // Exact conversion: 1 ft = 304.8 mm
      default: return mm;
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1].key;
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1].key;
      setCurrentStep(prevStep);
    }
  };

  const handleComplete = () => {
    if (selectedProduct && width && height) {
      const widthValue = parseFloat(width);
      const heightValue = parseFloat(height);
      const widthMM = convertToMM(widthValue, unit);
      const heightMM = convertToMM(heightValue, unit);
      
      // Verify conversion accuracy
      const widthBack = convertFromMM(widthMM, unit);
      const heightBack = convertFromMM(heightMM, unit);
      
      // Validate product matches wizard selections
      const productEnv = selectedProduct.environment?.toLowerCase().trim();
      const selectedEnv = environment?.toLowerCase().trim();
      const envMatch = !environment || productEnv === selectedEnv;
      
      const pitchMatch = pixelPitch === null || Math.abs(selectedProduct.pixelPitch - pixelPitch) < 0.3;
      
      if (!envMatch) {
        console.warn('⚠️ Product environment mismatch:', {
          selected: environment,
          product: selectedProduct.environment,
          productName: selectedProduct.name
        });
      }
      
      if (!pitchMatch) {
        console.warn('⚠️ Product pixel pitch mismatch:', {
          selected: pixelPitch,
          product: selectedProduct.pixelPitch,
          productName: selectedProduct.name
        });
      }
      
      console.log('🎯 Wizard Complete - Passing data:', {
        dimensions: {
        originalWidth: widthValue,
        originalHeight: heightValue,
        originalUnit: unit,
        widthMM,
        heightMM,
        widthBack: widthBack.toFixed(4),
        heightBack: heightBack.toFixed(4),
        widthMatch: Math.abs(widthValue - widthBack) < 0.0001,
        heightMatch: Math.abs(heightValue - heightBack) < 0.0001
        },
        filters: {
          environment,
          viewingDistance,
          viewingDistanceUnit,
          pixelPitch
        },
        product: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          environment: selectedProduct.environment,
          pixelPitch: selectedProduct.pixelPitch,
          envMatch,
          pitchMatch
        }
      });
      
      onComplete({
        width: widthMM,
        height: heightMM,
        unit,
        viewingDistance,
        viewingDistanceUnit,
        environment: environment as 'Indoor' | 'Outdoor',
        pixelPitch,
        selectedProduct
      });
      onClose();
    }
  };

  // Sync width/height with global context
  useEffect(() => {
    if (!isOpen) return;
    if (!width || !height) return;

    const widthValue = parseFloat(width);
    const heightValue = parseFloat(height);
    if (isNaN(widthValue) || isNaN(heightValue)) return;

    const widthMM = convertToMM(widthValue, unit);
    const heightMM = convertToMM(heightValue, unit);
    updateDimensions(widthMM, heightMM, unit);
  }, [width, height, unit, isOpen, updateDimensions]);

  // Sync environment
  useEffect(() => {
    if (!isOpen) return;
    updateConfig({
      environment: environment ? (environment as 'Indoor' | 'Outdoor') : null
    });
  }, [environment, isOpen, updateConfig]);

  // Sync viewing distance selections
  useEffect(() => {
    if (!isOpen) return;
    updateConfig({
      viewingDistance: viewingDistance || null,
      viewingDistanceUnit
    });
  }, [viewingDistance, viewingDistanceUnit, isOpen, updateConfig]);

  // Sync pixel pitch selection
  useEffect(() => {
    if (!isOpen) return;
    updateConfig({
      pixelPitch: pixelPitch ?? null
    });
  }, [pixelPitch, isOpen, updateConfig]);

  const canProceed = () => {
    switch (currentStep) {
      case 'dimensions':
        return width && height && parseFloat(width) > 0 && parseFloat(height) > 0;
      case 'viewingDistance':
        return viewingDistance !== '';
      case 'environment':
        return environment !== '';
      case 'pixelPitch':
        return true; // Pixel pitch is optional, can proceed without selection
      case 'product':
        return selectedProduct !== null;
      default:
        return false;
    }
  };

  // Get available pixel pitches based on viewing distance and environment
  // Only show pitches from the available product catalog that match environment
  const availablePixelPitches = (() => {
    let pitches: number[] = [];
    
    if (viewingDistance) {
      // Get recommended pitch for viewing distance (only from available catalog)
      const recommendedPitch = getRecommendedPixelPitchForRange(viewingDistance, viewingDistanceUnit);
      if (recommendedPitch !== null) {
        pitches = [recommendedPitch];
      }
    } else {
      // If no viewing distance, get all available pitches from catalog
      pitches = [...AVAILABLE_PIXEL_PITCHES];
    }
    
    // Filter by environment if selected - only show pitches that have products in that environment
    if (environment && pitches.length > 0) {
      const envFilteredPitches = new Set<number>();
      const normalizedEnv = environment.toLowerCase().trim();
      
      pitches.forEach(pitch => {
        // Check if any enabled product with this pitch matches the environment
        const hasMatchingProduct = products.some(product => {
          if (product.enabled === false) return false;
          const productEnv = product.environment?.toLowerCase().trim();
          const productPitch = normalize(product.pixelPitch);
          const targetPitch = normalize(pitch);
          if (productPitch === null || targetPitch === null) return false;
          const pitchMatch = Math.abs(productPitch - targetPitch) < 0.1;
          return pitchMatch && productEnv === normalizedEnv;
        });
        
        if (hasMatchingProduct) {
          envFilteredPitches.add(pitch);
        }
      });
      
      pitches = Array.from(envFilteredPitches).sort((a, b) => a - b);
    }
    
    return pitches;
      })();

  // Calculate recommended pixel pitch from viewing distance (for guided mode filtering)
  const recommendedPixelPitch = (() => {
    if (viewingDistance && !hasSkippedPixelPitch) {
      // Get the recommended pixel pitch for this viewing distance (only from available catalog)
      const recommendedPitch = getRecommendedPixelPitchForRange(viewingDistance, viewingDistanceUnit);
      return recommendedPitch;
    }
    return null;
  })();

  // Filter products based on selections (only enabled products)
  const filteredProducts = products.filter(product => {
    // Only show enabled products
    if (product.enabled === false) return false;
    // Normalize environment for comparison (case-insensitive)
    const productEnv = product.environment?.toLowerCase().trim();
    const selectedEnv = environment?.toLowerCase().trim();
    
    // Filter by environment if selected
    if (environment && productEnv !== selectedEnv) {
      return false;
    }
    
    // GUIDED MODE FILTERING LOGIC:
    // If user explicitly selected a pixel pitch, use it
    if (pixelPitch !== null) {
      const productPitch = normalize(product.pixelPitch);
      const selectedPitch = normalize(pixelPitch);
      if (productPitch === null || selectedPitch === null) return false;
      // Use strict matching with small tolerance (0.1mm) for exact matches
      if (Math.abs(productPitch - selectedPitch) >= 0.1) {
        return false;
      }
    } 
    // If in guided mode and pixel pitch was not selected but not skipped, use recommended pitch
    else if (recommendedPixelPitch !== null && !hasSkippedPixelPitch) {
      const productPitch = normalize(product.pixelPitch);
      const recommendedPitch = normalize(recommendedPixelPitch);
      if (productPitch === null || recommendedPitch === null) return false;
      // Strict filtering: only show products matching the recommended pitch
      if (Math.abs(productPitch - recommendedPitch) >= 0.1) {
        return false;
      }
    }
    // If user clicked "Skip - Show All Products", show all (no pixel pitch filtering)
    // This is handled by the else condition above (no filtering when hasSkippedPixelPitch is true)
    
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Configure Your LED Display</h2>
            <p className="text-blue-100 text-sm mt-1">Step {currentStepIndex + 1} of {steps.length}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.key}>
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      index < currentStepIndex
                        ? 'bg-green-500 text-white'
                        : index === currentStepIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index < currentStepIndex ? <Check size={20} /> : index + 1}
                  </div>
                  <span className={`ml-2 text-sm font-medium hidden sm:block ${
                    index === currentStepIndex ? 'text-blue-600' : index < currentStepIndex ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 transition-all ${
                    index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Environment */}
          {currentStep === 'environment' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select Environment</h3>
                <p className="text-gray-600">Where will the display be installed?</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['Indoor', 'Outdoor'] as const).map((env) => (
                    <button
                    key={env}
                    onClick={() => setEnvironment(env)}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      environment === env
                        ? 'border-blue-600 bg-blue-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                    <div className="text-2xl font-bold mb-2">{env}</div>
                    <div className="text-sm text-gray-600">
                      {env === 'Indoor'
                        ? 'For indoor installations with controlled lighting'
                        : 'For outdoor installations with weather protection'}
                    </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Step 2: Viewing Distance */}
          {currentStep === 'viewingDistance' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select Viewing Distance</h3>
                <p className="text-gray-600">How far will viewers be from the display?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {(['meters', 'feet'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => {
                        setViewingDistanceUnit(u);
                        setViewingDistance('');
                      }}
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${
                        viewingDistanceUnit === u
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {u === 'meters' ? 'Meters' : 'Feet'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Viewing Distance Range</label>
                <select
                  value={viewingDistance}
                  onChange={(e) => setViewingDistance(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select viewing distance...</option>
                  {getViewingDistanceOptionsByUnit(viewingDistanceUnit).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Pixel Pitch */}
          {currentStep === 'pixelPitch' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select Pixel Pitch</h3>
                <p className="text-gray-600">
                  {viewingDistance && environment
                    ? `Based on your ${environment.toLowerCase()} environment and viewing distance, here are recommended pixel pitches`
                    : viewingDistance
                    ? 'Based on your viewing distance, here are recommended pixel pitches'
                    : environment
                    ? `Based on your ${environment.toLowerCase()} environment, here are available pixel pitches`
                    : 'Select a pixel pitch (optional - you can skip to see all products)'}
                </p>
                {/* Warn if previously selected pixel pitch is no longer valid */}
                {pixelPitch !== null && !availablePixelPitches.some(p => Math.abs(p - pixelPitch) < 0.3) && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Your previously selected pixel pitch (P{pixelPitch}mm) may not be available for the current {environment ? `${environment.toLowerCase()} ` : ''}{viewingDistance ? 'viewing distance ' : ''}selection. Please choose a recommended option below or skip to see all products.
                    </p>
                  </div>
                )}
              </div>

              {availablePixelPitches.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {availablePixelPitches.map((pitch) => {
                      // Count products matching this pitch and environment
                      // Use strict matching (0.1mm tolerance) to match the filtering logic
                      const matchingProducts = products.filter(p => {
                        if (p.enabled === false) return false; // Only enabled products
                        const envMatch = !environment || p.environment?.toLowerCase().trim() === environment.toLowerCase().trim();
                        // Use strict matching with 0.1mm tolerance (same as filtering logic)
                        const productPitch = normalize(p.pixelPitch);
                        const targetPitch = normalize(pitch);
                        if (productPitch === null || targetPitch === null) return false;
                        const pitchMatch = Math.abs(productPitch - targetPitch) < 0.1;
                        return envMatch && pitchMatch;
                      });
                      
                      return (
                        <button
                          key={pitch}
                          onClick={() => {
                            setPixelPitch(pitch);
                            setHasSkippedPixelPitch(false);
                          }}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            pixelPitch === pitch
                              ? 'border-blue-600 bg-blue-50 shadow-lg'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-xl font-bold">P{pitch}</div>
                          <div className="text-sm text-gray-600">mm</div>
                          {matchingProducts.length > 0 && (
                            <div className="text-xs text-blue-600 mt-1 font-medium">{matchingProducts.length} available</div>
                          )}
                          {matchingProducts.length === 0 && (
                            <div className="text-xs text-red-500 mt-1">No products</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    {viewingDistance 
                      ? 'No pixel pitches available for this viewing distance'
                      : 'Select viewing distance to see recommended pixel pitches'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Dimensions */}
          {currentStep === 'dimensions' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Enter Display Dimensions</h3>
                <p className="text-gray-600">Specify the width and height of your LED display</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="0"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['mm', 'cm', 'm', 'ft'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${
                        unit === u
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Product Selection */}
          {currentStep === 'product' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select Product</h3>
                <p className="text-gray-600">
                  Choose from available products matching your criteria
                </p>
                {(environment || pixelPitch !== null || viewingDistance) && (
                  <div className="mt-2 text-sm text-blue-600">
                    Filters: {environment && <span className="font-medium">{environment}</span>}
                    {pixelPitch !== null && <span className="ml-2 font-medium">P{pixelPitch}mm</span>}
                    {viewingDistance && <span className="ml-2 font-medium">{viewingDistance} {viewingDistanceUnit}</span>}
                  </div>
                )}
              </div>

              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-2">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`group relative p-0 rounded-xl border-2 transition-all text-left overflow-hidden bg-white hover:shadow-xl flex flex-col ${
                        selectedProduct?.id === product.id
                          ? 'border-blue-600 bg-blue-50 shadow-xl ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      style={{
                        width: '100%',
                        minWidth: '280px',
                        maxWidth: '320px',
                        height: '400px',
                        margin: '0 auto'
                      }}
                    >
                      {/* Product Image */}
                      <div className="relative w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden flex items-center justify-center" style={{ height: '200px', padding: '12px' }}>
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            style={{
                              objectFit: 'contain',
                              width: '100%',
                              maxHeight: '100%'
                            }}
                            onError={(e) => {
                              // Fallback if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100"><div class="text-gray-400 text-sm">Image not available</div></div>';
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                            <Package className="text-gray-400" size={48} />
                          </div>
                        )}
                        {/* Selection Indicator */}
                        {selectedProduct?.id === product.id && (
                          <div className="absolute top-3 right-3 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg z-10">
                            <Check className="text-white" size={24} />
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 flex flex-col p-5">
                        <div className="font-bold text-lg mb-3 text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-600 space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Pixel Pitch:</span>
                            <span className="text-blue-600 font-semibold">P{product.pixelPitch}mm</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Series:</span>
                            <span>{product.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Environment:</span>
                            <span className="capitalize">{product.environment}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    No products found matching your criteria.
                  </div>
                  <div className="text-sm text-gray-400 mb-6">
                    Current filters: {environment || 'Any'} environment, {pixelPitch !== null ? `P${pixelPitch}mm` : 'Any pixel pitch'}
                    {viewingDistance && `, ${viewingDistance} ${viewingDistanceUnit}`}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {pixelPitch !== null && (
                      <button
                        onClick={() => {
                          setPixelPitch(null);
                          setHasSkippedPixelPitch(true);
                        }}
                        className="px-6 py-3 text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                      >
                        Clear Pixel Pitch Filter
                      </button>
                    )}
                    <button
                      onClick={() => {
                        // Go back to pixel pitch step to adjust
                        setCurrentStep('pixelPitch');
                      }}
                      className="px-6 py-3 text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Adjust Pixel Pitch
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          {currentStepIndex === steps.length - 1 ? (
            <button
              onClick={handleComplete}
              disabled={!canProceed() || filteredProducts.length === 0}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              Complete
              <Check size={20} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              Next
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

