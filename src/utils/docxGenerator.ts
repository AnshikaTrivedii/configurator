import { Document, Packer, Paragraph, ImageRun } from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DisplayConfig, Product, CabinetGrid } from '../types';
import { getProcessorPrice } from './processorPrices';

// Processor specifications - matches DisplayConfigurator.tsx
const PROCESSOR_SPECS: Record<string, { inputs?: number; outputs?: number; maxResolution?: string; pixelCapacity?: number }> = {
  'TB40': { inputs: 1, outputs: 3, maxResolution: '1920×1080@60Hz', pixelCapacity: 1.3 },
  'TB60': { inputs: 1, outputs: 5, maxResolution: '1920×1080@60Hz', pixelCapacity: 2.3 },
  'VX1': { inputs: 5, outputs: 2, maxResolution: '1920×1080@60Hz', pixelCapacity: 1.3 },
  'VX400': { inputs: 5, outputs: 4, maxResolution: '1920×1200@60Hz', pixelCapacity: 2.6 },
  'VX400 Pro': { inputs: 5, outputs: 4, maxResolution: '4096×2160@60Hz (4K)', pixelCapacity: 2.6 },
  'VX600': { inputs: 5, outputs: 6, maxResolution: '1920×1200@60Hz', pixelCapacity: 3.9 },
  'VX600 Pro': { inputs: 5, outputs: 6, maxResolution: '4096×2160@60Hz (4K)', pixelCapacity: 3.9 },
  'VX1000': { inputs: 6, outputs: 10, maxResolution: '3840×2160@30Hz', pixelCapacity: 6.5 },
  'VX1000 Pro': { inputs: 5, outputs: 10, maxResolution: '4096×2160@60Hz (True 4K@60)', pixelCapacity: 6.5 },
  'VX16S': { inputs: 7, outputs: 16, maxResolution: '3840×2160@60Hz', pixelCapacity: 10 },
  'VX2000pro': { inputs: 10, outputs: 25, maxResolution: '4096×2160@60Hz (4K)', pixelCapacity: 13 },
  'TU15PRO': { inputs: 2, outputs: 5, maxResolution: '2048×1152@60Hz', pixelCapacity: 2.6 },
  'TU20PRO': { inputs: 2, outputs: 7, maxResolution: '2048×1152@60Hz', pixelCapacity: 3.9 },
  'TU4k pro': { inputs: 3, outputs: 23, maxResolution: '4096×2160@60Hz', pixelCapacity: 13 },
};

const SALES_PHONE_MAPPING: Record<string, string> = {
  'ashoo.nitin@orion-led.com': '8826888023',
  'mukund.puranik@orion-led.com': '9701797731',
  'onkar@orion-led.com': '9820318887',
  'prachi.sharma@orion-led.com': '8826888050',
  'rajneesh.rawat@orion-led.com': '9839177000',
  'sales@orion-led.com': '98391 77083',
  'vivekanand@orion-led.com': '9810163963',
  'khushi.jafri@orion-led.com': '8588882820',
  'ashwani.yadav@orion-led.com': '98391 77083',
  'anshika.trivedi@orion-led.com': '9140526027',
  'madhur@orion-led.com': '98391 77046',
  'amisha@orion-led.com': '98391 77083',
};

const DEFAULT_PHONE_NUMBER = '98391 77083';

const getSalesPhoneNumber = (salesUser: { email: string; name: string; contactNumber: string; location: string } | null | undefined): string => {
  if (!salesUser) {
    return DEFAULT_PHONE_NUMBER;
  }

  const mappedPhone = SALES_PHONE_MAPPING[salesUser.email.toLowerCase()];
  if (mappedPhone) {
    return mappedPhone;
  }

  return salesUser.contactNumber || DEFAULT_PHONE_NUMBER;
};

/**
 * Generate DOCX file from HTML quotation document
 * This function ensures pixel-perfect export by:
 * 1. Using the exact HTML content from generateConfigurationHtml
 * 2. Converting each HTML page to a high-quality image using html2canvas
 * 3. Embedding images in DOCX with exact A4 dimensions (210mm x 297mm)
 * 4. Preserving page breaks and layout
 * 
 * Note: This approach converts HTML to images for pixel-perfect rendering in Word.
 * The resulting DOCX will contain images of the pages, ensuring exact visual fidelity.
 */
export const generateConfigurationDocx = async (
  config: DisplayConfig,
  selectedProduct: Product,
  cabinetGrid: CabinetGrid,
  processor?: string,
  mode?: string,
  userInfo?: UserInfo,
  salesUser?: { email: string; name: string; contactNumber: string; location: string } | null,
  quotationId?: string,
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  },
  exactPricingBreakdown?: {
    unitPrice?: number;
    quantity?: number;
    subtotal?: number;
    gstAmount?: number;
    processorPrice?: number;
    processorGst?: number;
    grandTotal?: number;
    discount?: {
      discountedProductTotal?: number;
      discountedProcessorTotal?: number;
      discountedGrandTotal?: number;
    };
  }
): Promise<Blob> => {
  try {

    const htmlContent = generateConfigurationHtml(
      config,
      selectedProduct,
      cabinetGrid,
      processor,
      mode,
      userInfo,
      salesUser,
      quotationId,
      customPricing,
      exactPricingBreakdown
    );

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.background = '#ffffff';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    const allImages = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(
      allImages.map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>(resolve => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );

    await new Promise(resolve => setTimeout(resolve, 500));

    const pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];

    if (pages.length === 0) {
      document.body.removeChild(container);
      throw new Error('No pages found in HTML content');
    }

    const A4_WIDTH_INCHES = 210 / 25.4;
    const A4_HEIGHT_INCHES = 297 / 25.4;

    const A4_WIDTH_EMU = Math.round(A4_WIDTH_INCHES * 914400);
    const A4_HEIGHT_EMU = Math.round(A4_HEIGHT_INCHES * 914400);

    const A4_WIDTH_TWIPS = Math.round(A4_WIDTH_INCHES * 1440);
    const A4_HEIGHT_TWIPS = Math.round(A4_HEIGHT_INCHES * 1440);

    const docChildren: (Paragraph)[] = [];

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];

      try {

        const canvas = await html2canvas(pageEl, {
          scale: 2, // Higher scale for better quality
          useCORS: true,
          logging: false,
          width: pageEl.scrollWidth || pageEl.offsetWidth,
          height: pageEl.scrollHeight || pageEl.offsetHeight,
          backgroundColor: '#ffffff',
          windowWidth: pageEl.scrollWidth || 794, // A4 width in pixels at 96 DPI
          windowHeight: pageEl.scrollHeight || 1123, // A4 height in pixels at 96 DPI
        });

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/png', 1.0); // Maximum quality
        });

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const imageRun = new ImageRun({
          type: "png",
          data: uint8Array,
          transformation: {
            width: A4_WIDTH_EMU,
            height: A4_HEIGHT_EMU,
          },
        });

        docChildren.push(
          new Paragraph({
            children: [imageRun],
            spacing: { after: 0, before: 0 },
          })
        );

        if (i < pages.length - 1) {
          docChildren.push(
            new Paragraph({
              children: [],
              pageBreakBefore: true,
            })
          );
        }
      } catch (error) {

      }
    }

    document.body.removeChild(container);

    const doc = new Document({
      creator: 'ORION LED Configurator',
      title: 'Configuration Quotation',
      description: 'LED Display Configuration Quotation',
      sections: [{
        properties: {
          page: {
            size: {
              width: A4_WIDTH_TWIPS,
              height: A4_HEIGHT_TWIPS,
            },
            margin: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            },
          },
        },
        children: docChildren,
      }],
    });

    const blob = await Packer.toBlob(doc);
    return blob;
  } catch (error) {

    throw new Error('Failed to generate DOCX file. Please try again.');
  }
};

