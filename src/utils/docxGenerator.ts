import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DisplayConfig, Product, CabinetGrid } from '../types';
import { getProcessorPrice } from './processorPrices';
import { calculateCentralizedPricing } from './centralizedPricing';

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

export const generateConfigurationDocx = async (
  config: DisplayConfig,
  selectedProduct: Product,
  cabinetGrid: CabinetGrid,
  processor?: string,
  _mode?: string,
  userInfo?: UserInfo,
  salesUser?: { email: string; name: string; contactNumber: string; location: string } | null,
  quotationId?: string
): Promise<Blob> => {
  try {
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
  // Derived values (calculated only if needed in future; suppress unused warnings)
  void displayedWidth; void displayedHeight;

  // Calculate power consumption
  const avgPowerPerCabinet = selectedProduct.avgPowerConsumption || 91.7;
  const maxPowerPerCabinet = selectedProduct.maxPowerConsumption || (avgPowerPerCabinet * 3);
  void avgPowerPerCabinet; void maxPowerPerCabinet;

  // Calculate total pixels
  void cabinetGrid; void selectedProduct;

  // Use centralized pricing calculation to ensure 100% match with PDF
  const userTypeForCalc = userInfo?.userType === 'Channel' ? 'Channel' : 
                         userInfo?.userType === 'Reseller' ? 'Reseller' : 'End User';
  
  const pricingResult = calculateCentralizedPricing(
    selectedProduct,
    cabinetGrid,
    processor || null,
    userTypeForCalc,
    config
  );

  // Extract values from centralized pricing
  const unitPrice = pricingResult.unitPrice;
  const safeQuantity = pricingResult.quantity;
  const subtotal = pricingResult.productSubtotal;
  const gstProduct = pricingResult.productGST;
  const totalProduct = pricingResult.productTotal;
  const controllerPrice = pricingResult.processorPrice;
  const gstController = pricingResult.processorGST;
  const totalController = pricingResult.processorTotal;
  
  // Calculate screen area in square feet for Structure and Installation pricing
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const screenAreaSqFt = Math.round((widthInFeet * heightInFeet) * 100) / 100;
  
  // Structure Price: ₹2500 per square foot + 18% GST
  const structureBasePrice = screenAreaSqFt * 2500;
  const structureGST = structureBasePrice * 0.18;
  const totalStructure = structureBasePrice + structureGST;
  
  // Installation Price: ₹500 per square foot + 18% GST
  const installationBasePrice = screenAreaSqFt * 500;
  const installationGST = installationBasePrice * 0.18;
  const totalInstallation = installationBasePrice + installationGST;
  
  // Update grand total to include Structure and Installation
  const grandTotal = pricingResult.grandTotal + totalStructure + totalInstallation;
  
  // Check if product is Jumbo Series (prices already include controllers)
  const isJumboSeries = selectedProduct.category?.toLowerCase().includes('jumbo') || 
                        selectedProduct.id?.toLowerCase().startsWith('jumbo-') ||
                        selectedProduct.name?.toLowerCase().includes('jumbo series');

  // Format Indian number with clean formatting (same as PDF)
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

  // Helper function to format price using Indian number format (same as PDF)
  const formatPrice = (price: number | undefined | string | null): string => {
    if (price === undefined || price === null || price === "NA" || price === "na") {
      return "NA";
    }
    if (typeof price === 'number') {
      return `₹${formatIndianNumber(price)}`;
    }
    return "NA";
  };

  // Build document without embedding images for maximum compatibility

  // Create document with proper page breaks and layout (matching PDF margins)
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720, // 0.5 inch (matching PDF padding)
            right: 720,
            bottom: 720,
            left: 720,
          },
          size: {
            width: 11906, // A4 width in twips
            height: 16838, // A4 height in twips
          },
        },
      },
      children: [

        // Company header section
        new Paragraph({
          children: [
            new TextRun({
              text: "ATENTI ORIGINS",
              bold: true,
              size: 28,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "ATENTI ORIGINS PHOTOELECTRICITY CONSORT PVT.LTD.",
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Reg. Office: 504, 5th Floor ABW Elegance Tower, Jasola District Centre, Jasola, New Delhi 110025",
              size: 16,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Factory: B-10, Sector-88, Noida - 201301",
              size: 16,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),

        // Quotation title
        new Paragraph({
          children: [
            new TextRun({
              text: "QUOTATION",
              bold: true,
              size: 32,
              color: "FFFFFF",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
          shading: {
            fill: "2563eb",
          },
        }),

        // Quotation details table
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Quotation #:",
                          bold: true,
                          size: 16,
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: quotationId || "ORION/2025/07/Prachi/0193",
                          size: 16,
                        }),
                      ],
                    }),
                  ],
                  width: {
                    size: 50,
                    type: WidthType.PERCENTAGE,
                  },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Date:",
                          bold: true,
                          size: 16,
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: new Date().toLocaleDateString('en-GB'),
                          size: 16,
                        }),
                      ],
                    }),
                  ],
                  width: {
                    size: 50,
                    type: WidthType.PERCENTAGE,
                  },
                }),
              ],
            }),
          ],
        }),

        // Client information if available
        ...(userInfo ? [
          new Paragraph({
            children: [
              new TextRun({
                text: "CLIENT INFORMATION",
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 400, after: 200 }
          }),

          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "CLIENT DETAILS",
                            bold: true,
                            size: 16,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Name: ${userInfo.fullName}`,
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Email: ${userInfo.email}`,
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Phone: ${userInfo.phoneNumber}`,
                            size: 14,
                          }),
                        ],
                      }),
                    ],
                    width: {
                      size: 50,
                      type: WidthType.PERCENTAGE,
                    },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "ORION SALES TEAM",
                            bold: true,
                            size: 16,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Location: ${salesUser?.location || 'Delhi'}`,
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Sales Person: ${salesUser ? salesUser.name : 'Ashwani Yadav'}`,
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Contact: ${getSalesPhoneNumber(salesUser)}`,
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Email: ${salesUser ? salesUser.email : 'ashwani.yadav@orion-led.com'}`,
                            size: 14,
                          }),
                        ],
                      }),
                    ],
                    width: {
                      size: 50,
                      type: WidthType.PERCENTAGE,
                    },
                  }),
                ],
              }),
            ],
          }),
        ] : []),

        // Section A: Product Description
        new Paragraph({
          children: [
            new TextRun({
              text: "A. PRODUCT DESCRIPTION",
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 400, after: 200 }
        }),

        // Product specifications and pricing in two-column layout with exact HTML styling
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          margins: { top: 400, bottom: 400, left: 200, right: 200 },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "PRODUCT SPECIFICATIONS",
                          bold: true,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 200, after: 200 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Series/Environment:`,
                          bold: true,
                          size: 14,
                        }),
                        new TextRun({
                          text: ` ${selectedProduct.category}, ${selectedProduct.environment.charAt(0).toUpperCase() + selectedProduct.environment.slice(1)}`,
                          size: 14,
                        }),
                      ],
                      spacing: { before: 200, after: 200 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Pixel Pitch:`,
                          bold: true,
                          size: 14,
                        }),
                        new TextRun({
                          text: ` P${selectedProduct.pixelPitch}`,
                          size: 14,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Module Dimension:`,
                          bold: true,
                          size: 14,
                        }),
                        new TextRun({
                          text: ` ${selectedProduct.cabinetDimensions.width} x ${selectedProduct.cabinetDimensions.height} mm`,
                          size: 14,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Display Size (m):`,
                          bold: true,
                          size: 14,
                        }),
                        new TextRun({
                          text: ` ${toDisplayUnit(config.width, 'm')} x ${toDisplayUnit(config.height, 'm')}`,
                          size: 14,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Display Size (ft):`,
                          bold: true,
                          size: 14,
                        }),
                        new TextRun({
                          text: ` ${toDisplayUnit(config.width, 'ft')} x ${toDisplayUnit(config.height, 'ft')}`,
                          size: 14,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Resolution:`,
                          bold: true,
                          size: 14,
                        }),
                        new TextRun({
                          text: ` ${selectedProduct.resolution.width * cabinetGrid.columns} x ${selectedProduct.resolution.height * cabinetGrid.rows}`,
                          size: 14,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Matrix:`,
                          bold: true,
                          size: 14,
                        }),
                        new TextRun({
                          text: ` ${cabinetGrid.columns} x ${cabinetGrid.rows}`,
                          size: 14,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                  ],
                  width: {
                    size: 60,
                    type: WidthType.PERCENTAGE,
                  },
                  shading: {
                    fill: "F8F9FA",
                  },
                                       borders: {
                       top: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                       bottom: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                       left: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                       right: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                     },
                  margins: { top: 400, bottom: 400, left: 400, right: 400 },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "PRICING DETAILS",
                          bold: true,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 300, after: 300 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Unit Price:`,
                          bold: true,
                          size: 14,
                        }),
                        new TextRun({
                          text: ` ${formatPrice(unitPrice)}`,
                          bold: true,
                          size: 14,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Quantity:`,
                          bold: true,
                          size: 14,
                        }),
                        new TextRun({
                          text: ` ${selectedProduct.category?.toLowerCase().includes('rental') ? Math.round(safeQuantity) + ' Cabinets' : safeQuantity.toFixed(2) + ' Ft²'}`,
                          size: 14,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Subtotal:`,
                          bold: true,
                          size: 14,
                        }),
                        new TextRun({
                          text: ` ${formatPrice(subtotal)}`,
                          bold: true,
                          size: 14,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `GST (18%):`,
                          bold: true,
                          size: 14,
                        }),
                        new TextRun({
                          text: ` ${formatPrice(gstProduct)}`,
                          bold: true,
                          size: 14,
                          color: "DC3545",
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `TOTAL:`,
                          bold: true,
                          size: 16,
                        }),
                        new TextRun({
                          text: ` ${formatPrice(totalProduct)}`,
                          bold: true,
                          size: 16,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                  ],
                                      width: {
                      size: 40,
                      type: WidthType.PERCENTAGE,
                    },
                    shading: {
                      fill: "F8F9FA",
                    },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      bottom: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      left: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      right: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    },
                    margins: { top: 400, bottom: 400, left: 400, right: 400 },
                }),
              ],
            }),
          ],
        }),

        // TOTAL A section with exact HTML styling
        new Paragraph({
          children: [
            new TextRun({
              text: `TOTAL A: ${formatPrice(totalProduct)}`,
              bold: true,
              size: 20,
              color: "FFFFFF",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
          shading: {
            fill: "333333",
          },
        }),

        // Section B: Control System (only show if not Jumbo Series)
        ...(!isJumboSeries ? [
          new Paragraph({
            children: [
              new TextRun({
                text: "B. CONTROL SYSTEM & ACCESSORIES",
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 400, after: 200 }
          }),

          // Controller details table
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "CONTROLLER DETAILS",
                          bold: true,
                          size: 18,
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Controller Model: ${processor || "Nova TB2"}`,
                          size: 14,
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Quantity: 1",
                          size: 14,
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "UOM: Nos.",
                          size: 14,
                        }),
                      ],
                    }),
                  ],
                  width: {
                    size: 50,
                    type: WidthType.PERCENTAGE,
                  },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "CONTROLLER PRICING",
                          bold: true,
                          size: 18,
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Unit Price: ${formatPrice(controllerPrice)}`,
                          size: 14,
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `GST (18%): ${formatPrice(gstController)}`,
                          size: 14,
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `TOTAL B: ${formatPrice(controllerPrice + gstController)}`,
                          bold: true,
                          size: 16,
                        }),
                      ],
                    }),
                  ],
                  width: {
                    size: 50,
                    type: WidthType.PERCENTAGE,
                  },
                }),
              ],
            }),
          ],
        }),
        ] : []),

        // Structure and Installation Price Section (shown for all products)
        [
          new Paragraph({
            children: [
              new TextRun({
                text: "STRUCTURE AND INSTALLATION PRICE",
                bold: true,
                size: 20,
              }),
            ],
            spacing: { before: 400, after: 200 }
          }),
          
          // Structure and Installation table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  // Structure Price Column
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "STRUCTURE PRICE",
                            bold: true,
                            size: 18,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Area: ${screenAreaSqFt.toFixed(2)} Ft²`,
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Rate: ₹2,500 / Ft²",
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Base Cost: ${formatPrice(structureBasePrice)}`,
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `GST (18%): ${formatPrice(structureGST)}`,
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `TOTAL: ${formatPrice(totalStructure)}`,
                            bold: true,
                            size: 16,
                          }),
                        ],
                      }),
                    ],
                    width: {
                      size: 50,
                      type: WidthType.PERCENTAGE,
                    },
                  }),
                  // Installation Price Column
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "INSTALLATION PRICE",
                            bold: true,
                            size: 18,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Area: ${screenAreaSqFt.toFixed(2)} Ft²`,
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Rate: ₹500 / Ft²",
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Base Cost: ${formatPrice(installationBasePrice)}`,
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `GST (18%): ${formatPrice(installationGST)}`,
                            size: 14,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `TOTAL: ${formatPrice(totalInstallation)}`,
                            bold: true,
                            size: 16,
                          }),
                        ],
                      }),
                    ],
                    width: {
                      size: 50,
                      type: WidthType.PERCENTAGE,
                    },
                  }),
                ],
              }),
            ],
          }),
        ],

        // Grand Total (only show if not Jumbo Series, or always show with proper calculation)
        ...(!isJumboSeries ? [
          new Paragraph({
            children: [
              new TextRun({
                text: `GRAND TOTAL: ${formatPrice(grandTotal)}`,
                bold: true,
                size: 28,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "(A + B + C)",
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
        ] : [
          new Paragraph({
            children: [
              new TextRun({
                text: `GRAND TOTAL: ${formatPrice(grandTotal)}`,
                bold: true,
                size: 28,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "(A + C)",
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
        ]),

        // Footer
        new Paragraph({
          children: [
            new TextRun({
              text: "Valid for 30 days from the date of quotation",
              size: 14,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Note: Product catalog pages are available separately upon request",
              size: 12,
              color: "666666",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 }
        }),
      ]
    }]
  });

    return await Packer.toBlob(doc);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    
    // Fallback: Create a simple document without images
    const fallbackDoc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
            size: {
              width: 11906,
              height: 16838,
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "ORION LED Configuration Report",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Product: ${selectedProduct.name}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Display Size: ${(config.width / 1000).toFixed(2)}m x ${(config.height / 1000).toFixed(2)}m`,
                size: 16,
              }),
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Matrix: ${cabinetGrid.columns} x ${cabinetGrid.rows}`,
                size: 16,
              }),
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Controller: ${processor || 'Nova TB2'}`,
                size: 16,
              }),
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Generated on: " + new Date().toLocaleDateString(),
                size: 14,
              }),
            ],
            spacing: { after: 200 }
          }),
        ]
      }]
    });
    
    return await Packer.toBlob(fallbackDoc);
  }
};

