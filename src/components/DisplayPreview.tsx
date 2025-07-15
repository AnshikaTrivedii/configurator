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
  let previewWidth = displayDimensions.width;
  let previewHeight = displayDimensions.height;
  if (mediaAspectRatio) {
    const containerRatio = displayDimensions.width / displayDimensions.height;
    if (containerRatio > mediaAspectRatio) {
      // Container is wider than media, fit by height
      previewHeight = displayDimensions.height;
      previewWidth = displayDimensions.height * mediaAspectRatio;
    } else {
      // Container is taller than media, fit by width
      previewWidth = displayDimensions.width;
      previewHeight = displayDimensions.width / mediaAspectRatio;
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
            <div className="text-white text-center text-xs bg-black bg-opacity-40 px-2 py-1 rounded">
              <div className="font-semibold">
                {selectedProduct ? selectedProduct.name.split(' ')[0] : 'Cabinet'}
              </div>
              <div className="text-[10px]">
                {col + 1},{row + 1}
              </div>
            </div>
            
            {/* Cabinet border indicators */}
            <div className="absolute inset-0 border border-white opacity-50"></div>
          </div>
        );
      }
    }
    return cabinets;
  };

  // Convert current unit to meters
  const toMeters = (value: number): string => {
    switch (config.unit) {
      case 'mm':
        return (value / 1000).toFixed(3);
      case 'px':
        // Assuming 96 DPI for pixel to meter conversion
        return (value * 0.0254 / 96).toFixed(3);
      case 'ft':
        return (value * 0.3048).toFixed(3);
      default: // meters
        return value.toFixed(3);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 py-8">
      {/* Top measurement */}
      <div className="flex items-center space-x-2">
        <div className="h-px bg-gray-300 w-8"></div>
        <span className="text-sm text-gray-600 font-medium">{toMeters(config.width)} m</span>
        <div className="h-px bg-gray-300 w-8"></div>
      </div>

      {/* Display preview container */}
      <div className="relative flex items-center">
        {/* Left measurement */}
        <div className="flex flex-col items-center mr-4">
          <div className="w-px bg-gray-300 h-8"></div>
          <span className="text-sm text-gray-600 font-medium transform -rotate-90 whitespace-nowrap">
            {toMeters(config.height)} m
          </span>
          <div className="w-px bg-gray-300 h-8"></div>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-600">Click to upload background image or video</p>
              <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
            </div>
          )}
          {/* Remove background button */}
          {(backgroundImage || backgroundVideo) && (
            <button
              onClick={removeBackground}
              className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-1.5 transition-all duration-200"
              title="Remove background"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
          {!(backgroundImage || backgroundVideo) && renderCabinetGrid()}
          {!(backgroundImage || backgroundVideo) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black bg-opacity-60 text-white p-4 rounded-lg backdrop-blur-sm text-center">
                <h3 className="text-lg font-bold mb-1">
                  {cabinetGrid.columns} × {cabinetGrid.rows} Grid
                </h3>
                <p className="text-sm">
                  {cabinetGrid.columns * cabinetGrid.rows} Cabinets Total
                </p>
                {selectedProduct && (
                  <p className="text-xs mt-1 opacity-90">
                    {selectedProduct.cabinetDimensions.width}×{selectedProduct.cabinetDimensions.height}mm each
                  </p>
                )}
              </div>
            </div>
          )}
          {!(backgroundImage || backgroundVideo) && (
            <>
              <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-white opacity-60"></div>
              <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-white opacity-60"></div>
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-white opacity-60"></div>
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-white opacity-60"></div>
            </>
          )}
        </div>

        {/* Right measurement */}
        <div className="flex flex-col items-center ml-4">
          <div className="w-px bg-gray-300 h-8"></div>
          <span className="text-sm text-gray-600 font-medium transform rotate-90 whitespace-nowrap">
            {toMeters(config.height)} m
          </span>
          <div className="w-px bg-gray-300 h-8"></div>
        </div>
      </div>

      {/* Bottom measurement and aspect ratio */}
      <div className="text-center space-y-2">
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200 flex items-center"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {backgroundType === 'video' && backgroundVideo ? 'Change Background Video' : backgroundType === 'image' && backgroundImage ? 'Change Background Image' : 'Add Background'}
          </button>
          {backgroundType === 'video' && backgroundVideo && (
            <button
              onClick={removeBackground}
              className="px-3 py-1.5 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-px bg-gray-300 w-8"></div>
          <span className="text-sm text-gray-600 font-medium">{toMeters(config.width)} m</span>
          <div className="h-px bg-gray-300 w-8"></div>
        </div>
        <div className="text-lg font-semibold text-gray-700">
          {getAspectRatioLabel()}
        </div>
        {/* <div className="text-sm text-gray-600">
          Actual: {toMeters(cabinetGrid.totalWidth)} × {toMeters(cabinetGrid.totalHeight)} m
        </div> */}
      </div>
    </div>
  );
};