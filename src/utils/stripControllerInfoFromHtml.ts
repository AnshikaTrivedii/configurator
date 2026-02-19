/**
 * Removes the Controller Information page/section from quotation HTML
 * so it is not shown in the PDF preview or saved as pdfPage6HTML.
 */

const CONTROLLER_INFO_MARKERS = ['Controller Information', 'CONTROLLER INFORMATION'];

/**
 * Strip the Controller Information section (or full page containing it) from HTML.
 * Safe to call in browser; returns unchanged HTML if parsing fails.
 */
export function stripControllerInformationFromHtml(html: string): string {
  if (!html || typeof html !== 'string') return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    if (!body) return html;

    let toRemove: Element | null = null;
    const all = body.querySelectorAll('*');

    for (const el of all) {
      const text = (el.textContent || '').trim();
      const isHeading =
        el.tagName === 'H3' || el.tagName === 'H4' || el.tagName === 'H2';
      const matchesMarker =
        CONTROLLER_INFO_MARKERS.some((m) => text === m) ||
        (isHeading && text.toUpperCase().includes('CONTROLLER INFORMATION'));

      if (matchesMarker) {
        const pageDiv = el.closest?.('.page');
        toRemove = pageDiv || el.closest?.('div') || el.parentElement;
        break;
      }
    }

    if (toRemove && toRemove.parentNode) {
      toRemove.parentNode.removeChild(toRemove);
    }

    return doc.documentElement ? doc.documentElement.outerHTML : html;
  } catch {
    return html;
  }
}
