import React, { useState, useRef, useEffect } from 'react';
import { DisplayConfig, Product, CabinetGrid } from '../types';

interface DisplayPreviewProps {
  config: DisplayConfig;
  displayDimensions: {
    width: number;
    height: number;
    actualRatio: number;
  };
  selectedProduct?: Product;
  cabinetGrid: CabinetGrid;
}

export const DisplayPreview: React.FC<DisplayPreviewProps> = ({
  config,
  displayDimensions,
  selectedProduct,
  cabinetGrid
}) => {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundVideo, setBackgroundVideo] = useState<string | null>(null);
  const [backgroundType, setBackgroundType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);

  // Helper to get aspect ratio from image
  const getImageAspectRatio = (src: string, cb: (ratio: number) => void) => {
    const img = new window.Image();
    img.onload = function () {
      if (img.naturalWidth && img.naturalHeight) {
        cb(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = src;
  };

  // Helper to get aspect ratio from video
  const getVideoAspectRatio = (src: string, cb: (ratio: number) => void) => {
    const video = document.createElement('video');
    video.onloadedmetadata = function () {
      if (video.videoWidth && video.videoHeight) {
        cb(video.videoWidth / video.videoHeight);
      }
    };
    video.src = src;
  };

  // When background image or video changes, detect aspect ratio
  useEffect(() => {
    if (backgroundType === 'image' && backgroundImage) {
      getImageAspectRatio(backgroundImage, setMediaAspectRatio);
    } else if (backgroundType === 'video' && backgroundVideo) {
      getVideoAspectRatio(backgroundVideo, setMediaAspectRatio);
    } else {
      setMediaAspectRatio(null);
    }
  }, [backgroundType, backgroundImage, backgroundVideo]);

  // Calculate preview area size based on media aspect ratio
  // --- PATCH: For digital standee, use cabinet size for preview area ---
  let previewWidth = displayDimensions.width;
  let previewHeight = displayDimensions.height;

  // Detect if product is digital standee
  const isDigitalStandee = selectedProduct && selectedProduct.category?.toLowerCase().includes('digital standee');

  // If digital standee, use cabinet size for preview area
  if (isDigitalStandee && selectedProduct?.cabinetDimensions) {
    const maxSize = window.innerWidth < 640 ? 300 : 600; // Responsive max preview size
    const { width: cabW, height: cabH } = selectedProduct.cabinetDimensions;
    const cabRatio = cabW / cabH;
    // Scale to fit maxSize
    if (cabW >= cabH) {
      previewWidth = maxSize;
      previewHeight = maxSize / cabRatio;
    } else {
      previewHeight = maxSize;
      previewWidth = maxSize * cabRatio;
    }
  }

  if (mediaAspectRatio) {
    const containerRatio = previewWidth / previewHeight;
    if (containerRatio > mediaAspectRatio) {
      // Container is wider than media, fit by height
      previewHeight = previewHeight;
      previewWidth = previewHeight * mediaAspectRatio;
    } else {
      // Container is taller than media, fit by width
      previewWidth = previewWidth;
      previewHeight = previewWidth / mediaAspectRatio;
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (file.type.startsWith('image/')) {
          setBackgroundImage(event.target?.result as string);
          setBackgroundVideo(null);
          setBackgroundType('image');
        } else if (file.type.startsWith('video/')) {
          setBackgroundVideo(event.target?.result as string);
          setBackgroundImage(null);
          setBackgroundType('video');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (file.type.startsWith('image/')) {
          setBackgroundImage(event.target?.result as string);
          setBackgroundVideo(null);
          setBackgroundType('image');
        } else if (file.type.startsWith('video/')) {
          setBackgroundVideo(event.target?.result as string);
          setBackgroundImage(null);
          setBackgroundType('video');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBackground = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBackgroundImage(null);
    setBackgroundVideo(null);
    setBackgroundType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAspectRatioLabel = () => {
    const ratio = displayDimensions.actualRatio;
    if (Math.abs(ratio - 16/9) < 0.01) return '16:9';
    if (Math.abs(ratio - 21/9) < 0.01) return '21:9';
    if (Math.abs(ratio - 32/9) < 0.01) return '32:9';
    return `${ratio.toFixed(2)}:1`;
  };

  const renderCabinetGrid = () => {
    const cabinets = [];
    const cabinetWidth = displayDimensions.width / cabinetGrid.columns;
    const cabinetHeight = displayDimensions.height / cabinetGrid.rows;

    for (let row = 0; row < cabinetGrid.rows; row++) {
      for (let col = 0; col < cabinetGrid.columns; col++) {
        cabinets.push(
          <div
            key={`${row}-${col}`}
            className="absolute border border-gray-400 bg-transparent flex items-center justify-center"
            style={{
              left: `${col * cabinetWidth}px`,
              top: `${row * cabinetHeight}px`,
              width: `${cabinetWidth}px`,
              height: `${cabinetHeight}px`
            }}
          >
            {/* Cabinet content */}
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src="https://orion-led.com/wp-content/uploads/2025/06/logo-white-1.png" 
                alt="Orion LED Logo" 
                className="w-full h-full object-contain p-2"
              />
            </div>
            
            {/* Cabinet border indicators */}
            <div className="absolute inset-0 border border-white opacity-50"></div>
          </div>
        );
      }
    }
    return cabinets;
  };

  // Helper to determine if product should use module grid
  const useModuleGrid = selectedProduct && (
    selectedProduct.category?.toLowerCase().includes('digital standee') ||
    selectedProduct.category?.toLowerCase().includes('jumbo')
  );

  // Calculate grid for modules if needed
  const moduleGrid = useModuleGrid && selectedProduct ? (
    selectedProduct.category?.toLowerCase().includes('digital standee')
      ? { columns: 7, rows: 5, width: selectedProduct.moduleDimensions.width, height: selectedProduct.moduleDimensions.height }
      : {
          columns: Math.round(displayDimensions.width / selectedProduct.moduleDimensions.width),
          rows: Math.round(displayDimensions.height / selectedProduct.moduleDimensions.height),
          width: selectedProduct.moduleDimensions.width,
          height: selectedProduct.moduleDimensions.height,
        }
  ) : null;

  const renderModuleGrid = () => {
    if (!moduleGrid) return null;
    const modules = [];
    const moduleWidth = displayDimensions.width / moduleGrid.columns;
    const moduleHeight = displayDimensions.height / moduleGrid.rows;
    for (let row = 0; row < moduleGrid.rows; row++) {
      for (let col = 0; col < moduleGrid.columns; col++) {
        modules.push(
          <div
            key={`module-${row}-${col}`}
            className="absolute border border-blue-400 bg-transparent flex items-center justify-center"
            style={{
              left: `${col * moduleWidth}px`,
              top: `${row * moduleHeight}px`,
              width: `${moduleWidth}px`,
              height: `${moduleHeight}px`
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src="https://orion-led.com/wp-content/uploads/2025/06/logo-white-1.png" 
                alt="Orion LED Logo" 
                className="w-full h-full object-contain p-2"
              />
            </div>
            <div className="absolute inset-0 border border-white opacity-50"></div>
          </div>
        );
      }
    }
    return modules;
  };

  // Convert mm to display unit with 2 decimal places
  const toDisplayUnit = (mm: number): string => {
    const meters = mm / 1000;
    if (config.unit === 'ft') {
      return (meters * 3.28084).toFixed(2);
    }
    return meters.toFixed(2);
  };

  // Helper to get measurement values for preview labels
  let previewWidthMM = config.width;
  let previewHeightMM = config.height;
  if (isDigitalStandee && selectedProduct?.cabinetDimensions) {
    previewWidthMM = selectedProduct.cabinetDimensions.width;
    previewHeightMM = selectedProduct.cabinetDimensions.height;
  }

  return (
    <div className="flex flex-col items-center space-y-4 sm:space-y-6 py-4 sm:py-8">
      {/* Top measurement */}
      <div className="flex items-center space-x-2">
        <div className="h-px bg-gray-300 w-4 sm:w-8"></div>
        <span className="text-xs sm:text-sm text-gray-600 font-medium">{toDisplayUnit(previewWidthMM)} {config.unit}</span>
        <div className="h-px bg-gray-300 w-4 sm:w-8"></div>
      </div>

      {/* Display preview container */}
      <div className="relative flex items-center">
        {/* Left measurement */}
        <div className="flex flex-col items-center mr-2 sm:mr-4">
          <div className="w-px bg-gray-300 h-4 sm:h-8"></div>
          <span className="text-xs sm:text-sm text-gray-600 font-medium transform -rotate-90 whitespace-nowrap">
            {toDisplayUnit(previewHeightMM)} {config.unit}
          </span>
          <div className="w-px bg-gray-300 h-4 sm:h-8"></div>
        </div>

        {/* Display screen with cabinet grid or media */}
        <div 
          className={`relative border-2 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-400'} shadow-xl overflow-hidden transition-all duration-300 ease-in-out flex items-center justify-center bg-transparent`}
          style={{
            width: `${displayDimensions.width}px`,
            height: `${displayDimensions.height}px`,
            cursor: 'pointer',
            position: 'relative',
            backgroundColor: 'transparent',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Render image or video centered and fit to its aspect ratio */}
          {backgroundType === 'image' && backgroundImage && mediaAspectRatio && (
            <img
              src={backgroundImage}
              alt="Background"
              style={{
                width: `${previewWidth}px`,
                height: `${previewHeight}px`,
                objectFit: 'contain',
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'transparent',
              }}
              draggable={false}
            />
          )}
          {backgroundType === 'video' && backgroundVideo && mediaAspectRatio && (
            <video
              src={backgroundVideo}
              style={{
                width: `${previewWidth}px`,
                height: `${previewHeight}px`,
                objectFit: 'contain',
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'transparent',
              }}
              autoPlay
              loop
              muted
            />
          )}
          {/* Background upload interface */}
          {!backgroundImage && !backgroundVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-4 text-center">
              <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs sm:text-sm text-gray-600">Click to upload background image or video</p>
              <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
            </div>
          )}
          {/* Remove background button */}
          {(backgroundImage || backgroundVideo) && (
            <button
              onClick={removeBackground}
              className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-1 sm:p-1.5 transition-all duration-200"
              title="Remove background"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,video/*"
          />
          {/* Cabinet grid, overlays, and corners only if no background */}
          {!(backgroundImage || backgroundVideo) && (useModuleGrid ? renderModuleGrid() : renderCabinetGrid())}
          {!(backgroundImage || backgroundVideo) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black bg-opacity-60 text-white p-2 sm:p-4 rounded-lg backdrop-blur-sm text-center">
                <h3 className="text-sm sm:text-lg font-bold mb-1">
                  {useModuleGrid
                    ? `${moduleGrid?.columns ?? 0} × ${moduleGrid?.rows ?? 0} Module Grid`
                    : `${cabinetGrid.columns} × ${cabinetGrid.rows} Grid`}
                </h3>
                <p className="text-xs sm:text-sm">
                  {useModuleGrid ? `${(moduleGrid?.columns ?? 0) * (moduleGrid?.rows ?? 0)} Modules Total` : `${cabinetGrid.columns * cabinetGrid.rows} Cabinets Total`}
                </p>
                {selectedProduct && (
                  <p className="text-xs mt-1 opacity-90">                                   
                    {useModuleGrid
                      ? `${selectedProduct.moduleDimensions.width}×${selectedProduct.moduleDimensions.height}mm each`
                      : `${selectedProduct.cabinetDimensions.width}×${selectedProduct.cabinetDimensions.height}mm each`}
                  </p>
                )}
              </div>
            </div>
          )}
          {!(backgroundImage || backgroundVideo) && (
            <>
              <div className="absolute top-1 left-1 w-2 h-2 sm:w-3 sm:h-3 border-t-2 border-l-2 border-white opacity-60"></div>
              <div className="absolute top-1 right-1 w-2 h-2 sm:w-3 sm:h-3 border-t-2 border-r-2 border-white opacity-60"></div>
              <div className="absolute bottom-1 left-1 w-2 h-2 sm:w-3 sm:h-3 border-b-2 border-l-2 border-white opacity-60"></div>
              <div className="absolute bottom-1 right-1 w-2 h-2 sm:w-3 sm:h-3 border-b-2 border-r-2 border-white opacity-60"></div>
            </>
          )}
        </div>

        {/* Right measurement */}
        <div className="flex flex-col items-center ml-2 sm:ml-4">
          <div className="w-px bg-gray-300 h-4 sm:h-8"></div>
          <span className="text-xs sm:text-sm text-gray-600 font-medium transform -rotate-90 whitespace-nowrap">
            {toDisplayUnit(previewHeightMM)} {config.unit}
          </span>
          <div className="w-px bg-gray-300 h-4 sm:h-8"></div>
        </div>
      </div>

      {/* Bottom measurement */}
      <div className="flex items-center space-x-2">
        <div className="h-px bg-gray-300 w-4 sm:w-8"></div>
        <span className="text-xs sm:text-sm text-gray-600 font-medium">{toDisplayUnit(previewWidthMM)} {config.unit}</span>
        <div className="h-px bg-gray-300 w-4 sm:w-8"></div>
      </div>
    </div>
  );
};