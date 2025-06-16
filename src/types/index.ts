export interface DisplayConfig {
  width: number;
  height: number;
  aspectRatio: string | null;
  unit: 'px' | 'm' | 'ft' | 'mm';
}

export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  resolution: {
    width: number;
    height: number;
  };
  features: string[];
  price?: number;
  // Cabinet dimensions in mm
  cabinetDimensions: {
    width: number;
    height: number;
  };
  pixelPitch: number;
  brightness: number;
  contrastRatio: string;
  refreshRate: number;
  depth: number;
  environment: string;
  powerDraw: number;
  series: string;
  sizeInInches: {
    width: string;
    height: string;
  };
}

export interface AspectRatio {
  label: string;
  value: number;
  name: string;
}

export interface CabinetGrid {
  columns: number;
  rows: number;
  totalWidth: number;
  totalHeight: number;
}