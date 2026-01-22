import { Document, Packer, Paragraph, ImageRun } from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DisplayConfig, Product, CabinetGrid } from '../types';
import { getProcessorPrice } from './processorPrices';

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
      customPricing,
      exactPricingBreakdown
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

    const docChildren: (Paragraph)[] = [];

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
        // @ts-expect-error - ImageRun type definition doesn't match actual usage
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
  paymentTerms?: string;
  warranty?: string;
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
  const diagonalMeters = Math.sqrt(Math.pow(config.width / 1000, 2) + Math.pow(config.height / 1000, 2));
  void diagonalMeters;

  // Calculate power consumption
  const avgPowerPerCabinet = selectedProduct.avgPowerConsumption || 91.7;
  const maxPowerPerCabinet = selectedProduct.maxPowerConsumption || (avgPowerPerCabinet * 3);
  void avgPowerPerCabinet; void maxPowerPerCabinet;

  // Calculate total pixels
  void cabinetGrid; void selectedProduct;

  // Normalize user type coming from UI/legacy flows to the values expected by pricing helpers
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

  // Calculate pricing based on actual product data for HTML
  const getProductPriceForHtml = (product: Product, userType: 'End User' | 'Reseller' | 'Channel' | 'SI/Channel Partner' = 'End User'): number => {
    const normalizedUserType = normalizeLegacyUserType(userType);
    // Handle different product types
    if (product.category?.toLowerCase().includes('rental') && product.prices) {
      // For rental products, use cabinet pricing based on user type
      if (normalizedUserType === 'Reseller') {
        return product.prices.cabinet.reseller;
      } else if (normalizedUserType === 'Channel') {
        return product.prices.cabinet.siChannel;
      } else {
        return product.prices.cabinet.endCustomer;
      }
    }

    // For regular products, use the appropriate price field based on user type
    if (normalizedUserType === 'Reseller' && typeof product.resellerPrice === 'number') {
      return product.resellerPrice;
    } else if (normalizedUserType === 'Channel' && typeof product.siChannelPrice === 'number') {
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

  let unitPrice = getProductPriceForHtml(selectedProduct, userInfo?.userType);

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

  // CRITICAL: If exactPricingBreakdown is provided (from saved quotation with discount),
  // use those values instead of recalculating. This ensures discounted values appear in PDF.
  let totalProduct: number;
  let totalController: number;
  let totalStructure: number;
  let totalInstallation: number;
  let grandTotal: number;

  // Calculate safeQuantity, subtotal, gstProduct, controllerPrice, gstController, and screenAreaSqFt for use in HTML template (needed regardless of discount path)
  // Use let instead of const so we can update these when discount is applied
  let safeQuantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
  let subtotal = unitPrice * safeQuantity;
  let gstProduct = subtotal * 0.18;

  // Controller pricing - use SAME LOGIC as quotation calculation
  // Note: Skip controller price for Jumbo Series products as their prices already include controllers
  let controllerPrice = 0;
  if (processor && !isJumboSeries) {
    // Use centralized processor pricing
    controllerPrice = getProcessorPrice(processor, userInfo?.userType || 'End User');
  }
  let gstController = controllerPrice * 0.18;

  // Calculate screen area in square feet for Structure and Installation pricing (needed for HTML template)
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const screenAreaSqFt = Math.round((widthInFeet * heightInFeet) * 100) / 100;

  // Calculate structure and installation base prices (needed for HTML template regardless of discount path)
  let structureBasePrice: number;
  let installationBasePrice: number;

  if (customPricing?.enabled && customPricing.structurePrice !== null && customPricing.installationPrice !== null) {
    structureBasePrice = customPricing.structurePrice;
    installationBasePrice = customPricing.installationPrice;
  } else {
    // Structure Price: Indoor = ₹4000 per cabinet, Outdoor = ₹2500 per sq.ft
    const normalizedEnv = selectedProduct.environment?.toLowerCase().trim();
    if (normalizedEnv === 'indoor') {
      // Indoor: ₹4000 per cabinet
      const numberOfCabinets = cabinetGrid.columns * cabinetGrid.rows;
      structureBasePrice = numberOfCabinets * 4000;
    } else {
      // Outdoor: ₹2500 per sq.ft
      structureBasePrice = screenAreaSqFt * 2500;
    }
    installationBasePrice = screenAreaSqFt * 500;
  }

  // Calculate GST on structure and installation (always 18%)
  const structureGST = structureBasePrice * 0.18;
  const installationGST = installationBasePrice * 0.18;

  if (exactPricingBreakdown) {
    // ALWAYS use stored values if available to match the original PDF exactly
    if (exactPricingBreakdown.unitPrice !== undefined) unitPrice = exactPricingBreakdown.unitPrice;
    if (exactPricingBreakdown.quantity !== undefined) {
      quantity = exactPricingBreakdown.quantity;
      safeQuantity = quantity; // Update safeQuantity to match
    }

    // Load base values from breakdown (prioritize stored values over current calculation)
    if (exactPricingBreakdown.subtotal !== undefined) subtotal = exactPricingBreakdown.subtotal;
    // gstAmount in DB is usually the GST for the product
    if (exactPricingBreakdown.gstAmount !== undefined) gstProduct = exactPricingBreakdown.gstAmount;

    if (exactPricingBreakdown.processorPrice !== undefined) controllerPrice = exactPricingBreakdown.processorPrice;
    if (exactPricingBreakdown.processorGst !== undefined) gstController = exactPricingBreakdown.processorGst;

    if (exactPricingBreakdown.discount) {
      // Use discounted values from saved quotation
      // These values already have discount applied silently
      const discountedProductTotal = exactPricingBreakdown.discount.discountedProductTotal;
      const discountedProcessorTotal = exactPricingBreakdown.discount.discountedProcessorTotal;
      const discountedGrandTotal = exactPricingBreakdown.discount.discountedGrandTotal;

      // CRITICAL: Recalculate base values from discounted totals for display in PDF
      // When discount is on LED, recalculate subtotal and gstProduct from discounted total
      if (discountedProductTotal !== undefined) {
        // Discount was applied to product total (which includes GST)
        // Reverse calculate: discountedTotal = subtotal + gst, where gst = subtotal * 0.18
        // So: discountedTotal = subtotal * 1.18
        // Therefore: subtotal = discountedTotal / 1.18
        const originalSubtotal = subtotal;
        const originalGstProduct = gstProduct;

        subtotal = Math.round((discountedProductTotal / 1.18) * 100) / 100;
        gstProduct = Math.round((subtotal * 0.18) * 100) / 100;
        totalProduct = discountedProductTotal;

        console.log('💰 PDF - Discount on LED applied (recalculated base values):', {
          originalSubtotal,
          originalGstProduct,
          originalTotalProduct: originalSubtotal + originalGstProduct,
          discountedSubtotal: subtotal,
          discountedGstProduct: gstProduct,
          discountedTotalProduct: totalProduct
        });
      } else {
        totalProduct = subtotal + gstProduct;
      }

      // When discount is on controller, recalculate controllerPrice and gstController
      if (discountedProcessorTotal !== undefined) {
        const originalControllerPrice = controllerPrice;
        const originalGstController = gstController;

        // Discount was applied to processor total (which includes GST)
        controllerPrice = Math.round((discountedProcessorTotal / 1.18) * 100) / 100;
        gstController = Math.round((controllerPrice * 0.18) * 100) / 100;
        totalController = discountedProcessorTotal;

        console.log('💰 PDF - Discount on Controller applied (recalculated base values):', {
          originalControllerPrice,
          originalGstController,
          originalTotalController: originalControllerPrice + originalGstController,
          discountedControllerPrice: controllerPrice,
          discountedGstController: gstController,
          discountedTotalController: totalController
        });
      } else {
        totalController = controllerPrice + gstController;
      }

      grandTotal = discountedGrandTotal || exactPricingBreakdown.grandTotal || 0;

      console.log('💰 PDF using discounted values from exactPricingBreakdown:', {
        subtotal,
        gstProduct,
        totalProduct,
        controllerPrice,
        gstController,
        totalController,
        grandTotal
      });
    } else {
      // No discount, but we have exact breakdown - use it directly
      totalProduct = subtotal + gstProduct;
      totalController = controllerPrice + gstController;

      // If grandTotal is in breakdown, use it, otherwise calculate
      // Note: structure/installation are added below if not in grandTotal
      // Typically grandTotal in breakdown includes EVERYTHING
      if (exactPricingBreakdown.grandTotal) {
        grandTotal = exactPricingBreakdown.grandTotal;
      } else {
        // Fallback calculation
        grandTotal = totalProduct + totalController + structureBasePrice + structureGST + installationBasePrice + installationGST;
      }
    }

    // Structure and installation totals (independent of discount typically, unless grandTotal covered them)
    // If grandTotal was taken from breakdown, it includes these.
    // But for the individual section display (if needed), we calculate them:
    totalStructure = structureBasePrice + structureGST;
    totalInstallation = installationBasePrice + installationGST;

  } else {
    // Calculate prices normally (no discount or exactPricingBreakdown not provided)
    // safeQuantity, subtotal, gstProduct, controllerPrice, gstController, screenAreaSqFt, structureBasePrice, installationBasePrice, structureGST, and installationGST are already calculated above for use in HTML template
    totalProduct = subtotal + gstProduct;
    totalController = controllerPrice + gstController;
    totalStructure = structureBasePrice + structureGST;
    totalInstallation = installationBasePrice + installationGST;

    // Update grand total to include Structure and Installation (separate, never combined)
    grandTotal = totalProduct + totalController + totalStructure + totalInstallation;
  }

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
                                <span class="quotation-value" style="font-weight: 700;">₹${formatIndianNumber(structureBasePrice)}</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">GST (18%):</span>
                                <span class="quotation-value" style="color: #dc3545; font-weight: 700;">₹${formatIndianNumber(structureGST)}</span>
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
                                <span class="quotation-value" style="font-weight: 700;">₹${formatIndianNumber(installationBasePrice)}</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">GST (18%):</span>
                                <span class="quotation-value" style="color: #dc3545; font-weight: 700;">₹${formatIndianNumber(installationGST)}</span>
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

  // Create offscreen container to render HTML
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Wait for images to load to avoid blank canvases
    // Use Promise.race with timeout to avoid long waits
    // Increased timeout for production environments where images may load slower
    const allImages = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    console.log(`📸 Found ${allImages.length} images to load for PDF generation`);

    const imageLoadPromises = allImages.map((img, index) => {
      if (img.complete) {
        return Promise.resolve();
      }

      return Promise.race([
        new Promise<void>((resolve) => {
          img.onload = () => {
            console.log(`✅ Image ${index + 1}/${allImages.length} loaded successfully`);
            resolve();
          };
          img.onerror = (error) => {
            console.warn(`⚠️ Image ${index + 1}/${allImages.length} failed to load:`, img.src.substring(0, 100), error);
            // Still resolve to continue PDF generation even if some images fail
            resolve();
          };
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)) // Increased to 5 seconds for production
      ]);
    });

    try {
      await Promise.all(imageLoadPromises);
      console.log('✅ All images processed for PDF generation');
    } catch (imageError) {
      console.warn('⚠️ Some images may not have loaded, continuing with PDF generation:', imageError);
    }

    const pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidthMM = 210;
    const pageHeightMM = 297;

    // Process all pages with minimal delays
    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];

      // Minimal delay only for first page to ensure initial layout, then process quickly
      if (i === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

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

      // Optimized html2canvas settings for faster processing
      // Reduced scale from 2 to 1.5 for better performance while maintaining quality
      // Production-friendly settings: useCORS and allowTaint for cross-origin images
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
        console.error(`❌ html2canvas error on page ${i + 1}:`, canvasError);
        throw new Error(`Failed to render page ${i + 1} to canvas: ${canvasError?.message || 'Unknown error'}`);
      }

      // Reduced JPEG quality from 0.95 to 0.85 for faster processing and smaller file size
      // Quality 0.85 is still excellent for PDFs
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      if (i > 0) pdf.addPage();

      // Always fit to A4 dimensions exactly (210mm x 297mm)
      // This ensures no cropping or stretching
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMM, pageHeightMM, undefined, 'FAST');
    }

    const blob = pdf.output('blob');

    // Clean up container
    if (container.parentNode) {
      document.body.removeChild(container);
    }

    return blob;
  } catch (error) {
    // Clean up container on error
    if (container.parentNode) {
      document.body.removeChild(container);
    }

    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};



