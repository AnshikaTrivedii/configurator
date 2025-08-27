import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun } from 'docx';
import { DisplayConfig, Product, CabinetGrid } from '../types';
import { QuoteRequest } from '../api/quote';

// Function to load image as ArrayBuffer
const loadImage = async (imagePath: string): Promise<ArrayBuffer> => {
  const response = await fetch(imagePath);
  return await response.arrayBuffer();
};

export const generateConfigurationDocx = async (
  config: DisplayConfig,
  selectedProduct: Product,
  cabinetGrid: CabinetGrid,
  processor?: string,
  mode?: string
): Promise<Blob> => {
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
  const displayAreaFeet = displayedWidth * displayedHeight;
  const displayArea = (config.width * config.height) / 1000000; // mm² to m²
  const displayAreaInDisplayUnit = config.unit === 'ft' ? displayAreaFeet : displayArea;

  // Calculate diagonal
  const diagonalMeters = Math.sqrt(Math.pow(config.width/1000, 2) + Math.pow(config.height/1000, 2));
  const diagonalInDisplayUnit = config.unit === 'ft' ? diagonalMeters * METERS_TO_FEET : diagonalMeters;
  const diagonalInches = diagonalMeters * 39.3701;
  const feet = Math.floor(diagonalInches / 12);
  const inches = Math.round((diagonalInches % 12) * 16) / 16;

  // Calculate power consumption
  const avgPowerPerCabinet = selectedProduct.avgPowerConsumption || 91.7;
  const maxPowerPerCabinet = selectedProduct.maxPowerConsumption || (avgPowerPerCabinet * 3);
  const avgPower = (avgPowerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(2);
  const maxPower = (maxPowerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(2);

  // Calculate total pixels
  const totalPixels = selectedProduct.resolution.width * cabinetGrid.columns * selectedProduct.resolution.height * cabinetGrid.rows;

  // Format Indian number
  const formatIndianNumber = (x: number): string => {
    const s = x.toString();
    let afterFirst = s.length > 3 ? s.slice(0, s.length - 3) : '';
    const lastThree = s.slice(-3);
    if (afterFirst) {
      afterFirst = afterFirst.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
      return afterFirst + ',' + lastThree;
    } else {
      return lastThree;
    }
  };

  // Load all images
  const imagePromises = [];
  for (let i = 1; i <= 10; i++) {
    const pageNumber = i.toString().padStart(4, '0');
    const imagePath = `/Pages to JPG/Indian Industries Association_page-${pageNumber}.jpg`;
    imagePromises.push(loadImage(imagePath).catch(() => null)); // Return null if image fails to load
  }
  
  const images = await Promise.all(imagePromises);

  // Create document with single section and page breaks
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Page 1: Image Page
        ...(images[0] ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: images[0],
                transformation: {
                  width: 595, // A4 width in points
                  height: 842, // A4 height in points
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ] : [
          new Paragraph({
            text: "Page 1 - Image not available",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 400 }
          }),
        ]),

        // Page Break
        new Paragraph({
          pageBreakBefore: true,
          spacing: { after: 0 }
        }),

        // Page 2: Image Page
        ...(images[1] ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: images[1],
                transformation: {
                  width: 595,
                  height: 842,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ] : [
          new Paragraph({
            text: "Page 2 - Image not available",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 400 }
          }),
        ]),

        // Page Break
        new Paragraph({
          pageBreakBefore: true,
          spacing: { after: 0 }
        }),

        // Page 3: Image Page
        ...(images[2] ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: images[2],
                transformation: {
                  width: 595,
                  height: 842,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ] : [
          new Paragraph({
            text: "Page 3 - Image not available",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 400 }
          }),
        ]),

        // Page Break
        new Paragraph({
          pageBreakBefore: true,
          spacing: { after: 0 }
        }),

        // Page 4: Image Page
        ...(images[3] ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: images[3],
                transformation: {
                  width: 595,
                  height: 842,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ] : [
          new Paragraph({
            text: "Page 4 - Image not available",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 400 }
          }),
        ]),

        // Page Break
        new Paragraph({
          pageBreakBefore: true,
          spacing: { after: 0 }
        }),

        // Page 5: Image Page
        ...(images[4] ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: images[4],
                transformation: {
                  width: 595,
                  height: 842,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ] : [
          new Paragraph({
            text: "Page 5 - Image not available",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 400 }
          }),
        ]),

        // Page Break
        new Paragraph({
          pageBreakBefore: true,
          spacing: { after: 0 }
        }),

        // Page 6: Exact Quotation Layout
        // Header with logo and company info
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      text: "ORION LED",
                      heading: HeadingLevel.HEADING_1,
                      spacing: { after: 50 }
                    }),
                    new Paragraph({
                      text: "Manufactured by ATENTI ORIGINS",
                      spacing: { after: 100 }
                    })
                  ],
                  width: { size: 40, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: "ATENTI ORIGINS PHOTOELECTRICITY CONSORT PVT.LTD.",
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 50 }
                    }),
                    new Paragraph({
                      text: "Registered Office: 504, 5th Floor ABW Elegance Tower, Jasola District Centre, Jasola, New Delhi - 110025",
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 50 }
                    }),
                    new Paragraph({
                      text: "Factory: B-10, Sector-88, Noida - 201301 | Branch Offices: Lucknow, Mumbai, Hyderabad",
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 50 }
                    })
                  ],
                  width: { size: 60, type: WidthType.PERCENTAGE }
                })
              ]
            })
          ]
        }),
        
        // QUOTATION title
        new Paragraph({
          text: "QUOTATION",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200, before: 200 }
        }),
        
        // Quotation Number and Date
        new Paragraph({
          text: "Quotation #: ORION/2025/07/Prachi/0193",
          spacing: { after: 30 }
        }),
        new Paragraph({
                          text: `Date: ${new Date().toLocaleDateString('en-GB')}`,
          spacing: { after: 100 }
        }),
        
        // Client Details Section
        new Paragraph({
          text: "ATENTI ORIGINS PHOTOELECTRICITY CONSORT PVT.LTD.",
          spacing: { after: 50, before: 100 }
        }),
        new Paragraph({
          text: "GSTIN: 07AACCO1103D2Z7",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "Project Name: Indian Industries Association",
          spacing: { after: 30 }
        }),
        new Paragraph({
          text: "Contact Person Name: Mohit Dixit",
          spacing: { after: 30 }
        }),
        new Paragraph({
          text: "Contact & E-mail: 8601855540, accounts@iiaonline.in",
          spacing: { after: 30 }
        }),
        new Paragraph({
          text: "Company Address:",
          spacing: { after: 100 }
        }),
        
        // ORION Details Section
        new Paragraph({
          text: "ORION Details:",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 50, before: 100 }
        }),
        new Paragraph({
          text: "Location: Lucknow",
          spacing: { after: 30 }
        }),
        new Paragraph({
          text: "Sales Person: Ashwani Yadav",
          spacing: { after: 30 }
        }),
        new Paragraph({
          text: "Contact Number: 98391 77083",
          spacing: { after: 30 }
        }),
        new Paragraph({
          text: "Email ID: ashwani.yadav@orion-led.com",
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          text: "Section A: Product Description",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 150, before: 200 }
        }),
        
        // Product Description Table with Pricing
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Series/Indoor/Outdoor" })],
                  shading: { fill: "4472C4" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: `${selectedProduct.category}, ${selectedProduct.environment.charAt(0).toUpperCase() + selectedProduct.environment.slice(1)}` })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Pixel Pitch" })],
                  shading: { fill: "4472C4" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: `P${selectedProduct.pixelPitch}` })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Module Dimension in mm (W X H)" })],
                  shading: { fill: "4472C4" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: `${selectedProduct.cabinetDimensions.width} x ${selectedProduct.cabinetDimensions.height}` })]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Display Size in mtr (W X H)" })],
                  shading: { fill: "F2F2F2" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: `${toDisplayUnit(config.width, 'm')} x ${toDisplayUnit(config.height, 'm')}` })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Display Size in ft (W X H)" })],
                  shading: { fill: "F2F2F2" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: `${toDisplayUnit(config.width, 'ft')} x ${toDisplayUnit(config.height, 'ft')}` })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Display Resolution in pixels (H X V)" })],
                  shading: { fill: "F2F2F2" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: `${selectedProduct.resolution.width * cabinetGrid.columns} x ${selectedProduct.resolution.height * cabinetGrid.rows}` })]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Matrix" })],
                  shading: { fill: "F2F2F2" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: `${cabinetGrid.columns} x ${cabinetGrid.rows}` })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Unit Price" })],
                  shading: { fill: "F2F2F2" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: "₹5,300" })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Quantity" })],
                  shading: { fill: "F2F2F2" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: "49.90" })]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "UOM" })],
                  shading: { fill: "F2F2F2" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Ft2" })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Price" })],
                  shading: { fill: "F2F2F2" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: "₹2,64,470" })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "GST (Extra)" })],
                  shading: { fill: "F2F2F2" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: "28%" })]
                })
              ]
            })
          ]
        }),
        

        
        new Paragraph({
          text: "TOTAL A: Total Amount: ₹2,64,470",
          spacing: { after: 150, before: 100 }
        }),
        
        new Paragraph({
          text: "Section B: Control System & Accessories",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 150, before: 200 }
        }),
        
        // Control System Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Controller - Model" })],
                  shading: { fill: "4472C4" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: processor || "Nova TB2" })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "1" })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Nos." })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "₹35,000" })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: "18%" })]
                })
              ]
            })
          ]
        }),
        
        new Paragraph({
          text: "TOTAL B: Total Amount: ₹35,000",
          spacing: { after: 150, before: 100 }
        }),
        
        new Paragraph({
          text: "TOTAL Price (A+B): ₹2,99,470",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200, before: 100 }
        }),
        
        // Footer with contact info
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "QR Code" })],
                  width: { size: 30, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: "Email: sales@orion-led.com | LinkedIn: ORION LED | Facebook: @OrionLedDisplay | Instagram: @orion_led_ | YouTube: @OrionLED",
                      alignment: AlignmentType.CENTER
                    })
                  ],
                  width: { size: 70, type: WidthType.PERCENTAGE }
                })
              ]
            })
          ]
        }),

        // Page Break
        new Paragraph({
          pageBreakBefore: true,
          spacing: { after: 0 }
        }),

        // Page 7: Image Page
        ...(images[6] ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: images[6],
                transformation: {
                  width: 595,
                  height: 842,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ] : [
          new Paragraph({
            text: "Page 7 - Image not available",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 400 }
          }),
        ]),

        // Page Break
        new Paragraph({
          pageBreakBefore: true,
          spacing: { after: 0 }
        }),

        // Page 8: Image Page
        ...(images[7] ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: images[7],
                transformation: {
                  width: 595,
                  height: 842,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ] : [
          new Paragraph({
            text: "Page 8 - Image not available",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 400 }
          }),
        ]),

        // Page Break
        new Paragraph({
          pageBreakBefore: true,
          spacing: { after: 0 }
        }),

        // Page 9: Image Page
        ...(images[8] ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: images[8],
                transformation: {
                  width: 595,
                  height: 842,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ] : [
          new Paragraph({
            text: "Page 9 - Image not available",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 400 }
          }),
        ]),

        // Page Break
        new Paragraph({
          pageBreakBefore: true,
          spacing: { after: 0 }
        }),

        // Page 10: Image Page
        ...(images[9] ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: images[9],
                transformation: {
                  width: 595,
                  height: 842,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ] : [
          new Paragraph({
            text: "Page 10 - Image not available",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 400 }
          }),
        ]),
      ]
    }]
  });

  return await Packer.toBlob(doc);
};

