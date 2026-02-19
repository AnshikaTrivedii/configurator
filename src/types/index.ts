export interface DisplayConfig {
  width: number;
  height: number;
  aspectRatio: string | null;
  unit: 'm' | 'ft' | 'mm';
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
  moduleGrid?: {
    columns: number;
    rows: number;
  };
  pixelPitch: number;
  pixelDensity: number;
  brightness: number;
  refreshRate: number;
  environment: string;
  maxPowerConsumption: number;
  avgPowerConsumption: number;
  weightPerCabinet: number;
  pdf?: string;
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
  rentalOption?: 'cabinet' | 'curve lock' | string;
  prices?: {
    cabinet: { endCustomer: number; siChannel: number; reseller: number };
    curveLock?: { endCustomer: number; siChannel: number; reseller: number };
  };

  transparency?: number; // Transparency percentage
  scanMode?: string; // Scan mode (e.g., "Static")
  pixelComposition?: string; // Pixel composition (e.g., "SMD2121", "SMD2020", "SMD1313", "SMD1921")

  enabled?: boolean; // If false, product is hidden from UI but kept in codebase
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
  inputs?: number; // number of input connectors
  outputs?: number; // number of output connectors
  maxResolution?: string; // maximum resolution supported
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
  _id?: string; // CRITICAL: User ID needed for quotation attribution
  name: string;
  email: string;
  location: string;
  contactNumber: string;
  role?: 'sales' | 'super' | 'super_admin' | 'partner';
  allowedCustomerTypes?: string[]; // For partners: ['endUser', 'reseller', 'siChannel']
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

export interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  projectTitle?: string;
  location?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  _id: string;
  quotationId: string;
  salesUserId: string;
  salesUserName: string;
  // New: Client reference
  clientId?: string;
  client?: Client;
  // Old fields: Keep for backward compatibility
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  productDetails: any;
  message: string;
  userType: string;
  userTypeDisplayName: string;
  totalPrice: number;
  pdfPage6HTML?: string;
  createdAt: string;
  updatedAt: string;
  originalTotalPrice?: number;
  exactPricingBreakdown?: any;
  originalPricingBreakdown?: any;
  exactProductSpecs?: any;
  quotationData?: any;
  pdfS3Key?: string;
  pdfS3Url?: string;
}