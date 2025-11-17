import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun, Media } from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DisplayConfig, Product, CabinetGrid } from '../types';
import { getProcessorPrice } from './processorPrices';
import { calculateCentralizedPricing } from './centralizedPricing';

// For HTML to DOCX conversion, we'll use a browser-compatible approach
// Using the existing docx library with HTML content processed for Word compatibility

// Phone number mapping for sales team members
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

// Default phone number fallback
const DEFAULT_PHONE_NUMBER = '98391 77083';

// Function to get the correct phone number for a sales user
const getSalesPhoneNumber = (salesUser: { email: string; name: string; contactNumber: string; location: string } | null | undefined): string => {
  if (!salesUser) {
    return DEFAULT_PHONE_NUMBER;
  }
  
  // Check if we have a specific mapping for this email
  const mappedPhone = SALES_PHONE_MAPPING[salesUser.email.toLowerCase()];
  if (mappedPhone) {
    return mappedPhone;
  }
  
  // Fall back to the contact number from the user object, or default
  return salesUser.contactNumber || DEFAULT_PHONE_NUMBER;
};
//

//

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
  }
): Promise<Blob> => {
  try {
    // Generate the HTML content using the same function as PDF export
    const htmlContent = generateConfigurationHtml(
      config,
      selectedProduct,
      cabinetGrid,
      processor,
      mode,
      userInfo,
      salesUser,
      quotationId,
      customPricing
    );
    
    // For browser-compatible DOCX export, we convert HTML pages to images
    // and embed them in DOCX. This ensures pixel-perfect rendering.
    
    // Create a temporary container to render the HTML
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.background = '#ffffff';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    
    // Wait for images to load
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
    
    // Small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get all page elements
    const pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    
    if (pages.length === 0) {
      document.body.removeChild(container);
      throw new Error('No pages found in HTML content');
    }
    
    // A4 dimensions conversion:
    // - For images: Use EMU (English Metric Units), 1 inch = 914400 EMU
    // - For page size: Use twips, 1 inch = 1440 twips
    // A4: 210mm x 297mm = 8.2677" x 11.6929"
    const A4_WIDTH_INCHES = 210 / 25.4;
    const A4_HEIGHT_INCHES = 297 / 25.4;
    
    // Image dimensions in EMU
    const A4_WIDTH_EMU = Math.round(A4_WIDTH_INCHES * 914400);
    const A4_HEIGHT_EMU = Math.round(A4_HEIGHT_INCHES * 914400);
    
    // Page size in twips (1 inch = 1440 twips)
    const A4_WIDTH_TWIPS = Math.round(A4_WIDTH_INCHES * 1440);
    const A4_HEIGHT_TWIPS = Math.round(A4_HEIGHT_INCHES * 1440);
    
    const docChildren: any[] = [];
    
    // Convert each page to an image and add to DOCX
    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];
      
      try {
        // Convert page to canvas with high quality
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
        
        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/png', 1.0); // Maximum quality
        });
        
        // Convert blob to ArrayBuffer, then to Uint8Array
        // docx library works with Uint8Array in browser environments
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Create image run with exact A4 dimensions in EMU
        // docx library v9 expects data as Uint8Array and transformation in EMU
        const imageRun = new ImageRun({
          data: uint8Array,
          transformation: {
            width: A4_WIDTH_EMU,
            height: A4_HEIGHT_EMU,
          },
        });
        
        // Add paragraph with image
        docChildren.push(
          new Paragraph({
            children: [imageRun],
            spacing: { after: 0, before: 0 },
          })
        );
        
        // Add page break after each page (except the last)
        if (i < pages.length - 1) {
          docChildren.push(
            new Paragraph({
              children: [],
              pageBreakBefore: true,
            })
          );
        }
      } catch (error) {
        console.error(`Error converting page ${i + 1} to image:`, error);
        // Continue with next page if one fails
      }
    }
    
    // Remove temporary container
    document.body.removeChild(container);
    
    // Create document with proper A4 dimensions in twips
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
    
    // Generate blob
    const blob = await Packer.toBlob(doc);
    return blob;
  } catch (error) {
    console.error('Error generating DOCX from HTML:', error);
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
}