interface UserInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
}

// Function to generate HTML preview of the configuration
export const generateConfigurationHtml = (
  config: DisplayConfig,
  selectedProduct: Product,
  cabinetGrid: CabinetGrid,
  processor?: string,
  mode?: string,
  userInfo?: UserInfo
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
  const displayAreaFeet = displayedWidth * displayedHeight;
  const displayArea = (config.width * config.height) / 1000000; // mm² to m²
  const displayAreaInDisplayUnit = config.unit === 'ft' ? displayAreaFeet : displayArea;

  // Calculate diagonal
  const diagonalMeters = Math.sqrt(Math.pow(config.width/1000, 2) + Math.pow(config.height/1000, 2));
  const diagonalInDisplayUnit = config.unit === 'ft' ? diagonalMeters * METERS_TO_FEET : diagonalMeters;
  const diagonalInches = diagonalMeters * 39.3701;
  const feet = Math.floor(diagonalInches / 12);
  const inches = Math.round((diagonalInches % 12) * 16) / 16;

  // Calculate power consumption
  const avgPowerPerCabinet = selectedProduct.avgPowerConsumption || 91.7;
  const maxPowerPerCabinet = selectedProduct.maxPowerConsumption || (avgPowerPerCabinet * 3);
  const avgPower = (avgPowerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(2);
  const maxPower = (maxPowerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(2);

  // Calculate total pixels
  const totalPixels = selectedProduct.resolution.width * cabinetGrid.columns * selectedProduct.resolution.height * cabinetGrid.rows;

  // Format Indian number
  const formatIndianNumber = (x: number): string => {
    const s = x.toString();
    let afterFirst = s.length > 3 ? s.slice(0, s.length - 3) : '';
    const lastThree = s.slice(-3);
    if (afterFirst) {
      afterFirst = afterFirst.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
      return afterFirst + ',' + lastThree;
    } else {
      return lastThree;
    }
  };

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ORION LED - Configuration Report</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f8f9fa;
            }
            .page {
                width: 180mm;
                height: 250mm;
                margin: 15px auto;
                background: white;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                page-break-after: always;
                overflow: hidden;
            }
            .page img {
                max-width: 95%;
                max-height: 95%;
                object-fit: contain;
            }
            .page:last-child {
                page-break-after: auto;
            }
            @media print {
                .page {
                    margin: 0;
                    box-shadow: none;
                    page-break-after: always;
                }
            }
        </style>
    </head>
    <body>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0001.jpg" alt="Page 1" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0002.jpg" alt="Page 2" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0003.jpg" alt="Page 3" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0004.jpg" alt="Page 4" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0005.jpg" alt="Page 5" />
        </div>
        <div class="page" style="padding: 15px; padding-bottom: 60px; display: block; text-align: left; font-size: 0.7em; line-height: 1.2; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); min-height: 100vh;">
            <!-- Enhanced Professional Header with Logo and Company Info -->
            <div style="background: linear-gradient(135deg, #4472C4 0%, #2E5A8A 100%); color: white; padding: 6px; margin-bottom: 4px; position: relative; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 15px rgba(68, 114, 196, 0.3);">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <!-- Left Side - Logo Area -->
                    <div style="flex-shrink: 0;">
                        <div style="background: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2); position: relative; overflow: hidden;">
                            <!-- ORION LED Official Logo -->
                            <img src="https://orion-led.com/wp-content/uploads/2025/06/logo-white-1.png" alt="ORION LED Logo" style="width: 50px; height: 50px; object-fit: contain; object-position: center;">
                        </div>
                        <div style="text-align: center; margin-top: 2px;">
                            <h1 style="color: #000; font-size: 1em; margin: 0; font-family: 'Times New Roman', serif; font-weight: bold;">ORION</h1>
                            <p style="color: #22c55e; font-size: 0.8em; margin: 0; font-weight: bold; text-transform: uppercase;">LED</p>
                            <p style="color: #000; font-size: 0.3em; margin: 1px 0 0 0; font-style: italic;">Manufactured by</p>
                            <p style="color: #3b82f6; font-size: 0.4em; margin: 0; font-weight: bold;">ATENTI</p>
                            <p style="color: #000; font-size: 0.4em; margin: 0;">ORIGINS</p>
                        </div>
                    </div>
                    
                    <!-- Right Side - Company Info -->
                    <div style="flex: 1;">
                        <div style="margin-bottom: 2px;">
                            <h2 style="color: #FFD700; font-size: 1em; margin: 0; font-weight: bold; text-transform: uppercase;">ATENTI</h2>
                            <h2 style="color: white; font-size: 1.1em; margin: 0; font-family: 'Times New Roman', serif; font-weight: bold;">ORIGINS</h2>
                        </div>
                        <p style="color: white; font-size: 0.6em; margin: 1px 0; font-weight: 500;">
                            ATENTI ORIGINS PHOTOELECTRICITY CONSORT PVT.LTD.
                        </p>
                        <p style="color: #E8F4FD; font-size: 0.5em; margin: 1px 0;">
                            Reg. Office: 504, 5th Floor ABW Elegance Tower, Jasola District Centre, Jasola, New Delhi 110025
                        </p>
                        <p style="color: #E8F4FD; font-size: 0.5em; margin: 1px 0;">
                            Factory : B-10, Sector-88, Noida - 201301
                        </p>
                        <p style="color: #E8F4FD; font-size: 0.5em; margin: 1px 0;">
                            Branch Offices: Lucknow, Mumbai, Hyderabad
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Eye-catching QUOTATION title -->
            <div style="background: linear-gradient(135deg, #4472C4 0%, #2E5A8A 100%); color: white; padding: 8px; text-align: center; margin: 10px 0; border-radius: 10px; box-shadow: 0 4px 15px rgba(68, 114, 196, 0.4); position: relative; overflow: hidden;">
                <div style="position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px; background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%); animation: shine 2s infinite;"></div>
                <h1 style="margin: 0; font-size: 1.3em; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">📋 QUOTATION</h1>
            </div>
            
            <!-- Quotation Details with Professional Styling -->
            <div style="background: white; padding: 6px; border-radius: 8px; margin: 4px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-left: 5px solid #4472C4;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <p style="margin: 3px 0; font-size: 0.8em; color: #333;"><strong>📄 Quotation #:</strong> <span style="color: #4472C4; font-weight: bold;">ORION/2025/07/Prachi/0193</span></p>
                        <p style="margin: 3px 0; font-size: 0.8em; color: #333;"><strong>📅 Date:</strong> <span style="color: #4472C4; font-weight: bold;">${new Date().toLocaleDateString('en-GB')}</span></p>
                    </div>
                </div>
            </div>
              
              ${userInfo ? `
              <!-- Dynamic Client Information Section -->
              <div style="background: white; padding: 12px; border-radius: 8px; margin: 8px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid #e9ecef;">
                  <h3 style="color: #4472C4; margin: 0 0 8px 0; font-size: 0.9em; border-bottom: 2px solid #4472C4; padding-bottom: 4px;">
                      👤 CLIENT INFORMATION
                  </h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                      <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 8px; border-radius: 6px; border-left: 4px solid #4472C4;">
                          <h4 style="margin: 0 0 6px 0; color: #2c3e50; font-size: 0.8em; font-weight: bold;">👤 CLIENT DETAILS</h4>
                          <p style="margin: 3px 0; font-weight: bold; color: #2c3e50;">📛 Name: ${userInfo.fullName}</p>
                          <p style="margin: 3px 0; color: #6c757d;">📧 Email: ${userInfo.email}</p>
                          <p style="margin: 3px 0; color: #6c757d;">📞 Phone: ${userInfo.phoneNumber}</p>
                      </div>
                      <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 8px; border-radius: 6px; border-left: 4px solid #2196f3;">
                          <h4 style="margin: 0 0 6px 0; color: #1976d2; font-size: 0.8em; font-weight: bold;">🌟 ORION SALES TEAM</h4>
                          <p style="margin: 3px 0; color: #424242;">📍 Location: Lucknow</p>
                          <p style="margin: 3px 0; color: #424242;">👨‍💼 Sales Person: Ashwani Yadav</p>
                          <p style="margin: 3px 0; color: #424242;">📞 Contact: 98391 77083</p>
                          <p style="margin: 3px 0; color: #424242;">📧 Email: ashwani.yadav@orion-led.com</p>
                      </div>
                  </div>
              </div>
              ` : ''}
              
              <!-- Section A: Product Description with Enhanced Styling -->
            <div style="background: white; padding: 8px; border-radius: 12px; margin: 4px 0; box-shadow: 0 6px 20px rgba(0,0,0,0.1); border: 1px solid #e9ecef; position: relative; overflow: hidden;">
                <!-- Background Pattern -->
                <div style="position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: linear-gradient(135deg, rgba(68, 114, 196, 0.05) 0%, rgba(46, 90, 138, 0.05) 100%); border-radius: 50%; transform: translate(30px, -30px);"></div>
                
                <h2 style="color: #4472C4; margin: 0 0 8px 0; font-size: 1em; border-bottom: 3px solid #4472C4; padding-bottom: 6px; display: flex; align-items: center; position: relative; z-index: 1;">
                    <span style="background: linear-gradient(135deg, #4472C4 0%, #2E5A8A 100%); color: white; padding: 4px 10px; border-radius: 20px; margin-right: 10px; font-size: 0.8em; font-weight: bold; box-shadow: 0 2px 8px rgba(68, 114, 196, 0.3);">A</span>
                    <span style="margin-right: 8px;">🖥️</span>
                    <span style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">PRODUCT DESCRIPTION</span>
                </h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 6px 0;">
                    <!-- Left Column - Specifications -->
                    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #4472C4 0%, #2E5A8A 100%); padding: 8px; color: white;">
                            <h4 style="margin: 0; font-size: 0.8em; font-weight: 700; text-transform: uppercase;">📋 PRODUCT SPECIFICATIONS</h4>
                        </div>
                        <div style="padding: 8px;">
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Series/Environment:</span>
                                <span style="color: #4472C4; font-weight: 600; font-size: 0.7em;">${selectedProduct.category}, ${selectedProduct.environment.charAt(0).toUpperCase() + selectedProduct.environment.slice(1)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Pixel Pitch:</span>
                                <span style="color: #4472C4; font-weight: 600; font-size: 0.7em;">P${selectedProduct.pixelPitch}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Module Dimension:</span>
                                <span style="color: #4472C4; font-weight: 600; font-size: 0.7em;">${selectedProduct.cabinetDimensions.width} x ${selectedProduct.cabinetDimensions.height} mm</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Display Size (m):</span>
                                <span style="color: #4472C4; font-weight: 600; font-size: 0.7em;">${toDisplayUnit(config.width, 'm')} x ${toDisplayUnit(config.height, 'm')}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Display Size (ft):</span>
                                <span style="color: #4472C4; font-weight: 600; font-size: 0.7em;">${toDisplayUnit(config.width, 'ft')} x ${toDisplayUnit(config.height, 'ft')}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Resolution:</span>
                                <span style="color: #4472C4; font-weight: 600; font-size: 0.7em;">${selectedProduct.resolution.width * cabinetGrid.columns} x ${selectedProduct.resolution.height * cabinetGrid.rows}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Matrix:</span>
                                <span style="color: #4472C4; font-weight: 600; font-size: 0.7em;">${cabinetGrid.columns} x ${cabinetGrid.rows}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Column - Pricing -->
                    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #4472C4 0%, #2E5A8A 100%); padding: 8px; color: white;">
                            <h4 style="margin: 0; font-size: 0.8em; font-weight: 700; text-transform: uppercase;">💰 PRICING DETAILS</h4>
                        </div>
                        <div style="padding: 8px;">
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Unit Price:</span>
                                <span style="color: #4472C4; font-weight: 700; font-size: 0.7em;">₹5,300</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Quantity:</span>
                                <span style="color: #4472C4; font-weight: 600; font-size: 0.7em;">49.90 Ft²</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Subtotal:</span>
                                <span style="color: #4472C4; font-weight: 700; font-size: 0.7em;">₹2,64,470</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">GST (28%):</span>
                                <span style="color: #dc3545; font-weight: 700; font-size: 0.7em;">₹74,052</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); margin: 0 -8px; padding: 6px 8px; border-radius: 4px;">
                                <span style="font-weight: 700; color: #2c3e50; font-size: 0.8em;">TOTAL:</span>
                                <span style="color: #4472C4; font-weight: 700; font-size: 0.8em;">₹2,64,470</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #4472C4 0%, #2E5A8A 100%); color: white; padding: 8px; border-radius: 8px; margin-top: 6px; text-align: center; box-shadow: 0 6px 20px rgba(68, 114, 196, 0.4); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%); animation: shine 2s infinite;"></div>
                    <p style="margin: 0; font-size: 1em; font-weight: bold; position: relative; z-index: 1;">💰 TOTAL A: ₹2,64,470</p>
                </div>
            </div>
            
            <!-- Section B: Control System with Enhanced Styling -->
            <div style="background: white; padding: 8px; border-radius: 8px; margin: 4px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid #e9ecef;">
                <h2 style="color: #2196f3; margin: 0 0 8px 0; font-size: 1em; border-bottom: 2px solid #2196f3; padding-bottom: 4px; display: flex; align-items: center;">
                    <span style="background: #2196f3; color: white; padding: 3px 8px; border-radius: 15px; margin-right: 8px; font-size: 0.7em;">B</span>
                    🎮 CONTROL SYSTEM & ACCESSORIES
                </h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 4px 0;">
                    <!-- Left Column - Controller Details -->
                    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); padding: 8px; color: white;">
                            <h4 style="margin: 0; font-size: 0.8em; font-weight: 700; text-transform: uppercase;">🎮 CONTROLLER DETAILS</h4>
                        </div>
                        <div style="padding: 8px;">
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Controller Model:</span>
                                <span style="color: #1976d2; font-weight: 600; font-size: 0.7em;">${processor || "Nova TB2"}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Quantity:</span>
                                <span style="color: #1976d2; font-weight: 600; font-size: 0.7em;">1</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">UOM:</span>
                                <span style="color: #1976d2; font-weight: 600; font-size: 0.7em;">Nos.</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Column - Controller Pricing -->
                    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #4472C4 0%, #2E5A8A 100%); padding: 8px; color: white;">
                            <h4 style="margin: 0; font-size: 0.8em; font-weight: 700; text-transform: uppercase;">💰 CONTROLLER PRICING</h4>
                        </div>
                        <div style="padding: 8px;">
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">Unit Price:</span>
                                <span style="color: #4472C4; font-weight: 700; font-size: 0.7em;">₹35,000</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <span style="font-weight: 600; color: #2c3e50; font-size: 0.7em;">GST (18%):</span>
                                <span style="color: #dc3545; font-weight: 700; font-size: 0.7em;">₹6,300</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); margin: 0 -8px; padding: 6px 8px; border-radius: 4px;">
                                <span style="font-weight: 700; color: #2c3e50; font-size: 0.8em;">TOTAL:</span>
                                <span style="color: #4472C4; font-weight: 700; font-size: 0.8em;">₹35,000</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Grand Total with Premium Styling -->
            <div style="background: linear-gradient(135deg, #4472C4 0%, #2E5A8A 100%); color: white; padding: 10px; border-radius: 10px; margin: 10px 0; text-align: center; box-shadow: 0 6px 20px rgba(68, 114, 196, 0.4); position: relative; overflow: hidden;">
                <div style="position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px; background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%); animation: shine 2s infinite;"></div>
                <h2 style="margin: 0 0 6px 0; font-size: 1.2em; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">🎯 GRAND TOTAL</h2>
                <p style="margin: 0; font-size: 1.8em; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">₹2,99,470</p>
                <p style="margin: 3px 0 0 0; font-size: 0.8em; opacity: 0.9;">(A + B)</p>
            </div>
            
            <!-- Professional Footer -->
            <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 8px; border-radius: 4px; margin-top: 8px; margin-bottom: 40px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 2px 0; color: #FFD700; font-size: 0.7em;">📱 Connect With Us</h4>
                        <p style="margin: 3px 0; font-size: 0.8em; color: #bdc3c7;">
                            📧 sales@orion-led.com | 💼 LinkedIn: ORION LED | 
                            📘 Facebook: @OrionLedDisplay | 📷 Instagram: @orion_led_ | 
                            📺 YouTube: @OrionLED
                        </p>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div style="background: rgba(255,255,255,0.1); padding: 4px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2);">
                            <p style="margin: 0; font-size: 0.6em; color: #FFD700; font-weight: bold;">🔐 Secure & Reliable</p>
                            <p style="margin: 1px 0 0 0; font-size: 0.4em; color: #bdc3c7;">ISO Certified Quality</p>
                        </div>
                    </div>
                    <div style="flex: 1; text-align: right;">
                        <div style="background: rgba(255,255,255,0.1); padding: 4px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2);">
                            <p style="margin: 0; font-size: 0.6em; color: #FFD700; font-weight: bold;">📊 QR Code</p>
                            <p style="margin: 1px 0 0 0; font-size: 0.4em; color: #bdc3c7;">Scan for Details</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Spacer to prevent cropping -->
            <div style="height: 50px; width: 100%;"></div>
            
            <style>
                @keyframes shine {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            </style>
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0007.jpg" alt="Page 7" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0008.jpg" alt="Page 8" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0009.jpg" alt="Page 9" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0010.jpg" alt="Page 10" />
        </div>
    </body>
    </html>
  `;

  return html;
};


