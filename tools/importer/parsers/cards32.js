/* global WebImporter */
export default function parse(element, { document }) {
  // Block header EXACTLY as in example
  const headerRow = ['Cards (cards32)'];

  // Get all direct child anchor elements (cards)
  const cardLinks = Array.from(element.querySelectorAll(':scope > a'));
  
  const rows = cardLinks.map(card => {
    // Image: first <img> found in card
    const img = card.querySelector('img');

    // Text content: everything but the image, combined in correct vertical order
    // We'll find the deepest grid in the card (which wraps the text and the inner layout)
    // The text is always after the image inside a grid
    // We want ALL text visible in the card, including tag, minutes, heading, paragraph, CTA
    let textBlock = null;
    // Find the grid(s) inside the card
    const grids = Array.from(card.querySelectorAll('.w-layout-grid'));
    if (grids.length) {
      // The inner grid holds [img, <div>textBlock]
      const lastGrid = grids[grids.length-1];
      // Find the non-image child (should be the text block wrapper)
      const candidates = Array.from(lastGrid.children);
      textBlock = candidates.find(child => child.tagName !== 'IMG');
    } else {
      // Fallback: all <div>s after the image
      const children = Array.from(card.children);
      let collecting = false;
      let textDivs = [];
      for (const child of children) {
        if (child === img) {
          collecting = true;
          continue;
        }
        if (collecting && child.tagName === 'DIV') {
          textDivs.push(child);
        }
      }
      if (textDivs.length === 1) {
        textBlock = textDivs[0];
      } else if (textDivs.length > 1) {
        // Wrap in a span for vertical stacking
        const wrapper = document.createElement('div');
        textDivs.forEach(div => wrapper.appendChild(div));
        textBlock = wrapper;
      }
    }
    // As a last fallback, if nothing found, get all divs inside card (shouldn't happen)
    if (!textBlock) {
      const divs = Array.from(card.querySelectorAll('div'));
      if (divs.length === 1) {
        textBlock = divs[0];
      } else {
        const wrapper = document.createElement('div');
        divs.forEach(div => wrapper.appendChild(div));
        textBlock = wrapper;
      }
    }
    // The textBlock is a reference to existing document element, so order is preserved
    return [img, textBlock];
  });

  const cells = [headerRow, ...rows];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
