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
  price?: number;
  siChannelPrice?: number;
  resellerPrice?: number;
  // Cabinet dimensions in mm
  cabinetDimensions: {
    width: number;
    height: number;
  };
  moduleDimensions: {
    width: number;
    height: number;
  };
  moduleResolution: {
    width: number;
    height: number;
  };
  moduleQuantity: number;
  pixelPitch: number;
  pixelDensity: number;
  brightness: number;
  refreshRate: number;
  environment: string;
  maxPowerConsumption: number;
  avgPowerConsumption: number;
  weightPerCabinet: number;
  pdf: string;
  viewingAngle?: string;
  colorDepth?: string;
  voltage?: string;
  serviceAccess?: string;
  ipGrade?: string;
  operatingTemperature?: string;
  operatingHumidity?: string;
  lifeTime?: number;
  mtbf?: number;
  ledChip?: string;
  pcb?: string;
  driverIC?: string;
  powerSupply?: string;
  controller?: string;
  cabinetMaterial?: string;
  ledType?: string;
  contrastRatio?: string;
  colorTemperature?: string;
  frameChangingFrequently?: string;
  driveMethod?: string;
  storageTempHumidity?: string;
  certificates?: string;
  ledConfiguration?: string;
  minViewDistance?: string;
  brightnessAdjustment?: string;
  availableColorPalette?: string;
  inputPowerFrequency?: string;
  defectRate?: string;
  dataTransferMethod?: string;
  controlMethod?: string;
  controlDistance?: string;
  screenResolution?: string;
  activeDisplayArea?: string;
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