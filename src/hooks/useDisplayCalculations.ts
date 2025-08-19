import { useState, useMemo } from 'react';
import { DisplayConfig, AspectRatio, CabinetGrid, Product } from '../types';

// Predefined aspect ratios
const aspectRatios: AspectRatio[] = [
  { label: '16:9', value: 16 / 9, name: '16:9' },
  { label: '4:3', value: 4 / 3, name: '4:3' },
  { label: '1:1', value: 1, name: '1:1' },
  { label: 'None', value: 0, name: 'None' }
];

// Conversion constants
const METERS_TO_FEET = 3.28084;
const FEET_TO_METERS = 1 / METERS_TO_FEET;

export const useDisplayCalculations = (selectedProduct?: Product) => {
  const defaultCabinet = { width: 600, height: 337.5 };

  const getCabinetDimensions = () => {
    return selectedProduct?.cabinetDimensions || defaultCabinet;
  };

  const [config, setConfig] = useState<DisplayConfig>({
    width: 1800,
    height: 675,
    aspectRatio: 'None',
    unit: 'm'
  });

  const updateWidth = (newWidth: number, addCabinets = 0) => {
    setConfig(prev => {
      const cabinet = getCabinetDimensions();
      let width = newWidth;

      if (addCabinets !== 0) {
        const currentCabinets = Math.round(prev.width / cabinet.width);
        const newCabinets = Math.max(1, currentCabinets + addCabinets);
        width = Math.round(newCabinets * cabinet.width);
      }

      if (prev.aspectRatio !== 'None') {
        const ratio = aspectRatios.find(r => r.name === prev.aspectRatio)?.value || 1;
        const height = Math.round(width / ratio);
        return { ...prev, width, height };
      }

      return { ...prev, width };
    });
  };

  const updateHeight = (newHeight: number, addCabinets = 0) => {
    setConfig(prev => {
      const cabinet = getCabinetDimensions();
      let height = newHeight;

      if (addCabinets !== 0) {
        const currentCabinets = Math.round(prev.height / cabinet.height);
        const newCabinets = Math.max(1, currentCabinets + addCabinets);
        height = Math.round(newCabinets * cabinet.height);
      }

      if (prev.aspectRatio !== 'None') {
        const ratio = aspectRatios.find(r => r.name === prev.aspectRatio)?.value || 1;
        const width = Math.round(height * ratio);
        return { ...prev, width, height };
      }

      return { ...prev, height };
    });
  };

  const updateUnit = (newUnit: 'm' | 'ft') => {
    setConfig(prev => {
      // Keep the same physical dimensions, just change the unit
      return { ...prev, unit: newUnit };
    });
  };

  const updateAspectRatio = (aspectRatio: string) => {
    if (aspectRatio === 'None') {
      setConfig(prev => ({ ...prev, aspectRatio }));
      return;
    }

    const ratio = aspectRatios.find(r => r.name === aspectRatio)?.value || 1;
    const cabinet = getCabinetDimensions();

    // Use the larger of current width or height as the base
    const base = Math.max(config.width, config.height);
    let newWidth, newHeight;
    if (aspectRatio === '1:1') {
      // Square
      const sideCabinets = Math.max(1, Math.round(base / Math.max(cabinet.width, cabinet.height)));
      const side = sideCabinets * Math.max(cabinet.width, cabinet.height);
      newWidth = side;
      newHeight = side;
    } else {
      // For other ratios
      // Decide which dimension to use as base to maximize area
      if (base === config.width) {
        // Use width as base
        newWidth = Math.max(1, Math.round(base / cabinet.width)) * cabinet.width;
        newHeight = Math.max(1, Math.round((newWidth / ratio) / cabinet.height)) * cabinet.height;
      } else {
        // Use height as base
        newHeight = Math.max(1, Math.round(base / cabinet.height)) * cabinet.height;
        newWidth = Math.max(1, Math.round((newHeight * ratio) / cabinet.width)) * cabinet.width;
      }
    }

    setConfig({
      width: newWidth,
      height: newHeight,
      aspectRatio,
      unit: config.unit
    });
  };
  

  const calculateCabinetGrid = (selectedProduct: Product | undefined): CabinetGrid => {
    const cabinet = selectedProduct?.cabinetDimensions || defaultCabinet;

    const columns = Math.ceil(config.width / cabinet.width);
    const rows = Math.ceil(config.height / cabinet.height);

    return {
      columns,
      rows,
      totalWidth: columns * cabinet.width,
      totalHeight: rows * cabinet.height
    };
  };

  // Dynamically scale dimensions while keeping aspect ratio accurate
  const displayDimensions = useMemo(() => {
    const maxSize = 600;
    const minSize = 150;

    const widthRatio = config.width / config.height;

    let previewHeight = maxSize;
    let previewWidth = previewHeight * widthRatio;

    if (previewWidth > maxSize) {
      previewWidth = maxSize;
      previewHeight = previewWidth / widthRatio;
    }

    const finalWidth = Math.max(minSize, Math.round(previewWidth));
    const finalHeight = Math.max(minSize, Math.round(previewHeight));

    return {
      width: finalWidth,
      height: finalHeight,
      actualRatio: widthRatio
    };
  }, [config.width, config.height]);

  return {
    config,
    aspectRatios,
    updateWidth,
    updateHeight,
    updateUnit,
    updateAspectRatio,
    setConfig,
    displayDimensions,
    calculateCabinetGrid
  };
};