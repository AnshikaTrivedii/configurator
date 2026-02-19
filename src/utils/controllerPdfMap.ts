/**
 * Controller name → S3 PDF URL mapping for "View Controller PDF" in Configuration Summary.
 * Keys match display names; lookup is case-insensitive and ignores spaces.
 */

export const controllerPdfMap: Record<string, string> = {
  "VX1000 Pro": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/VX1000+Pro+Controller+Specs+V1.2.pdf",
  "VX600 Pro": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/VX600+Pro+Controller+Specifications+V1.2.pdf",
  "VX600": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/VX600+All-in-One+Controller+Specs+V1.3.1.pdf",
  "VX400 Pro": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/VX400+Pro+Controller+Specifications+V1.2.pdf",
  "VX400": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/VX400+All-in-One+Controller+User+Manual+V1.0.pdf",
  "VX1000": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/Novastar+VX1000+Controller+Specs+v1.3.1.pdf",
  "TU40 Pro": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/TU40+Pro+LED+Processor+Specs+V1.2.2.pdf",
  "TU20 Pro": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/TU20+Pro+LED+Processor+Specs+V1.6.2.pdf",
  "TU15 Pro": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/TU15+Pro+LED+Processor+Specs+V1.6.2.pdf",
  "TU4K Pro": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/TU4K+Pro+LED+Processor+Specs+V1.2.1.pdf",
  "VX16S": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/Novastar+VX16S+User+Manual+(1).pdf",
  "VX1": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/Processor+Data+Sheet+-+Video+Controller.pdf",
  "TB40": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/Processor+Data+Sheet+V1.0.12.pdf",
  "TB60": "https://orion-led-quotations.s3.ap-south-1.amazonaws.com/processor+pdf/TB60+Specifications+V1.0.4.pdf"
};

const normalize = (name: string | null | undefined): string =>
  (name ?? "").toLowerCase().replace(/\s+/g, "");

/** Normalized map for lookup (built once). */
const normalizedMap: Record<string, string> = Object.fromEntries(
  Object.entries(controllerPdfMap).map(([key, value]) => [normalize(key), value])
);

/**
 * Returns the PDF URL for the given controller/processor name, or null if not found.
 * Lookup is case-insensitive and ignores spaces (e.g. "VX600 Pro" and "VX600Pro" match).
 */
export function getControllerPdfUrl(controllerName: string | null | undefined): string | null {
  if (!controllerName) return null;
  return normalizedMap[normalize(controllerName)] ?? null;
}
