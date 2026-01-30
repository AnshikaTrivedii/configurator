/**
 * Utility to extract pages from DOCX template and convert them to images
 * This replaces the Pages-to-JPG folder approach
 */

import mammoth from 'mammoth';
import html2canvas from 'html2canvas';

const TEMPLATE_DOCX_PATH = '/assets/docs/ADA Project Bellatrix P4 6.3 x 3.15ft - Copy (1).docx';

/**
 * Extract all pages from the DOCX template and convert them to image data URLs
 * Returns an array of image data URLs, one per page
 */
export const extractDocxPagesAsImages = async (): Promise<string[]> => {
  try {

    const response = await fetch(TEMPLATE_DOCX_PATH);
    if (!response.ok) {

      throw new Error(`Failed to fetch DOCX template: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='Page Break'] => p.page-break",
          "br[type='page'] => br.page-break"
        ]
      }
    );
    
    const html = result.value;

    const pageBreakPatterns = [
      /<p[^>]*style[^>]*page-break[^>]*>/gi,
      /<br[^>]*page-break[^>]*\/>/gi,
      /<div[^>]*style[^>]*page-break[^>]*>/gi,
      /<w:br[^>]*w:type="page"[^>]*>/gi, // Word page breaks in HTML
    ];
    
    let pages: string[] = [html];
    for (const pattern of pageBreakPatterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {

        pages = html.split(pattern).filter(page => page.trim().length > 0);
        break;
      }
    }

    if (pages.length === 1) {

      pages = [html]; // Keep as single page for now
    }
    
    const pageContents = pages.length > 0 ? pages : [html];

    const pageImages: string[] = [];
    
    for (let i = 0; i < pageContents.length; i++) {
      const pageHtml = pageContents[i];

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = '210mm';
      container.style.minHeight = '297mm';
      container.style.background = '#ffffff';
      container.style.padding = '0';
      container.style.margin = '0';
      container.style.boxSizing = 'border-box';

      const styledHtml = `
        <div style="
          width: 210mm;
          min-height: 297mm;
          background: white;
          padding: 0;
          margin: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          ${pageHtml}
        </div>
      `;
      
      container.innerHTML = styledHtml;
      document.body.appendChild(container);

      const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(
        images.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>(resolve => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
        )
      );

      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight,
        backgroundColor: '#ffffff',
        windowWidth: 794, // A4 width in pixels at 96 DPI
        windowHeight: 1123, // A4 height in pixels at 96 DPI
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      pageImages.push(dataUrl);

      document.body.removeChild(container);

    }
    
    return pageImages;
    
  } catch (error) {

    return [];
  }
};

/**
 * Get a specific page image by index (1-based)
 * Returns null if page doesn't exist
 */
export const getDocxPageImage = async (pageNumber: number): Promise<string | null> => {
  const allPages = await extractDocxPagesAsImages();
  const index = pageNumber - 1; // Convert to 0-based index
  
  if (index >= 0 && index < allPages.length) {
    return allPages[index];
  }
  
  return null;
};

/**
 * Get the template DOCX path
 */
export const getTemplateDocxPath = (): string => {
  return TEMPLATE_DOCX_PATH;
};

