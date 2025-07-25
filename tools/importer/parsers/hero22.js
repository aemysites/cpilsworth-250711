/* global WebImporter */
export default function parse(element, { document }) {
  // Table header row, must match example exactly
  const headerRow = ['Hero (hero22)'];
  // Background image row is blank (no img element in provided HTML)
  const bgImageRow = [''];

  // --- Content extraction ---
  // We need to include ALL visible text content from the button, except aria-offscreen spans and the arrow img
  // Also, turn the button into a link, preserving the text

  // 1. Extract the link from the button's onclick attribute
  let href = '';
  const onclick = element.getAttribute('onclick');
  if (onclick) {
    const match = onclick.match(/openLink\('([^']+)'/);
    if (match) {
      href = match[1];
    }
  }

  // 2. Extract visible text content (ignore aria-offscreen spans and images)
  let ctaText = '';
  // Loop through children to get non-offscreen, non-image text
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      ctaText += node.textContent;
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      !(node.classList && node.classList.contains('aria-offscreen')) &&
      node.tagName !== 'IMG'
    ) {
      ctaText += node.textContent;
    }
    // else skip
  }
  ctaText = ctaText.replace(/\s+/g, ' ').trim();

  // 3. Build link element using document reference
  let cellContent = '';
  if (ctaText) {
    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = ctaText;
      cellContent = a;
    } else {
      cellContent = ctaText;
    }
  }
  // 4. Compose content row
  const contentRow = [cellContent];

  // --- Compose block table ---
  const cells = [
    headerRow,
    bgImageRow,
    contentRow
  ];
  const block = WebImporter.DOMUtils.createTable(cells, document);
  // --- Replace the original element ---
  element.replaceWith(block);
}
