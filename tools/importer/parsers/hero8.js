/* global WebImporter */
export default function parse(element, { document }) {
  // Header row as per block name in example
  const headerRow = ['Hero (hero8)'];

  // --- Image/BG row ---
  // Look for image within .heroCompImg (or anywhere inside element as fallback)
  let imgEl = null;
  const imgWrapper = element.querySelector('.heroCompImg');
  if (imgWrapper) {
    imgEl = imgWrapper.querySelector('img');
  }
  if (!imgEl) {
    imgEl = element.querySelector('img');
  }
  const imageRow = [imgEl ? imgEl : ''];

  // --- Content row ---
  // Find the container with the main textual content
  // In this case, it's the .container_24 .heroCompWrapper or fallback to section.imgTxtFullWidth
  let container = null;
  let section = null;
  if (imgWrapper) {
    container = imgWrapper.querySelector('.container_24');
    if (container) {
      section = container.querySelector('section.imgTxtFullWidth') || container.querySelector('section');
    }
  }
  if (!section) {
    section = element.querySelector('section.imgTxtFullWidth') || element.querySelector('section');
  }

  // Collect all relevant elements from the section, in source order, preserving semantics
  let contentBits = [];
  if (section) {
    // Headings, paragraphs, buttons, and links, in order
    // Most important: preserve order and semantic structure
    const bits = [];
    for (const child of Array.from(section.children)) {
      // If it's a heading, paragraph, button, or anchor, include it
      if (/^H[1-6]$/.test(child.tagName) || child.tagName === 'P' || child.tagName === 'BUTTON' || child.tagName === 'A') {
        bits.push(child);
      } else if (child.classList.contains('bodyCopy')) {
        // Also include .bodyCopy divs, as they may wrap paragraphs
        for (const inner of Array.from(child.children)) {
          bits.push(inner);
        }
      }
    }
    // As a fallback, if no bits found, include the section itself
    contentBits = bits.length ? bits : [section];
  } else {
    // Fallback: nothing found
    contentBits = [];
  }
  // Remove any elements that have no visible text (e.g. aria-offscreen spans, empty divs)
  contentBits = contentBits.filter(el => {
    if (typeof el === 'string') return el.trim().length > 0;
    if (!el.textContent) return false;
    return el.textContent.trim().length > 0;
  });
  const contentRow = [contentBits.length === 1 ? contentBits[0] : contentBits];

  // Build the block table: 3 rows, 1 column, as in the example
  const cells = [headerRow, imageRow, contentRow];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