interface UserInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
  projectTitle?: string;
  address?: string;
  userType?: 'End User' | 'Reseller' | 'Channel';
  paymentTerms?: string;
  warranty?: string;
  validity?: string;
}

export const generateConfigurationHtml = (
  config: DisplayConfig,
  selectedProduct: Product,
  cabinetGrid: CabinetGrid,
  processor?: string,
  _mode?: string,
  userInfo?: UserInfo,
  salesUser?: { email: string; name: string; contactNumber: string; location: string } | null,
  quotationId?: string,
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  },
  exactPricingBreakdown?: {
    unitPrice?: number;
    quantity?: number;
    subtotal?: number;
    gstAmount?: number;
    processorPrice?: number;
    processorGst?: number;
    grandTotal?: number;
    discount?: {
      discountedProductTotal?: number;
      discountedProcessorTotal?: number;
      discountedGrandTotal?: number;
    };
  }
): string => {

  const METERS_TO_FEET = 3.2808399;
  const toDisplayUnit = (mm: number, unit: string) => {
    const meters = mm / 1000;
    if (unit === 'ft') {
      return (meters * METERS_TO_FEET).toFixed(2);
    }
    return meters.toFixed(2);
  };

  const displayedWidth = parseFloat(toDisplayUnit(config.width, config.unit));
  const displayedHeight = parseFloat(toDisplayUnit(config.height, config.unit));
  void displayedWidth; void displayedHeight;

  const diagonalMeters = Math.sqrt(Math.pow(config.width / 1000, 2) + Math.pow(config.height / 1000, 2));
  void diagonalMeters;

  const avgPowerPerCabinet = selectedProduct.avgPowerConsumption || 91.7;
  const maxPowerPerCabinet = selectedProduct.maxPowerConsumption || (avgPowerPerCabinet * 3);
  void avgPowerPerCabinet; void maxPowerPerCabinet;

  void cabinetGrid; void selectedProduct;

  const normalizeLegacyUserType = (
    userType: 'End User' | 'Reseller' | 'Channel' | 'SI/Channel Partner' | undefined
  ): 'End User' | 'Reseller' | 'Channel' => {
    if (userType === 'SI/Channel Partner' || userType === 'Channel') {
      return 'Channel';
    }
    if (userType === 'Reseller') {
      return 'Reseller';
    }
    return 'End User';
  };

  const getProductPriceForHtml = (product: Product, userType: 'End User' | 'Reseller' | 'Channel' | 'SI/Channel Partner' = 'End User'): number => {
    const normalizedUserType = normalizeLegacyUserType(userType);

    if (product.category?.toLowerCase().includes('rental') && product.prices) {

      if (normalizedUserType === 'Reseller') {
        return product.prices.cabinet.reseller;
      } else if (normalizedUserType === 'Channel') {
        return product.prices.cabinet.siChannel;
      } else {
        return product.prices.cabinet.endCustomer;
      }
    }

    if (normalizedUserType === 'Reseller' && typeof product.resellerPrice === 'number') {
      return product.resellerPrice;
    } else if (normalizedUserType === 'Channel' && typeof product.siChannelPrice === 'number') {
      return product.siChannelPrice;
    } else if (typeof product.price === 'number') {
      return product.price;
    } else if (typeof product.price === 'string') {

      const parsedPrice = parseFloat(product.price);
      return isNaN(parsedPrice) ? 5300 : parsedPrice;
    }

    return 5300;
  };

  let unitPrice = getProductPriceForHtml(selectedProduct, userInfo?.userType);

  const isJumboSeries = selectedProduct.category?.toLowerCase().includes('jumbo') ||
    selectedProduct.id?.toLowerCase().startsWith('jumbo-') ||
    selectedProduct.name?.toLowerCase().includes('jumbo series');

  let quantity: number;
  if (selectedProduct.category?.toLowerCase().includes('rental')) {

    quantity = cabinetGrid.columns * cabinetGrid.rows;
  } else if (isJumboSeries) {

    const pixelPitch = selectedProduct.pixelPitch;

    if (pixelPitch === 4 || pixelPitch === 2.5) {

      const widthInFeet = 7.34;
      const heightInFeet = 4.72;
      const fixedQuantity = widthInFeet * heightInFeet;

      quantity = Math.round(fixedQuantity * 100) / 100; // 34.64 sqft
    } else if (pixelPitch === 3 || pixelPitch === 6) {

      const widthInFeet = 6.92;
      const heightInFeet = 5.04;
      const fixedQuantity = widthInFeet * heightInFeet;

      quantity = Math.round(fixedQuantity * 100) / 100; // 34.88 sqft
    } else {
      quantity = 1; // Fallback
    }
  } else {

    const widthInMeters = config.width / 1000;
    const heightInMeters = config.height / 1000;
    const widthInFeet = widthInMeters * METERS_TO_FEET;
    const heightInFeet = heightInMeters * METERS_TO_FEET;
    const rawQuantity = widthInFeet * heightInFeet;

    quantity = Math.round(rawQuantity * 100) / 100;
  }

  let totalProduct: number;
  let totalController: number;
  let totalStructure: number;
  let totalInstallation: number;
  let grandTotal: number;

  let safeQuantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
  let subtotal = unitPrice * safeQuantity;
  let gstProduct = subtotal * 0.18;

  let controllerPrice = 0;
  if (processor && !isJumboSeries) {

    controllerPrice = getProcessorPrice(processor, userInfo?.userType || 'End User');
  }
  let gstController = controllerPrice * 0.18;

  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const screenAreaSqFt = Math.round((widthInFeet * heightInFeet) * 100) / 100;

  let structureBasePrice: number;
  let installationBasePrice: number;

  if (customPricing?.enabled && customPricing.structurePrice !== null && customPricing.installationPrice !== null) {
    structureBasePrice = customPricing.structurePrice;
    installationBasePrice = customPricing.installationPrice;
  } else {

    const normalizedEnv = selectedProduct.environment?.toLowerCase().trim();
    if (normalizedEnv === 'indoor') {

      const numberOfCabinets = cabinetGrid.columns * cabinetGrid.rows;
      structureBasePrice = numberOfCabinets * 4000;
    } else {

      structureBasePrice = screenAreaSqFt * 2500;
    }
    installationBasePrice = screenAreaSqFt * 500;
  }

  const structureGST = structureBasePrice * 0.18;
  const installationGST = installationBasePrice * 0.18;

  if (exactPricingBreakdown) {

    if (exactPricingBreakdown.unitPrice !== undefined) unitPrice = exactPricingBreakdown.unitPrice;
    if (exactPricingBreakdown.quantity !== undefined) {
      quantity = exactPricingBreakdown.quantity;
      safeQuantity = quantity; // Update safeQuantity to match
    }

    if (exactPricingBreakdown.subtotal !== undefined) subtotal = exactPricingBreakdown.subtotal;

    if (exactPricingBreakdown.gstAmount !== undefined) gstProduct = exactPricingBreakdown.gstAmount;

    if (exactPricingBreakdown.processorPrice !== undefined) controllerPrice = exactPricingBreakdown.processorPrice;
    if (exactPricingBreakdown.processorGst !== undefined) gstController = exactPricingBreakdown.processorGst;

    if (exactPricingBreakdown.discount) {

      const discountedProductTotal = exactPricingBreakdown.discount.discountedProductTotal;
      const discountedProcessorTotal = exactPricingBreakdown.discount.discountedProcessorTotal;
      const discountedGrandTotal = exactPricingBreakdown.discount.discountedGrandTotal;

      if (discountedProductTotal !== undefined) {

        const originalSubtotal = subtotal;
        const originalGstProduct = gstProduct;

        subtotal = Math.round((discountedProductTotal / 1.18) * 100) / 100;
        gstProduct = Math.round((subtotal * 0.18) * 100) / 100;
        totalProduct = discountedProductTotal;

      } else {
        totalProduct = subtotal + gstProduct;
      }

      if (discountedProcessorTotal !== undefined) {
        const originalControllerPrice = controllerPrice;
        const originalGstController = gstController;

        controllerPrice = Math.round((discountedProcessorTotal / 1.18) * 100) / 100;
        gstController = Math.round((controllerPrice * 0.18) * 100) / 100;
        totalController = discountedProcessorTotal;

      } else {
        totalController = controllerPrice + gstController;
      }

      grandTotal = discountedGrandTotal || exactPricingBreakdown.grandTotal || 0;

    } else {

      totalProduct = subtotal + gstProduct;
      totalController = controllerPrice + gstController;

      if (exactPricingBreakdown.grandTotal) {
        grandTotal = exactPricingBreakdown.grandTotal;
      } else {

        grandTotal = totalProduct + totalController + structureBasePrice + structureGST + installationBasePrice + installationGST;
      }
    }

    totalStructure = structureBasePrice + structureGST;
    totalInstallation = installationBasePrice + installationGST;

  } else {

    totalProduct = subtotal + gstProduct;
    totalController = controllerPrice + gstController;
    totalStructure = structureBasePrice + structureGST;
    totalInstallation = installationBasePrice + installationGST;

    grandTotal = totalProduct + totalController + totalStructure + totalInstallation;
  }

  const formatIndianNumber = (x: number): string => {

    const rounded = Math.round(x);

    const s = rounded.toString();

    if (s.length > 3) {
      const lastThree = s.slice(-3);
      const remaining = s.slice(0, s.length - 3);
      const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
      return formatted;
    }
    return s;
  };

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ORION LED - Configuration Report</title>
        <style>
            * {
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.3;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f8f9fa;
                font-size: 10px;
                width: 100%;
                overflow-x: hidden;
            }
            html {
                width: 100%;
                overflow-x: hidden;
            }
            .page {
                width: 210mm;
                height: 297mm;
                min-width: 210mm;
                max-width: 210mm;
                min-height: 297mm;
                max-height: 297mm;
                margin: 0 auto;
                background: white;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                display: block;
                page-break-after: always;
                overflow: hidden;
                padding: 0;
                position: relative;
                box-sizing: border-box;
            }
            .page img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .page-bg {
                width: 100%;
                height: 100%;
                min-width: 210mm;
                max-width: 210mm;
                min-height: 297mm;
                max-height: 297mm;
                background-size: contain;
                background-position: center center;
                background-repeat: no-repeat;
                padding: 0;
                box-sizing: border-box;
            }
            .quotation-overlay {
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                flex-direction: column;
                padding-top: 55mm;
                padding-bottom: 25mm;
                padding-left: 12mm;
                padding-right: 12mm;
                box-sizing: border-box;
                overflow: hidden;
                z-index: 1;
                justify-content: flex-start;
            }
            .quotation-section {
                width: 100%;
                margin-bottom: 4px;
                flex-shrink: 0;
            }
            .quotation-overlay > .quotation-section:last-child {
                flex-shrink: 0;
            }
            .quotation-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                width: 100%;
                margin: 3px 0;
                align-items: stretch;
                grid-auto-rows: 1fr;
            }
            .quotation-card {
                background: rgba(255, 255, 255, 0.98);
                border-radius: 3px;
                padding: 6px 8px;
                border: 1px solid rgba(233, 236, 239, 0.9);
                width: 100%;
                display: flex;
                flex-direction: column;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                min-height: 100%;
                align-items: stretch;
                height: 100%;
            }
            .quotation-row {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 8px;
                align-items: center;
                padding: 4px 2px;
                border-bottom: 1px solid rgba(233, 236, 239, 0.7);
                min-height: 16px;
            }
            .quotation-row:nth-child(even) {
                background: rgba(248, 249, 250, 0.5);
            }
            .quotation-row:last-child {
                border-bottom: none;
            }
            .quotation-label {
                font-weight: 600;
                color: #333;
                font-size: 11px;
                text-align: left;
                line-height: 1.2;
            }
            .quotation-value {
                color: #333;
                font-weight: 600;
                font-size: 11px;
                text-align: right;
                white-space: nowrap;
                line-height: 1.2;
            }
            .quotation-total-row {
                background: rgba(240, 248, 255, 0.8);
                padding: 6px 8px;
                border-radius: 3px;
                border: 2px solid rgba(51, 51, 51, 0.2);
                margin-top: 4px;
                min-height: 40px;
                display: flex;
                align-items: center;
            }
            .page:last-child {
                page-break-after: auto;
            }
            .quotation-content {
                width: 100%;
                height: 100%;
                max-width: 100%;
                max-height: 100%;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
            }
            .quotation-content > * {
                flex-shrink: 1;
                min-height: 0;
            }
            @media print {
                body {
                    background: white;
                    width: 100%;
                    overflow-x: hidden;
                }
                html {
                    width: 100%;
                    overflow-x: hidden;
                }
                .page {
                    margin: 0;
                    box-shadow: none;
                    page-break-after: always;
                    padding: 0;
                    width: 210mm;
                    height: 297mm;
                    min-width: 210mm;
                    max-width: 210mm;
                    min-height: 297mm;
                    max-height: 297mm;
                }
                .page-bg {
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    min-width: 210mm;
                    max-width: 210mm;
                    min-height: 297mm;
                    max-height: 297mm;
                }
            }
        </style>
    </head>
    <body>
        <div class="page page-bg" style="background-image: url('/Pages to JPG/1.png');">
        </div>
        <div class="page page-bg" style="background-image: url('/Pages to JPG/2.png');">
        </div>
        <div class="page page-bg" style="background-image: url('/Pages to JPG/3.png');">
        </div>
        <div class="page page-bg" style="background-image: url('/Pages to JPG/4.png');">
        </div>
        <div class="page page-bg" style="background-image: url('/Pages to JPG/5.png');">
        </div>
        <div class="page page-bg" style="background-image: url('/Pages to JPG/6.png'); position: relative;">
            <div class="quotation-overlay">
            <!-- Quotation Details (header is in background image) -->
            <div class="quotation-section" style="background: rgba(248, 249, 250, 0.95); padding: 5px 8px; border-radius: 3px; margin: 0 0 4px 0; border: 1px solid rgba(233, 236, 239, 0.8); flex-shrink: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <p style="margin: 0 0 2px 0; font-size: 11px; color: #333; line-height: 1.2;"><strong>Quotation #:</strong> <span style="color: #333; font-weight: bold;">${quotationId || 'ORION/2025/07/Prachi/0193'}</span></p>
                        <p style="margin: 0; font-size: 11px; color: #333; line-height: 1.2;"><strong>Date:</strong> <span style="color: #333; font-weight: bold;">${new Date().toLocaleDateString('en-GB')}</span></p>
                    </div>
                </div>
            </div>
              
              ${userInfo ? `
              <!-- Clean Client Information Section -->
              <div class="quotation-section" style="background: rgba(248, 249, 250, 0.95); padding: 5px 6px; border-radius: 3px; margin: 0 0 4px 0; border: 1px solid rgba(233, 236, 239, 0.8); flex-shrink: 0;">
                  <h3 style="color: #333; margin: 0 0 4px 0; font-size: 13px; border-bottom: 2px solid #333; padding-bottom: 3px; font-weight: bold;">
                      CLIENT INFORMATION
                  </h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                      <div class="quotation-card" style="background: white;">
                          <h4 style="margin: 0 0 4px 0; color: #333; font-size: 12px; font-weight: bold; border-bottom: 1px solid rgba(233, 236, 239, 0.8); padding-bottom: 3px;">CLIENT DETAILS</h4>
                          <p style="margin: 0 0 3px 0; font-weight: bold; color: #333; font-size: 11px; line-height: 1.2;">Name: ${userInfo.fullName}</p>
                          <p style="margin: 0 0 3px 0; color: #666; font-size: 11px; line-height: 1.2;">Email: ${userInfo.email}</p>
                          <p style="margin: 0 0 3px 0; color: #666; font-size: 11px; line-height: 1.2;">Phone: ${userInfo.phoneNumber}</p>
                          ${userInfo.projectTitle ? `<p style="margin: 0 0 3px 0; color: #666; font-size: 11px; line-height: 1.2;">Project Title: ${userInfo.projectTitle}</p>` : ''}
                          ${userInfo.address ? `<p style="margin: 0; color: #666; font-size: 11px; line-height: 1.2;">Address: ${userInfo.address}</p>` : ''}
                      </div>
                      <div class="quotation-card" style="background: white;">
                          <h4 style="margin: 0 0 4px 0; color: #333; font-size: 12px; font-weight: bold; border-bottom: 1px solid rgba(233, 236, 239, 0.8); padding-bottom: 3px;">ORION SALES TEAM</h4>
                          <p style="margin: 0 0 3px 0; color: #666; font-size: 11px; line-height: 1.2;">Location: ${salesUser?.location || 'Delhi'}</p>
                          <p style="margin: 0 0 3px 0; color: #666; font-size: 11px; line-height: 1.2;">Sales Person: ${salesUser ? salesUser.name : 'Ashwani Yadav'}</p>
                          <p style="margin: 0 0 3px 0; color: #666; font-size: 11px; line-height: 1.2;">Contact: ${getSalesPhoneNumber(salesUser)}</p>
                          <p style="margin: 0; color: #666; font-size: 11px; line-height: 1.2;">Email: ${salesUser ? salesUser.email : 'ashwani.yadav@orion-led.com'}</p>
                      </div>
                  </div>
              </div>
              ` : ''}
              
              <!-- Section A: Product Description - Clean Layout -->
            <div class="quotation-section" style="background: rgba(255, 255, 255, 0.95); padding: 5px 6px; border-radius: 3px; margin: 0 0 4px 0; border: 1px solid rgba(233, 236, 239, 0.8);">
                <h2 style="color: #2563eb; margin: 0 0 4px 0; font-size: 14px; border-bottom: 2px solid #2563eb; padding-bottom: 3px; font-weight: bold;">
                    A. PRODUCT DESCRIPTION
                </h2>
                
                <div class="quotation-grid" style="grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; align-items: stretch;">
                    <!-- Left Column - Specifications -->
                    <div class="quotation-card" style="display: flex; flex-direction: column;">
                        <h4 style="margin: 0 0 4px 0; color: #333; font-size: 12px; font-weight: bold; border-bottom: 1px solid rgba(233, 236, 239, 0.8); padding-bottom: 3px;">PRODUCT SPECIFICATIONS</h4>
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <div class="quotation-row">
                                <span class="quotation-label">Series/Environment:</span>
                                <span class="quotation-value">${selectedProduct.category}, ${selectedProduct.environment.charAt(0).toUpperCase() + selectedProduct.environment.slice(1)}</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Pixel Pitch:</span>
                                <span class="quotation-value">P${selectedProduct.pixelPitch}</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Cabinet Dimension:</span>
                                <span class="quotation-value">${selectedProduct.cabinetDimensions.width} x ${selectedProduct.cabinetDimensions.height} mm</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Display Size (m):</span>
                                <span class="quotation-value">${toDisplayUnit(config.width, 'm')} x ${toDisplayUnit(config.height, 'm')}</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Display Size (ft):</span>
                                <span class="quotation-value">${toDisplayUnit(config.width, 'ft')} x ${toDisplayUnit(config.height, 'ft')}</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Resolution:</span>
                                <span class="quotation-value">${selectedProduct.resolution.width * cabinetGrid.columns} x ${selectedProduct.resolution.height * cabinetGrid.rows}</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Matrix:</span>
                                <span class="quotation-value">${cabinetGrid.columns} x ${cabinetGrid.rows}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Column - Pricing -->
                    <div class="quotation-card" style="display: flex; flex-direction: column;">
                        <h4 style="margin: 0 0 4px 0; color: #333; font-size: 12px; font-weight: bold; border-bottom: 1px solid rgba(233, 236, 239, 0.8); padding-bottom: 3px;">PRICING DETAILS</h4>
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <div class="quotation-row">
                                <span class="quotation-label">Unit Price:</span>
                                <span class="quotation-value" style="font-weight: 700;">₹${formatIndianNumber(unitPrice)}</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Quantity:</span>
                                <span class="quotation-value">${selectedProduct.category?.toLowerCase().includes('rental') ? Math.round(safeQuantity) + ' Cabinets' : Math.round(safeQuantity * 100) / 100 + ' Ft²'}</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Subtotal:</span>
                                <span class="quotation-value" style="font-weight: 700;">₹${formatIndianNumber(subtotal)}</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">GST (18%):</span>
                                <span class="quotation-value" style="color: #dc3545; font-weight: 700;">₹${formatIndianNumber(gstProduct)}</span>
                            </div>
                            <div class="quotation-total-row" style="margin-top: auto;">
                                <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 4px 2px; border-bottom: none;">
                                    <span style="font-weight: 700; color: #333; font-size: 12px; text-align: left;">TOTAL:</span>
                                    <span style="color: #333; font-weight: 700; font-size: 12px; text-align: right; white-space: nowrap;">₹${formatIndianNumber(totalProduct)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
            
            ${!isJumboSeries ? `
            <!-- Section B: Control System - Clean Layout -->
            <div class="quotation-section" style="background: rgba(255, 255, 255, 0.95); padding: 4px 5px; border-radius: 3px; margin: 0 0 3px 0; border: 1px solid rgba(233, 236, 239, 0.8);">
                <h2 style="color: #2563eb; margin: 0 0 3px 0; font-size: 13px; border-bottom: 2px solid #2563eb; padding-bottom: 2px; font-weight: bold;">
                    B. CONTROL SYSTEM & ACCESSORIES
                </h2>
                
                <div class="quotation-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; align-items: stretch;">
                    <!-- Left Column - Controller Details -->
                    <div class="quotation-card" style="display: flex; flex-direction: column; padding: 5px 6px;">
                        <h4 style="margin: 0 0 3px 0; color: #333; font-size: 11px; font-weight: bold; border-bottom: 1px solid rgba(233, 236, 239, 0.8); padding-bottom: 2px;">CONTROLLER DETAILS</h4>
                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div class="quotation-row" style="padding: 3px 2px; min-height: 14px;">
                                    <span class="quotation-label" style="font-size: 10px;">Controller Model:</span>
                                    <span class="quotation-value" style="font-size: 10px;">${processor || "Nova TB2"}</span>
                            </div>
                                <div class="quotation-row" style="padding: 3px 2px; min-height: 14px;">
                                    <span class="quotation-label" style="font-size: 10px;">Quantity:</span>
                                    <span class="quotation-value" style="font-size: 10px;">1</span>
                            </div>
                                <div class="quotation-row" style="padding: 3px 2px; min-height: 14px;">
                                    <span class="quotation-label" style="font-size: 10px;">UOM:</span>
                                    <span class="quotation-value" style="font-size: 10px;">Nos.</span>
                                </div>
                            </div>
                            <div class="quotation-total-row" style="background: transparent; border: none; padding: 5px 6px; margin-top: 3px; min-height: 35px; display: flex; align-items: center; visibility: hidden;">
                                <div style="display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; padding: 3px 2px;">
                                    <span style="font-weight: 700; color: #333; font-size: 11px;">TOTAL:</span>
                                    <span style="color: #333; font-weight: 700; font-size: 11px;">₹0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Column - Controller Pricing -->
                    <div class="quotation-card" style="display: flex; flex-direction: column; padding: 5px 6px;">
                        <h4 style="margin: 0 0 3px 0; color: #333; font-size: 11px; font-weight: bold; border-bottom: 1px solid rgba(233, 236, 239, 0.8); padding-bottom: 2px;">CONTROLLER PRICING</h4>
                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div class="quotation-row" style="padding: 3px 2px; min-height: 14px;">
                                    <span class="quotation-label" style="font-size: 10px;">Unit Price:</span>
                                    <span class="quotation-value" style="font-size: 10px; font-weight: 700;">₹${formatIndianNumber(controllerPrice)}</span>
                            </div>
                                <div class="quotation-row" style="padding: 3px 2px; min-height: 14px;">
                                    <span class="quotation-label" style="font-size: 10px;">GST (18%):</span>
                                    <span class="quotation-value" style="font-size: 10px; color: #dc3545; font-weight: 700;">₹${formatIndianNumber(gstController)}</span>
                            </div>
                            </div>
                            <div class="quotation-total-row" style="padding: 5px 6px; margin-top: auto; min-height: 35px;">
                                <div style="display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; padding: 3px 2px; border-bottom: none;">
                                    <span style="font-weight: 700; color: #333; font-size: 11px; text-align: left;">TOTAL:</span>
                                    <span style="color: #333; font-weight: 700; font-size: 11px; text-align: right; white-space: nowrap;">₹${formatIndianNumber(totalController)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- Structure and Installation Price Section (shown for all products) - SEPARATE ROWS -->
            <div class="quotation-section" style="background: rgba(255, 255, 255, 0.95); padding: 5px 6px; border-radius: 3px; margin: 0 0 4px 0; border: 1px solid rgba(233, 236, 239, 0.8);">
                <h2 style="color: #2563eb; margin: 0 0 4px 0; font-size: 14px; border-bottom: 2px solid #2563eb; padding-bottom: 3px; font-weight: bold;">
                    C. STRUCTURE AND INSTALLATION PRICE
                </h2>
                
                <div class="quotation-grid" style="grid-template-columns: 1fr 1fr; gap: 8px; align-items: stretch;">
                    <!-- Structure Cost Card -->
                    <div class="quotation-card" style="display: flex; flex-direction: column;">
                        <h4 style="margin: 0 0 4px 0; color: #333; font-size: 12px; font-weight: bold; border-bottom: 1px solid rgba(233, 236, 239, 0.8); padding-bottom: 3px;">STRUCTURE COST</h4>
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <div class="quotation-row">
                                <span class="quotation-label">Area:</span>
                                <span class="quotation-value">${screenAreaSqFt.toFixed(2)} Ft²</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Base Cost:</span>
                                <span class="quotation-value" style="font-weight: 700;">${(customPricing?.enabled && structureBasePrice === 0)
      ? "In Client Scope"
      : "₹" + formatIndianNumber(structureBasePrice)
    }</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">GST (18%):</span>
                                <span class="quotation-value" style="color: #dc3545; font-weight: 700;">${(customPricing?.enabled && structureBasePrice === 0)
      ? "N/A"
      : "₹" + formatIndianNumber(structureGST)
    }</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Installation Cost Card -->
                    <div class="quotation-card" style="display: flex; flex-direction: column;">
                        <h4 style="margin: 0 0 4px 0; color: #333; font-size: 12px; font-weight: bold; border-bottom: 1px solid rgba(233, 236, 239, 0.8); padding-bottom: 3px;">INSTALLATION COST</h4>
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <div class="quotation-row">
                                <span class="quotation-label">Area:</span>
                                <span class="quotation-value">${screenAreaSqFt.toFixed(2)} Ft²</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Base Cost:</span>
                                <span class="quotation-value" style="font-weight: 700;">${(customPricing?.enabled && installationBasePrice === 0)
      ? "In Client Scope"
      : "₹" + formatIndianNumber(installationBasePrice)
    }</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">GST (18%):</span>
                                <span class="quotation-value" style="color: #dc3545; font-weight: 700;">${(customPricing?.enabled && installationBasePrice === 0)
      ? "N/A"
      : "₹" + formatIndianNumber(installationGST)
    }</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Combined Total Row for Structure + Installation (positioned at bottom right, aligned with Installation Cost card) -->
                <div style="margin-top: 4px; display: flex; justify-content: flex-end;">
                    <div class="quotation-card" style="display: flex; flex-direction: column; padding: 5px 6px; width: calc(50% - 4px);">
                        <div class="quotation-total-row" style="padding: 5px 6px; margin-top: 0; min-height: 35px;">
                            <div style="display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; padding: 3px 2px; border-bottom: none;">
                                <span style="font-weight: 700; color: #333; font-size: 11px; text-align: left;">STRUCTURE + INSTALLATION TOTAL:</span>
                                <span style="color: #333; font-weight: 700; font-size: 11px; text-align: right; white-space: nowrap;">₹${(totalStructure + totalInstallation).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Grand Total - Clean Design -->
            <!-- Fixed: Reduced width and added left margin to prevent QR code overlap -->
            <div class="quotation-section" style="background: rgba(51, 51, 51, 0.95); color: white; padding: 5px 8px; border-radius: 3px; margin: 3px 0 0 40px; text-align: center; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); width: calc(100% - 40px); min-height: auto; box-sizing: border-box;">
                <h2 style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold; line-height: 1.1;">GRAND TOTAL</h2>
                <p style="margin: 0; font-size: 16px; font-weight: bold; line-height: 1.1;">₹${formatIndianNumber(grandTotal)}</p>
                ${!isJumboSeries ? `<p style="margin: 2px 0 0 0; font-size: 9px; opacity: 0.9; line-height: 1.1;">(A + B + C = Product + Processor + Structure + Installation)</p>` : `<p style="margin: 2px 0 0 0; font-size: 9px; opacity: 0.9; line-height: 1.1;">(A + C = Product + Structure + Installation)</p>`}
            </div>
            </div>
        </div>
        <div class="page page-bg" style="background-image: url('/Pages to JPG/7.png'); position: relative;">
            <!-- White overlay to hide background content while keeping footer -->
            <div style="position: absolute; top: 12%; left: 0; right: 0; bottom: 12%; background: white; z-index: 1;"></div>
            <div class="quotation-overlay" style="padding-top: 45mm; padding-bottom: 25mm; padding-left: 8mm; padding-right: 8mm; position: relative; z-index: 2;">
                <div style="background: rgba(255, 255, 255, 0.98); padding: 12px 14px; border-radius: 4px; margin-bottom: 8px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #000000;">
                        <tr style="background: rgba(37, 99, 235, 0.1);">
                            <th colspan="2" style="padding: 10px 12px; text-align: center; color: #000000; font-weight: bold; font-size: 15px; border: 1px solid #000000;">TERMS AND CONDITIONS</th>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; border: 1px solid #000000; font-weight: 600; color: #000000; width: 30%; font-size: 13px;">Validity</td>
                            <td style="padding: 8px 12px; border: 1px solid #000000; color: #000000; font-size: 13px;">
                                ${userInfo?.validity ? userInfo.validity.replace(/\n/g, '<br/>') : '• Offer shall remain valid for period of 30 days from the date of quotation made.<br/>• The current offer is based on USD=INR 88. Any increase in exchange rate beyond 1% at the time of placement of order will lead to increase in INR price'}
                            </td>
                        </tr>
                        <tr style="background: rgba(248, 249, 250, 0.5);">
                            <td style="padding: 8px 12px; border: 1px solid #000000; font-weight: 600; color: #dc3545; font-size: 13px;">GST</td>
                            <td style="padding: 8px 12px; border: 1px solid #000000; color: #dc3545; font-size: 13px;">Extra as applicable at the time of invoicing. The current GST rates are indicated above</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; border: 1px solid #000000; font-weight: 600; color: #000000; font-size: 13px;">Warranty</td>
                            <td style="padding: 8px 12px; border: 1px solid #000000; color: #000000; font-size: 13px;">
                                ${userInfo?.warranty ? userInfo.warranty.replace(/\n/g, '<br/>') : 'LED Display: 24 months from the date of installation or 25 months from the date of supply whichever is earlier.<br/>Controller: 12 months from the date of installation or 13 months from the date of supply whichever is earlier.'}
                            </td>
                        </tr>
                        <tr style="background: rgba(248, 249, 250, 0.5);">
                            <td style="padding: 8px 12px; border: 1px solid #000000; font-weight: 600; color: #000000; font-size: 13px;">Payments Terms</td>
                            <td style="padding: 8px 12px; border: 1px solid #000000; color: #000000; font-size: 13px;">
                                ${userInfo?.paymentTerms ? userInfo.paymentTerms.replace(/\n/g, '<br/>') : '50% Advance at the time of placing order, 40% Before Shipment, 10% At the time of installation'}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; border: 1px solid #000000; font-weight: 600; color: #000000; font-size: 13px;">Bank Account Details</td>
                            <td style="padding: 8px 12px; border: 1px solid #000000; color: #000000; font-size: 13px;">A/C Holder Name - Atenti Origins Photoelectricity Consort Pvt Ltd. Branch Name- ICICI Bank. Sector 50, Noida<br/>A/C Number - 628405020381 IFSC Code - ICIC0006284</td>
                        </tr>
                        <tr style="background: rgba(248, 249, 250, 0.5);">
                            <td style="padding: 8px 12px; border: 1px solid #000000; font-weight: 600; color: #000000; font-size: 13px;">Freight & Insurance</td>
                            <td style="padding: 8px 12px; border: 1px solid #000000; color: #000000; font-size: 13px;">Extra at actuals</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; border: 1px solid #000000; font-weight: 600; color: #000000; font-size: 13px;">Delivery Lead Time</td>
                            <td style="padding: 8px 12px; border: 1px solid #000000; color: #000000; font-size: 13px;">5-6 Weeks From Advance Payment.</td>
                        </tr>
                        <tr style="background: rgba(248, 249, 250, 0.5);">
                            <td style="padding: 8px 12px; border: 1px solid #000000; font-weight: 600; color: #000000; font-size: 13px;">Mode of Transportation</td>
                            <td style="padding: 8px 12px; border: 1px solid #000000; color: #000000; font-size: 13px;">By Road</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; border: 1px solid #000000; font-weight: 600; color: #000000; font-size: 13px;">Structure</td>
                            <td style="padding: 8px 12px; border: 1px solid #000000; color: #000000; font-size: 13px;">The price quoted for the structure is subject to a site visit and structure drawing given by the structure engineer. If not quoted above, then needs to be provided by the customer. If provided by the customer, all the responsibilities and liabilities because of structural issues will lie with the customer</td>
                        </tr>
                        <tr style="background: rgba(248, 249, 250, 0.5);">
                            <td style="padding: 8px 12px; border: 1px solid #000000; font-weight: 600; color: #000000; font-size: 13px;">Spares</td>
                            <td style="padding: 8px 12px; border: 1px solid #000000; color: #000000; font-size: 13px;">2% spares will be supplied with the main supply</td>
                        </tr>
                    </table>
                    <div style="margin-top: 16px; padding: 10px 0;">
                        <p style="margin: 6px 0; color: #dc3545; font-size: 13px; font-weight: 600;">1. Once an order has been placed, it cannot be cancelled.</p>
                        <p style="margin: 6px 0; color: #dc3545; font-size: 13px; font-weight: 600;">2. Above prices are based on the configuration as provided, additional charge will be in client's account if any parts changed.</p>
                        <p style="margin: 6px 0; color: #dc3545; font-size: 13px; font-weight: 600;">3. Electrical wiring & Accessories (MCB, TPN, RCCB), UPS, CAT6 wire, Network cabling, Fabrication, Civil, Electrical, Conduiting at Client end.</p>
                        <p style="margin: 6px 0; color: #dc3545; font-size: 13px; font-weight: 600;">4. Conduiting / Trunking / LAN /Power points /scaffolding/Ladder/SRP etc are Client's scope or by client's Electrical Contractor.</p>
                        <p style="margin: 6px 0; color: #dc3545; font-size: 13px; font-weight: 600;">5. Earthing wire should be of same specification with live & neutral (Client End)</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="page page-bg" style="background-image: url('/Pages to JPG/9.png');">
        </div>
        <div class="page page-bg" style="background-image: url('/Pages to JPG/10.png');">
        </div>
    </body>
    </html>
  `;

  return html;
};

export const generateConfigurationPdf = async (
  config: DisplayConfig,
  selectedProduct: Product,
  cabinetGrid: CabinetGrid,
  processor?: string,
  mode?: string,
  userInfo?: UserInfo,
  salesUser?: { email: string; name: string; contactNumber: string; location: string } | null,
  quotationId?: string,
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  },
  exactPricingBreakdown?: {
    unitPrice?: number;
    quantity?: number;
    subtotal?: number;
    gstAmount?: number;
    processorPrice?: number;
    processorGst?: number;
    grandTotal?: number;
    discount?: {
      discountedProductTotal?: number;
      discountedProcessorTotal?: number;
      discountedGrandTotal?: number;
      discountAmount?: number;
    };
  }
): Promise<Blob> => {
  const html = generateConfigurationHtml(
    config,
    selectedProduct,
    cabinetGrid,
    processor,
    mode,
    userInfo,
    salesUser,
    quotationId,
    customPricing,
    exactPricingBreakdown
  );

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {

    const allImages = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];

    const imageLoadPromises = allImages.map((img, index) => {
      if (img.complete) {
        return Promise.resolve();
      }

      return Promise.race([
        new Promise<void>((resolve) => {
          img.onload = () => {

            resolve();
          };
          img.onerror = (error) => {

            resolve();
          };
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)) // Increased to 5 seconds for production
      ]);
    });

    try {
      await Promise.all(imageLoadPromises);

    } catch (imageError) {

    }

    const pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidthMM = 210;
    const pageHeightMM = 297;

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];

      if (i === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (pageEl.classList.contains('page-bg') && pageEl.querySelector('.quotation-overlay')) {
        const overlay = pageEl.querySelector('.quotation-overlay') as HTMLElement;
        if (overlay) {

          void overlay.offsetHeight;

          const sections = overlay.querySelectorAll('.quotation-section');
          let totalContentHeight = 0;
          sections.forEach((section: Element) => {
            totalContentHeight += (section as HTMLElement).offsetHeight;
          });

          const sectionMargin = 8; // 8px margin between sections
          totalContentHeight += (sections.length - 1) * sectionMargin;

          const availableHeight = overlay.clientHeight;

          if (totalContentHeight > availableHeight) {
            const scaleFactor = Math.min(0.98, availableHeight / totalContentHeight);

            overlay.style.transform = `scale(${scaleFactor})`;
            overlay.style.transformOrigin = 'top left';

            const originalWidth = overlay.offsetWidth;
            const originalHeight = overlay.offsetHeight;
            overlay.style.width = `${originalWidth / scaleFactor}px`;
            overlay.style.height = `${originalHeight / scaleFactor}px`;
          }
        }
      }

      let canvas;
      try {
        canvas = await html2canvas(pageEl, {
          scale: 1.5, // Reduced from 2 for faster processing
          useCORS: true, // Allow cross-origin images
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: pageEl.offsetWidth,
          windowHeight: pageEl.offsetHeight,
          height: pageEl.offsetHeight,
          width: pageEl.offsetWidth,
          allowTaint: true, // Allow tainted canvas for production (needed for some images)
          removeContainer: false, // Keep container for faster processing
          foreignObjectRendering: false, // Disable foreign object rendering for better compatibility
          imageTimeout: 15000, // 15 second timeout for images
        });
      } catch (canvasError: any) {

        throw new Error(`Failed to render page ${i + 1} to canvas: ${canvasError?.message || 'Unknown error'}`);
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      if (i > 0) pdf.addPage();

      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMM, pageHeightMM, undefined, 'FAST');
    }

    const blob = pdf.output('blob');

    if (container.parentNode) {
      document.body.removeChild(container);
    }

    return blob;
  } catch (error) {

    if (container.parentNode) {
      document.body.removeChild(container);
    }

    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate alternate PDF with only pages 1, 6, and 7
 * This is a shorter version of the full quotation PDF
 */
export const generateAlternatePdf = async (
  config: DisplayConfig,
  selectedProduct: Product,
  cabinetGrid: CabinetGrid,
  processor?: string,
  mode?: string,
  userInfo?: UserInfo,
  salesUser?: { email: string; name: string; contactNumber: string; location: string } | null,
  quotationId?: string,
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  },
  exactPricingBreakdown?: {
    unitPrice?: number;
    quantity?: number;
    subtotal?: number;
    gstAmount?: number;
    processorPrice?: number;
    processorGst?: number;
    grandTotal?: number;
    discount?: {
      discountedProductTotal?: number;
      discountedProcessorTotal?: number;
      discountedGrandTotal?: number;
      discountAmount?: number;
    };
  }
): Promise<Blob> => {
  const html = generateConfigurationHtml(
    config,
    selectedProduct,
    cabinetGrid,
    processor,
    mode,
    userInfo,
    salesUser,
    quotationId,
    customPricing,
    exactPricingBreakdown
  );

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const allImages = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];

    const imageLoadPromises = allImages.map((img, index) => {
      if (img.complete) {
        return Promise.resolve();
      }

      return Promise.race([
        new Promise<void>((resolve) => {
          img.onload = () => {
            resolve();
          };
          img.onerror = (error) => {
            resolve();
          };
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 5000))
      ]);
    });

    try {
      await Promise.all(imageLoadPromises);
    } catch (imageError) {
      // Continue even if some images fail to load
    }

    const pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidthMM = 210;
    const pageHeightMM = 297;

    // Pages to include: 1 (index 0), 6 (index 5), 7 (index 6)
    const pagesToInclude = [0, 5, 6];

    for (const pageIndex of pagesToInclude) {
      if (pageIndex >= pages.length) {
        console.warn(`Page ${pageIndex + 1} not found, skipping...`);
        continue;
      }

      const pageEl = pages[pageIndex];

      if (pageIndex === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (pageEl.classList.contains('page-bg') && pageEl.querySelector('.quotation-overlay')) {
        const overlay = pageEl.querySelector('.quotation-overlay') as HTMLElement;
        if (overlay) {
          void overlay.offsetHeight;

          const sections = overlay.querySelectorAll('.quotation-section');
          let totalContentHeight = 0;
          sections.forEach((section: Element) => {
            totalContentHeight += (section as HTMLElement).offsetHeight;
          });

          const sectionMargin = 8;
          totalContentHeight += (sections.length - 1) * sectionMargin;

          const availableHeight = overlay.clientHeight;

          if (totalContentHeight > availableHeight) {
            const scaleFactor = Math.min(0.98, availableHeight / totalContentHeight);

            overlay.style.transform = `scale(${scaleFactor})`;
            overlay.style.transformOrigin = 'top left';

            const originalWidth = overlay.offsetWidth;
            const originalHeight = overlay.offsetHeight;
            overlay.style.width = `${originalWidth / scaleFactor}px`;
            overlay.style.height = `${originalHeight / scaleFactor}px`;
          }
        }
      }

      let canvas;
      try {
        canvas = await html2canvas(pageEl, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: pageEl.offsetWidth,
          windowHeight: pageEl.offsetHeight,
          height: pageEl.offsetHeight,
          width: pageEl.offsetWidth,
          allowTaint: true,
          removeContainer: false,
          foreignObjectRendering: false,
          imageTimeout: 15000,
        });
      } catch (canvasError: any) {
        throw new Error(`Failed to render page ${pageIndex + 1} to canvas: ${canvasError?.message || 'Unknown error'}`);
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      if (pageIndex !== pagesToInclude[0]) pdf.addPage();

      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMM, pageHeightMM, undefined, 'FAST');
    }

    const blob = pdf.output('blob');

    if (container.parentNode) {
      document.body.removeChild(container);
    }

    return blob;
  } catch (error) {
    if (container.parentNode) {
      document.body.removeChild(container);
    }

    throw new Error(`Failed to generate alternate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

