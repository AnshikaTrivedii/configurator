import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun, SectionType } from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import { getProcessorPrice } from './processorPrices.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root (one level up from backend)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATE_PATH = path.join(PROJECT_ROOT, 'public', 'assets', 'docs', 'template.docx');

// Phone number mapping for sales team members
const SALES_PHONE_MAPPING = {
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

const getSalesPhoneNumber = (salesUser) => {
  if (!salesUser) return DEFAULT_PHONE_NUMBER;
  const mappedPhone = SALES_PHONE_MAPPING[salesUser.email?.toLowerCase()];
  return mappedPhone || salesUser.contactNumber || DEFAULT_PHONE_NUMBER;
};

// Format Indian number with commas
const formatIndianNumber = (x) => {
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

// Convert mm to display unit
const toDisplayUnit = (mm, unit) => {
  if (unit === 'm') {
    return (mm / 1000).toFixed(2);
  } else if (unit === 'ft') {
    return (mm / 304.8).toFixed(2);
  }
  return mm.toFixed(2);
};

// Get product price for Word document
const getProductPriceForWord = (product, userType) => {
  if (!product || !product.pricing) return 0;
  
  const pricing = product.pricing;
  if (userType === 'Sales' && pricing.salesPrice !== undefined && pricing.salesPrice !== null) {
    return pricing.salesPrice;
  }
  if (userType === 'End User' && pricing.endUserPrice !== undefined && pricing.endUserPrice !== null) {
    return pricing.endUserPrice;
  }
  return pricing.basePrice || 0;
};

// Check if product is Jumbo series
const isJumboSeriesProduct = (product) => {
  return product.category?.toLowerCase().includes('jumbo') || 
         product.id?.toLowerCase().startsWith('jumbo-') ||
         product.name?.toLowerCase().includes('jumbo series');
};

// Calculate quantity
const calculateQuantity = (product, cabinetGrid, config) => {
  const isRental = product.category?.toLowerCase().includes('rental');
  
  if (isRental) {
    return cabinetGrid.rows * cabinetGrid.columns;
  }
  
  const METERS_TO_FEET = 3.2808399;
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  return widthInFeet * heightInFeet;
};

// Extract pages from template.docx
// Since DOCX doesn't have explicit pages, we'll use sections
const extractTemplatePages = async () => {
  try {
    if (!fs.existsSync(TEMPLATE_PATH)) {
      throw new Error(`Template file not found: ${TEMPLATE_PATH}`);
    }

    const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
    
    // Use PizZip to read the DOCX (which is a ZIP file)
    const zip = new PizZip(templateBuffer);
    
    // Read the main document XML
    const documentXml = zip.files['word/document.xml'];
    if (!documentXml) {
      throw new Error('Template document.xml not found');
    }
    
    // Read document.xml.rels to get relationships (for images, etc.)
    const relsXml = zip.files['word/_rels/document.xml.rels'];
    
    // Read the document properties
    const appProps = zip.files['docProps/app.xml'];
    const coreProps = zip.files['docProps/core.xml'];

    return {
      zip,
      documentXml: documentXml.asText(),
      relsXml: relsXml ? relsXml.asText() : null,
      appProps: appProps ? appProps.asText() : null,
      coreProps: coreProps ? coreProps.asText() : null,
    };
  } catch (error) {
    console.error('❌ Error extracting template pages:', error);
    throw error;
  }
};

// Convert template page to image (for use as background)
// This is a simplified approach - we'll use the template's structure directly
const convertTemplatePageToImage = async (templateData, pageNumber) => {
  // For now, we'll use a different approach:
  // Instead of converting to image, we'll preserve the template structure
  // and use it as a background by embedding it in a table cell
  
  // A4 dimensions in EMU
  const A4_WIDTH_EMU = Math.round((210 / 25.4) * 914400);
  const A4_HEIGHT_EMU = Math.round((297 / 25.4) * 914400);
  
  // For pages 1-5, 7, 9, 10, we'll need to render the template page
  // Since we can't easily extract individual pages from DOCX,
  // we'll use the template's document structure and create sections
  
  // This is a placeholder - actual implementation would need to:
  // 1. Parse the template's document.xml
  // 2. Extract the section for the specific page
  // 3. Convert it to an image or preserve as DOCX structure
  
  return null; // Will be implemented based on template structure
};

// Create quotation content for page 6
const createQuotationContent = (data) => {
  const {
    config,
    selectedProduct,
    cabinetGrid,
    processor,
    userInfo,
    salesUser,
    quotationId,
    customPricing
  } = data;

  // Calculate pricing using exact PDF logic
  const userType = userInfo?.userType || 'End User';
  const unitPrice = getProductPriceForWord(selectedProduct, userType);
  const quantity = calculateQuantity(selectedProduct, cabinetGrid, config);
  const safeQuantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
  
  const subtotal = Math.round((unitPrice * safeQuantity) * 100) / 100;
  const gstProduct = Math.round((subtotal * 0.18) * 100) / 100;
  const totalProduct = Math.round((subtotal + gstProduct) * 100) / 100;
  
  const isJumboSeries = isJumboSeriesProduct(selectedProduct);
  
  let controllerPrice = 0;
  if (processor && !isJumboSeries) {
    controllerPrice = getProcessorPrice(processor, userType);
  }
  const gstController = Math.round((controllerPrice * 0.18) * 100) / 100;
  const totalController = Math.round((controllerPrice + gstController) * 100) / 100;
  
  // Structure and Installation pricing
  const METERS_TO_FEET = 3.2808399;
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const screenAreaSqFt = Math.round((widthInFeet * heightInFeet) * 100) / 100;
  
  let structureBasePrice, installationBasePrice;
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
  
  const structureGST = Math.round((structureBasePrice * 0.18) * 100) / 100;
  const totalStructure = Math.round((structureBasePrice + structureGST) * 100) / 100;
  const installationGST = Math.round((installationBasePrice * 0.18) * 100) / 100;
  const totalInstallation = Math.round((installationBasePrice + installationGST) * 100) / 100;
  
  const combinedStructureInstallationBase = structureBasePrice + installationBasePrice;
  const combinedStructureInstallationGST = structureGST + installationGST;
  const combinedStructureInstallationTotal = totalStructure + totalInstallation;
  
  const grandTotal = Math.round(totalProduct + totalController + totalStructure + totalInstallation);

  const children = [];

  // Quotation Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Quotation #: ${quotationId || 'ORION/2025/07/Prachi/0193'}`,
          bold: true,
          size: 22,
        }),
      ],
      spacing: { after: 120, before: 0 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Date: ${new Date().toLocaleDateString('en-GB')}`,
          bold: true,
          size: 22,
        }),
      ],
      spacing: { after: 240, before: 0 },
    })
  );

  // Client Information Section
  if (userInfo) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'CLIENT INFORMATION',
            bold: true,
            size: 24,
            color: '333333',
          }),
        ],
        spacing: { after: 120, before: 0 },
        border: {
          bottom: {
            color: '333333',
            size: 20,
            style: BorderStyle.SINGLE,
          },
        },
      })
    );

    // Client Details Table - Two columns with equal width
    const clientTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'CLIENT DETAILS', bold: true, size: 22 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Name: ${userInfo.fullName}`, bold: true, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Email: ${userInfo.email}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Phone: ${userInfo.phoneNumber}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                ...(userInfo.projectTitle ? [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `Project Title: ${userInfo.projectTitle}`, size: 20 }),
                    ],
                    spacing: { after: 80 },
                  })
                ] : []),
                ...(userInfo.address ? [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `Address: ${userInfo.address}`, size: 20 }),
                    ],
                  })
                ] : []),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: {
                top: 200,
                right: 200,
                bottom: 200,
                left: 200,
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'ORION SALES TEAM', bold: true, size: 22 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Location: ${salesUser?.location || 'Delhi'}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Sales Person: ${salesUser?.name || 'Ashwani Yadav'}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Contact: ${getSalesPhoneNumber(salesUser)}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Email: ${salesUser?.email || 'ashwani.yadav@orion-led.com'}`, size: 20 }),
                  ],
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: {
                top: 200,
                right: 200,
                bottom: 200,
                left: 200,
              },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [50, 50],
    });

    children.push(clientTable);
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }));
  }

  // Section A: Product Description
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'A. PRODUCT DESCRIPTION',
          bold: true,
          size: 28,
          color: '2563eb',
        }),
      ],
      spacing: { after: 120, before: 0 },
      border: {
        bottom: {
          color: '2563eb',
          size: 40,
          style: BorderStyle.SINGLE,
        },
      },
    })
  );

  // Product Details Table - Two columns with equal width
  const productTable = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'PRODUCT SPECIFICATIONS', bold: true, size: 22 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Series/Environment: ${selectedProduct.category}, ${selectedProduct.environment.charAt(0).toUpperCase() + selectedProduct.environment.slice(1)}`, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Pixel Pitch: P${selectedProduct.pixelPitch}`, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Cabinet Dimension: ${selectedProduct.cabinetDimensions.width} x ${selectedProduct.cabinetDimensions.height} mm`, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Display Size (m): ${toDisplayUnit(config.width, 'm')} x ${toDisplayUnit(config.height, 'm')}`, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Display Size (ft): ${toDisplayUnit(config.width, 'ft')} x ${toDisplayUnit(config.height, 'ft')}`, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Resolution: ${selectedProduct.resolution.width * cabinetGrid.columns} x ${selectedProduct.resolution.height * cabinetGrid.rows}`, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Matrix: ${cabinetGrid.columns} x ${cabinetGrid.rows}`, size: 20 }),
                ],
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: {
              top: 200,
              right: 200,
              bottom: 200,
              left: 200,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'PRICING DETAILS', bold: true, size: 22 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Unit Price: ₹${formatIndianNumber(unitPrice)}`, bold: true, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: `Quantity: ${selectedProduct.category?.toLowerCase().includes('rental') ? Math.round(safeQuantity) + ' Cabinets' : Math.round(safeQuantity * 100) / 100 + ' Ft²'}`, 
                    size: 20 
                  }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Subtotal: ₹${formatIndianNumber(subtotal)}`, bold: true, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `GST (18%): ₹${formatIndianNumber(gstProduct)}`, bold: true, color: 'dc3545', size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'TOTAL:', bold: true, size: 22 }),
                  new TextRun({ text: ` ₹${formatIndianNumber(totalProduct)}`, bold: true, size: 22 }),
                ],
                spacing: { after: 0 },
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: {
              top: 200,
              right: 200,
              bottom: 200,
              left: 200,
            },
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [50, 50],
  });

  children.push(productTable);
  children.push(new Paragraph({ text: '', spacing: { after: 240 } }));

  // Section B: Control System (if not Jumbo series)
  if (!isJumboSeries && processor) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'B. CONTROL SYSTEM & ACCESSORIES',
            bold: true,
            size: 28,
            color: '2563eb',
          }),
        ],
        spacing: { after: 120, before: 0 },
        border: {
          bottom: {
            color: '2563eb',
            size: 40,
            style: BorderStyle.SINGLE,
          },
        },
      })
    );

    const controllerTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'CONTROLLER DETAILS', bold: true, size: 20 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Controller Model: ${processor || "Nova TB2"}`, size: 18 }),
                  ],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Quantity: 1', size: 18 }),
                  ],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'UOM: Nos.', size: 18 }),
                  ],
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: {
                top: 200,
                right: 200,
                bottom: 200,
                left: 200,
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'CONTROLLER PRICING', bold: true, size: 20 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Unit Price: ₹${formatIndianNumber(controllerPrice)}`, bold: true, size: 18 }),
                  ],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `GST (18%): ₹${formatIndianNumber(gstController)}`, bold: true, color: 'dc3545', size: 18 }),
                  ],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'TOTAL:', bold: true, size: 20 }),
                    new TextRun({ text: ` ₹${formatIndianNumber(totalController)}`, bold: true, size: 20 }),
                  ],
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: {
                top: 200,
                right: 200,
                bottom: 200,
                left: 200,
              },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [50, 50],
    });

    children.push(controllerTable);
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }));
  }

  // Section C: Structure and Installation
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'C. STRUCTURE AND INSTALLATION PRICE',
          bold: true,
          size: 28,
          color: '2563eb',
        }),
      ],
      spacing: { after: 120, before: 0 },
      border: {
        bottom: {
          color: '2563eb',
          size: 40,
          style: BorderStyle.SINGLE,
        },
      },
    })
  );

  const structureTable = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'STRUCTURE + INSTALLATION TOTAL', bold: true, size: 22 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Total Area: ${screenAreaSqFt.toFixed(2)} Ft²`, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Combined Base Cost: ₹${formatIndianNumber(combinedStructureInstallationBase)}`, bold: true, size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Combined GST (18%): ₹${formatIndianNumber(combinedStructureInstallationGST)}`, bold: true, color: 'dc3545', size: 20 }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'TOTAL:', bold: true, size: 22 }),
                  new TextRun({ text: ` ₹${formatIndianNumber(combinedStructureInstallationTotal)}`, bold: true, size: 22 }),
                ],
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: {
              top: 200,
              right: 200,
              bottom: 200,
              left: 200,
            },
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  children.push(structureTable);
  children.push(new Paragraph({ text: '', spacing: { after: 240 } }));

  // Grand Total
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'GRAND TOTAL',
          bold: true,
          size: 32,
          color: 'ffffff',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80, before: 0 },
      shading: {
        fill: '333333',
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `₹${formatIndianNumber(grandTotal)}`,
          bold: true,
          size: 32,
          color: 'ffffff',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40, before: 0 },
      shading: {
        fill: '333333',
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: isJumboSeries ? '(A + C)' : '(A + B + C)',
          size: 18,
          color: 'ffffff',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, before: 0 },
      shading: {
        fill: '333333',
      },
    })
  );

  return children;
};

// Extract template pages by converting to HTML and splitting by page breaks
const extractTemplatePagesAsHTML = async () => {
  try {
    if (!fs.existsSync(TEMPLATE_PATH)) {
      throw new Error(`Template file not found: ${TEMPLATE_PATH}`);
    }

    // Import mammoth dynamically
    let mammoth;
    try {
      const mammothModule = await import('mammoth');
      mammoth = mammothModule.default || mammothModule;
    } catch (e) {
      console.warn('⚠️ Could not import mammoth, skipping HTML conversion:', e.message);
      return [];
    }

    if (!mammoth) {
      console.warn('⚠️ Mammoth not available, skipping HTML conversion');
      return [];
    }

    // Use mammoth to convert DOCX to HTML
    // Read the file as buffer first
    const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
    const result = await mammoth.convertToHtml({ buffer: templateBuffer });
    const html = result.value;
    const messages = result.messages;
    
    if (messages && messages.length > 0) {
      console.warn('⚠️ Mammoth conversion warnings:', messages);
    }

    // Split HTML by page breaks (mammoth converts page breaks to <p> with specific classes or <hr>)
    // We'll look for common page break indicators
    const pageBreaks = html.split(/<hr[^>]*>/gi).filter(p => p.trim().length > 0);
    
    // If no page breaks found, try splitting by section breaks or other indicators
    let pages = pageBreaks;
    if (pages.length < 2) {
      // Try splitting by paragraph breaks that might indicate pages
      pages = html.split(/<p[^>]*class="[^"]*page-break[^"]*"[^>]*>/gi).filter(p => p.trim().length > 0);
    }
    
    // If still no pages, treat entire HTML as one page
    if (pages.length < 2) {
      pages = [html];
    }

    return pages;
  } catch (error) {
    console.error('❌ Error extracting template pages:', error);
    // Don't throw - return empty array so we can continue without template extraction
    console.warn('⚠️ Continuing without template page extraction');
    return [];
  }
};

// Convert HTML page to image buffer (simplified - would need headless browser in production)
// For now, we'll use the template directly by modifying the DOCX structure
const convertHTMLPageToImage = async (htmlPage) => {
  // This would require a headless browser like Puppeteer
  // For now, we'll skip this and use a different approach
  return null;
};

// Main function to generate Word document from template
export const generateWordDocumentFromTemplate = async (data) => {
  try {
    const {
      config,
      selectedProduct,
      cabinetGrid,
      processor,
      userInfo,
      salesUser,
      quotationId,
      customPricing
    } = data;

    // Check if template exists
    if (!fs.existsSync(TEMPLATE_PATH)) {
      const errorMsg = `Template file not found: ${TEMPLATE_PATH}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // Read the template
    const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
    const templateZip = new PizZip(templateBuffer);
    
    // A4 dimensions in twips (1 inch = 1440 twips)
    const A4_WIDTH_TWIPS = Math.round((210 / 25.4) * 1440);
    const A4_HEIGHT_TWIPS = Math.round((297 / 25.4) * 1440);
    
    // A4 dimensions in EMU for images
    const A4_WIDTH_EMU = Math.round((210 / 25.4) * 914400);
    const A4_HEIGHT_EMU = Math.round((297 / 25.4) * 914400);

    // Extract images from template to use as backgrounds

    const templateImages = {};
    let imageCount = 0;
    Object.keys(templateZip.files).forEach((fileName) => {
      if (fileName.startsWith('word/media/') && (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg'))) {
        try {
          const imageBuffer = templateZip.files[fileName].asNodeBuffer();
          const imageName = path.basename(fileName);
          templateImages[imageName] = imageBuffer;
          imageCount++;

        } catch (imageError) {
          console.error(`❌ Error extracting image ${fileName}:`, imageError.message);
        }
      }
    });

    // Convert template to HTML to understand structure
    let templatePages = [];
    try {
      templatePages = await extractTemplatePagesAsHTML();

    } catch (error) {
      console.warn('⚠️ Could not extract template pages, using template directly:', error.message);
    }
    
    const sections = [];
    
    // For pages 1-5, 7, 9, 10: Use template structure
    // Since we can't easily extract individual pages, we'll:
    // 1. Use the template.docx as a base document
    // 2. Modify it to replace page 6
    
    // Approach: Use the template directly and modify page 6
    // We'll create a new document that copies the template structure
    // and replaces page 6 with quotation content
    
    // For now, create sections that reference the template
    // In production, we would parse the template's document.xml and extract sections
    
    // Pages 1-5: Use template (create placeholder sections - would use actual template content)
    for (let i = 1; i <= 5; i++) {
      // Try to find a corresponding image for this page
      // Template uses image1.png, image2.png, etc.
      const pageImageName = `image${i}.png`;
      let backgroundImage = null;
      
      if (templateImages[pageImageName]) {
        const uint8Array = new Uint8Array(templateImages[pageImageName]);
        backgroundImage = new ImageRun({
          data: uint8Array,
          transformation: {
            width: A4_WIDTH_EMU,
            height: A4_HEIGHT_EMU,
          },
        });
      }
      
      const children = [];
      if (backgroundImage) {
        // Create a table with background image
        const backgroundTable = new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [backgroundImage],
                      spacing: { after: 0, before: 0 },
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  margins: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  },
                }),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        });
        children.push(backgroundTable);
      } else {
        // Log warning if image not found
        console.warn(`⚠️ Template image not found for page ${i}: ${pageImageName}`);

        // Still create a page, but without background
        children.push(
          new Paragraph({
            children: [
              new TextRun(''),
            ],
            spacing: { after: 0, before: 0 },
          })
        );
      }
      
      sections.push({
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
          sectionType: SectionType.NEXT_PAGE,
        },
        children: children,
      });
    }
    
    // Page 6: Quotation content with template page 6 background

    const quotationContent = createQuotationContent({
      config,
      selectedProduct,
      cabinetGrid,
      processor,
      userInfo,
      salesUser,
      quotationId,
      customPricing
    });

    // Try to find page 6 background image
    const page6ImageName = 'image6.png';
    let page6Background = null;
    
    if (templateImages[page6ImageName]) {
      try {

        const uint8Array = new Uint8Array(templateImages[page6ImageName]);
        page6Background = new ImageRun({
          data: uint8Array,
          transformation: {
            width: A4_WIDTH_EMU,
            height: A4_HEIGHT_EMU,
          },
        });

      } catch (imageError) {
        console.error(`❌ Error creating ImageRun for page 6:`, imageError.message);
      }
    }
    
    const page6Children = [];
    if (page6Background) {
      // Create table with background image and quotation content
      const backgroundTable = new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [page6Background],
                    spacing: { after: 0, before: 0 },
                    alignment: AlignmentType.CENTER,
                  }),
                  ...quotationContent,
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
                margins: {
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                },
                verticalAlign: 'top',
              }),
            ],
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      });
      page6Children.push(backgroundTable);
    } else {
      // No background image, just quotation content
      page6Children.push(...quotationContent);
    }
    
    sections.push({
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
        sectionType: SectionType.NEXT_PAGE,
      },
      children: page6Children,
    });
    
    // Pages 7, 9, 10: Use template

    const remainingPages = [7, 9, 10];
    for (const i of remainingPages) {
      const pageImageName = `image${i}.png`;
      let backgroundImage = null;
      
      if (templateImages[pageImageName]) {
        try {

          const uint8Array = new Uint8Array(templateImages[pageImageName]);
          backgroundImage = new ImageRun({
            data: uint8Array,
            transformation: {
              width: A4_WIDTH_EMU,
              height: A4_HEIGHT_EMU,
            },
          });

        } catch (imageError) {
          console.error(`❌ Error creating ImageRun for page ${i}:`, imageError.message);
        }
      }
      
      const children = [];
      if (backgroundImage) {
        const backgroundTable = new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [backgroundImage],
                      spacing: { after: 0, before: 0 },
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  margins: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  },
                }),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        });
        children.push(backgroundTable);
      } else {
        // Log warning if image not found
        console.warn(`⚠️ Template image not found for page ${i}: ${pageImageName}`);
        // Still create a page, but without background
        children.push(
          new Paragraph({
            children: [
              new TextRun(''),
            ],
            spacing: { after: 0, before: 0 },
          })
        );
      }
      
      sections.push({
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
          sectionType: SectionType.NEXT_PAGE,
        },
        children: children,
      });
    }
    
    // Create document

    const doc = new Document({
      creator: 'ORION LED Configurator',
      title: 'Configuration Quotation',
      description: 'LED Display Configuration Quotation',
      sections: sections,
    });
    
    // Generate buffer

    let buffer;
    try {
      buffer = await Packer.toBuffer(doc);

    } catch (packError) {
      console.error('❌ Error packing document:', packError);
      console.error('❌ Pack error message:', packError.message);
      console.error('❌ Pack error stack:', packError.stack);
      throw new Error(`Failed to pack document: ${packError.message}`);
    }
    
    if (!buffer || buffer.length === 0) {
      throw new Error('Generated buffer is empty');
    }

    return buffer;
    
  } catch (error) {
    console.error('❌ Error generating Word document from template:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
};