// Function to generate HTML preview of the configuration
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
  }
): string => {
  // Calculate display area
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

  // Calculate diagonal
  const diagonalMeters = Math.sqrt(Math.pow(config.width/1000, 2) + Math.pow(config.height/1000, 2));
  void diagonalMeters;

  // Calculate power consumption
  const avgPowerPerCabinet = selectedProduct.avgPowerConsumption || 91.7;
  const maxPowerPerCabinet = selectedProduct.maxPowerConsumption || (avgPowerPerCabinet * 3);
  void avgPowerPerCabinet; void maxPowerPerCabinet;

  // Calculate total pixels
  void cabinetGrid; void selectedProduct;

  // Calculate pricing based on actual product data for HTML
  const getProductPriceForHtml = (product: Product, userType: 'End User' | 'Reseller' | 'Channel' = 'End User'): number => {
    // Handle different product types
    if (product.category?.toLowerCase().includes('rental') && product.prices) {
      // For rental products, use cabinet pricing based on user type
      if (userType === 'Reseller') {
        return product.prices.cabinet.reseller;
      } else if (userType === 'Channel') {
        return product.prices.cabinet.siChannel;
      } else {
        return product.prices.cabinet.endCustomer;
      }
    }
    
    // For regular products, use the appropriate price field based on user type
    if (userType === 'Reseller' && typeof product.resellerPrice === 'number') {
      return product.resellerPrice;
    } else if (userType === 'Channel' && typeof product.siChannelPrice === 'number') {
      return product.siChannelPrice;
    } else if (typeof product.price === 'number') {
      return product.price;
    } else if (typeof product.price === 'string') {
      // Handle string prices by converting to number
      const parsedPrice = parseFloat(product.price);
      return isNaN(parsedPrice) ? 5300 : parsedPrice;
    }
    
    // Fallback to default pricing if no price available
    return 5300;
  };

  const unitPrice = getProductPriceForHtml(selectedProduct, userInfo?.userType);
  
  // Check if product is Jumbo Series (prices already include controllers)
  const isJumboSeries = selectedProduct.category?.toLowerCase().includes('jumbo') || 
                        selectedProduct.id?.toLowerCase().startsWith('jumbo-') ||
                        selectedProduct.name?.toLowerCase().includes('jumbo series');
  
  // Calculate quantity based on product type
  let quantity: number;
  if (selectedProduct.category?.toLowerCase().includes('rental')) {
    // For rental series, calculate quantity as number of cabinets
    quantity = cabinetGrid.columns * cabinetGrid.rows;
  } else if (isJumboSeries) {
    // For Jumbo Series, use fixed area-based pricing
    const pixelPitch = selectedProduct.pixelPitch;
    
    if (pixelPitch === 4 || pixelPitch === 2.5) {
      // P4 and P2.5: Fixed area = 7.34ft × 4.72ft = 34.64 sqft
      const widthInFeet = 7.34;
      const heightInFeet = 4.72;
      const fixedQuantity = widthInFeet * heightInFeet;
      
      console.log('🎯 HTML Jumbo Series P4/P2.5 Fixed Pricing:', {
        product: selectedProduct.name,
        pixelPitch,
        fixedArea: `${widthInFeet}ft × ${heightInFeet}ft`,
        quantity: fixedQuantity.toFixed(2) + ' sqft'
      });
      
      quantity = Math.round(fixedQuantity * 100) / 100; // 34.64 sqft
    } else if (pixelPitch === 3 || pixelPitch === 6) {
      // P3 and P6: Fixed area = 6.92ft × 5.04ft = 34.88 sqft
      const widthInFeet = 6.92;
      const heightInFeet = 5.04;
      const fixedQuantity = widthInFeet * heightInFeet;
      
      console.log('🎯 HTML Jumbo Series P3/P6 Fixed Pricing:', {
        product: selectedProduct.name,
        pixelPitch,
        fixedArea: `${widthInFeet}ft × ${heightInFeet}ft`,
        quantity: fixedQuantity.toFixed(2) + ' sqft'
      });
      
      quantity = Math.round(fixedQuantity * 100) / 100; // 34.88 sqft
    } else {
      quantity = 1; // Fallback
    }
  } else {
    // For other products, calculate quantity in square feet
    const widthInMeters = config.width / 1000;
    const heightInMeters = config.height / 1000;
    const widthInFeet = widthInMeters * METERS_TO_FEET;
    const heightInFeet = heightInMeters * METERS_TO_FEET;
    const rawQuantity = widthInFeet * heightInFeet;
    
    // Round to 2 decimal places for consistency with calculation
    quantity = Math.round(rawQuantity * 100) / 100;
  }
  
  // Ensure quantity is a reasonable number and handle edge cases
  const safeQuantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
  const subtotal = unitPrice * safeQuantity;
  const gstProduct = subtotal * 0.18;
  const totalProduct = subtotal + gstProduct;
  
  
  // Controller pricing - use SAME LOGIC as quotation calculation
  // Note: Skip controller price for Jumbo Series products as their prices already include controllers
  let controllerPrice = 0;
  if (processor && !isJumboSeries) {
    // Use centralized processor pricing
    controllerPrice = getProcessorPrice(processor, userInfo?.userType || 'End User');
  }
  
  const gstController = controllerPrice * 0.18;
  const totalController = controllerPrice + gstController;
  
  // Calculate screen area in square feet for Structure and Installation pricing
  // This should always be based on actual display dimensions, not quantity
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const screenAreaSqFt = Math.round((widthInFeet * heightInFeet) * 100) / 100;
  
  // Structure and Installation pricing - use custom if enabled, otherwise use default calculation
  let structureBasePrice: number;
  let installationBasePrice: number;
  
  if (customPricing?.enabled && customPricing.structurePrice !== null && customPricing.installationPrice !== null) {
    // Use custom pricing (base prices without GST)
    structureBasePrice = customPricing.structurePrice;
    installationBasePrice = customPricing.installationPrice;
  } else {
    // Default calculation: Structure Price: ₹2500 per square foot, Installation Price: ₹500 per square foot
    structureBasePrice = screenAreaSqFt * 2500;
    installationBasePrice = screenAreaSqFt * 500;
  }
  
  // Calculate GST on structure and installation (always 18%)
  const structureGST = structureBasePrice * 0.18;
  const totalStructure = structureBasePrice + structureGST;
  
  const installationGST = installationBasePrice * 0.18;
  const totalInstallation = installationBasePrice + installationGST;
  
  const combinedStructureInstallationBase = structureBasePrice + installationBasePrice;
  const combinedStructureInstallationGST = structureGST + installationGST;
  const combinedStructureInstallationTotal = totalStructure + totalInstallation;
  
  // Update grand total to include Structure and Installation
  const grandTotal = totalProduct + totalController + totalStructure + totalInstallation;

  // Format Indian number with clean formatting
  const formatIndianNumber = (x: number): string => {
    // Round to whole numbers for cleaner display
    const rounded = Math.round(x);
    
    // Convert to string
    const s = rounded.toString();
    
    // Format with Indian numbering system (commas for thousands)
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
                                <span class="quotation-label">Module Dimension:</span>
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
            
            <!-- Structure and Installation Price Section (shown for all products) -->
            <div class="quotation-section" style="background: rgba(255, 255, 255, 0.95); padding: 5px 6px; border-radius: 3px; margin: 0 0 4px 0; border: 1px solid rgba(233, 236, 239, 0.8);">
                <h2 style="color: #2563eb; margin: 0 0 4px 0; font-size: 14px; border-bottom: 2px solid #2563eb; padding-bottom: 3px; font-weight: bold;">
                    C. STRUCTURE AND INSTALLATION PRICE
                </h2>
                
                <div class="quotation-grid" style="grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; align-items: stretch;">
            <div class="quotation-card" style="display: flex; flex-direction: column;">
                    <h4 style="margin: 0 0 4px 0; color: #333; font-size: 12px; font-weight: bold; border-bottom: 1px solid rgba(233, 236, 239, 0.8); padding-bottom: 3px;">STRUCTURE + INSTALLATION TOTAL</h4>
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <div class="quotation-row">
                            <span class="quotation-label">Total Area:</span>
                            <span class="quotation-value">${screenAreaSqFt.toFixed(2)} Ft²</span>
                        </div>
                        <div class="quotation-row">
                            <span class="quotation-label">Combined Base Cost:</span>
                            <span class="quotation-value" style="font-weight: 700;">₹${formatIndianNumber(combinedStructureInstallationBase)}</span>
                        </div>
                        <div class="quotation-row">
                            <span class="quotation-label">Combined GST (18%):</span>
                            <span class="quotation-value" style="color: #dc3545; font-weight: 700;">₹${formatIndianNumber(combinedStructureInstallationGST)}</span>
                        </div>
                        <div class="quotation-total-row" style="margin-top: auto;">
                            <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 4px 2px; border-bottom: none;">
                                <span style="font-weight: 700; color: #333; font-size: 12px; text-align: left;">TOTAL:</span>
                                <span style="color: #333; font-weight: 700; font-size: 12px; text-align: right; white-space: nowrap;">₹${formatIndianNumber(combinedStructureInstallationTotal)}</span>
                            </div>
                        </div>
                    </div>
            </div>
                </div>
            </div>
            
            <!-- Grand Total - Clean Design -->
            <div class="quotation-section" style="background: rgba(51, 51, 51, 0.95); color: white; padding: 5px 8px; border-radius: 3px; margin: 3px 0 0 0; text-align: center; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); width: 100%; min-height: auto;">
                <h2 style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold; line-height: 1.1;">GRAND TOTAL</h2>
                <p style="margin: 0; font-size: 16px; font-weight: bold; line-height: 1.1;">₹${formatIndianNumber(grandTotal)}</p>
                ${!isJumboSeries ? `<p style="margin: 2px 0 0 0; font-size: 9px; opacity: 0.9; line-height: 1.1;">(A + B + C)</p>` : `<p style="margin: 2px 0 0 0; font-size: 9px; opacity: 0.9; line-height: 1.1;">(A + C)</p>`}
            </div>
            </div>
        </div>
        <div class="page page-bg" style="background-image: url('/Pages to JPG/7.png');">
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


// Generate a PDF by rendering the HTML report pages into an A4 PDF
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
    customPricing
  );

  // Create offscreen container to render HTML
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  // Wait for images to load to avoid blank canvases
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

  const pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidthMM = 210;
  const pageHeightMM = 297;

  for (let i = 0; i < pages.length; i++) {
    const pageEl = pages[i];
    
    // Wait a bit for layout to stabilize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // For page 6 (quotation page), ensure content fits within A4
    if (pageEl.classList.contains('page-bg') && pageEl.querySelector('.quotation-overlay')) {
      const overlay = pageEl.querySelector('.quotation-overlay') as HTMLElement;
      if (overlay) {
        // Force a reflow to get accurate measurements
        void overlay.offsetHeight;
        
        // Get the actual content height (including all children)
        const sections = overlay.querySelectorAll('.quotation-section');
        let totalContentHeight = 0;
        sections.forEach((section: Element) => {
          totalContentHeight += (section as HTMLElement).offsetHeight;
        });
        
        // Add margins between sections
        const sectionMargin = 8; // 8px margin between sections
        totalContentHeight += (sections.length - 1) * sectionMargin;
        
        const availableHeight = overlay.clientHeight;
        
        // If content overflows, calculate scale factor to fit
        if (totalContentHeight > availableHeight) {
          const scaleFactor = Math.min(0.98, availableHeight / totalContentHeight);
          
          // Apply scaling to the overlay
          overlay.style.transform = `scale(${scaleFactor})`;
          overlay.style.transformOrigin = 'top left';
          
          // Adjust dimensions to account for scaling
          const originalWidth = overlay.offsetWidth;
          const originalHeight = overlay.offsetHeight;
          overlay.style.width = `${originalWidth / scaleFactor}px`;
          overlay.style.height = `${originalHeight / scaleFactor}px`;
        }
      }
    }
    
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: pageEl.offsetWidth,
      windowHeight: pageEl.offsetHeight,
      height: pageEl.offsetHeight,
      width: pageEl.offsetWidth,
      allowTaint: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) pdf.addPage();
    
    // Always fit to A4 dimensions exactly (210mm x 297mm)
    // This ensures no cropping or stretching
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMM, pageHeightMM, undefined, 'FAST');
  }

  const blob = pdf.output('blob');
  document.body.removeChild(container);
  return blob;
};