interface UserInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
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
  quotationId?: string
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
  
  // Structure Price: ₹2500 per square foot + 18% GST
  const structureBasePrice = screenAreaSqFt * 2500;
  const structureGST = structureBasePrice * 0.18;
  const totalStructure = structureBasePrice + structureGST;
  
  // Installation Price: ₹500 per square foot + 18% GST
  const installationBasePrice = screenAreaSqFt * 500;
  const installationGST = installationBasePrice * 0.18;
  const totalInstallation = installationBasePrice + installationGST;
  
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
                          <p style="margin: 0; color: #666; font-size: 11px; line-height: 1.2;">Phone: ${userInfo.phoneNumber}</p>
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
                
                <div class="quotation-grid">
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
                
                <div class="quotation-grid">
            <!-- Structure Price Card -->
            <div class="quotation-card" style="display: flex; flex-direction: column;">
                <h4 style="margin: 0 0 4px 0; color: #333; font-size: 12px; font-weight: bold; border-bottom: 1px solid rgba(233, 236, 239, 0.8); padding-bottom: 3px;">STRUCTURE PRICE</h4>
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <div class="quotation-row">
                                <span class="quotation-label">Area:</span>
                                <span class="quotation-value">${screenAreaSqFt.toFixed(2)} Ft²</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Rate:</span>
                                <span class="quotation-value">₹2,500 / Ft²</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Base Cost:</span>
                                <span class="quotation-value" style="font-weight: 700;">₹${formatIndianNumber(structureBasePrice)}</span>
                            </div>
                            <div class="quotation-row">
                                <span class="quotation-label">GST (18%):</span>
                                <span class="quotation-value" style="color: #dc3545; font-weight: 700;">₹${formatIndianNumber(structureGST)}</span>
                            </div>
                    <div class="quotation-total-row" style="margin-top: auto;">
                        <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 4px 2px; border-bottom: none;">
                            <span style="font-weight: 700; color: #333; font-size: 12px; text-align: left;">TOTAL:</span>
                            <span style="color: #333; font-weight: 700; font-size: 12px; text-align: right; white-space: nowrap;">₹${formatIndianNumber(totalStructure)}</span>
                        </div>
                    </div>
                        </div>
            </div>
            
            <!-- Installation Price Card -->
            <div class="quotation-card" style="display: flex; flex-direction: column;">
                <h4 style="margin: 0 0 4px 0; color: #333; font-size: 12px; font-weight: bold; border-bottom: 1px solid rgba(233, 236, 239, 0.8); padding-bottom: 3px;">INSTALLATION PRICE</h4>
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <div class="quotation-row">
                                <span class="quotation-label">Area:</span>
                                <span class="quotation-value">${screenAreaSqFt.toFixed(2)} Ft²</span>
        </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Rate:</span>
                                <span class="quotation-value">₹500 / Ft²</span>
        </div>
                            <div class="quotation-row">
                                <span class="quotation-label">Base Cost:</span>
                                <span class="quotation-value" style="font-weight: 700;">₹${formatIndianNumber(installationBasePrice)}</span>
        </div>
                            <div class="quotation-row">
                                <span class="quotation-label">GST (18%):</span>
                                <span class="quotation-value" style="color: #dc3545; font-weight: 700;">₹${formatIndianNumber(installationGST)}</span>
        </div>
                    <div class="quotation-total-row" style="margin-top: auto;">
                        <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 4px 2px; border-bottom: none;">
                            <span style="font-weight: 700; color: #333; font-size: 12px; text-align: left;">TOTAL:</span>
                            <span style="color: #333; font-weight: 700; font-size: 12px; text-align: right; white-space: nowrap;">₹${formatIndianNumber(totalInstallation)}</span>
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
  quotationId?: string
): Promise<Blob> => {
  const html = generateConfigurationHtml(
    config,
    selectedProduct,
    cabinetGrid,
    processor,
    mode,
    userInfo,
    salesUser,
    quotationId
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



