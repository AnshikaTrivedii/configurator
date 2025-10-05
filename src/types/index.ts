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
  price?: number | string;
  siChannelPrice?: number | string;
  resellerPrice?: number | string;
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
  rentalOption?: 'cabinet' | 'curve lock';
  prices?: {
    cabinet: { endCustomer: number; siChannel: number; reseller: number };
    curveLock: { endCustomer: number; siChannel: number; reseller: number };
  };
  // Transparent Series specific properties
  transparency?: number; // Transparency percentage
  scanMode?: string; // Scan mode (e.g., "Static")
  pixelComposition?: string; // Pixel composition (e.g., "SMD2121", "SMD2020", "SMD1313", "SMD1921")
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
export interface Controller {
  id: string;
  name: string;
  portCount: number;
  pixelCapacity: number; // in millions
  type: 'asynchronous' | 'synchronous';
  minPortsForRedundancy: number; // minimum ports needed when redundancy is enabled
}

export interface ControllerSelection {
  selectedController: Controller;
  requiredPorts: number;
  totalPixels: number;
  isRedundancyMode: boolean;
  dataHubPorts: number;
  backupPorts: number;
}

export interface SalesUser {
  name: string;
  email: string;
  location: string;
  contactNumber: string;
  role?: 'sales' | 'super';
}

export interface SalesUserWithQuotations {
  _id: string;
  name: string;
  email: string;
  location: string;
  contactNumber: string;
  quotationCount: number;
  createdAt: string;
}

export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  location?: string;
}