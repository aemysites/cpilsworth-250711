/* global WebImporter */
export default function parse(element, { document }) {
  // Find the table block that represents the cards
  const table = element.querySelector('table');
  if (!table) return;
  const tr = table.querySelector('tr');
  if (!tr) return;
  const tds = Array.from(tr.children);
  // Each cell is a Card, with an image/icon and rich text
  const cards = tds.map(td => {
    // Image/Icon is the first <img> inside td
    const img = td.querySelector('img') || '';
    // Now collect everything else as text cell, maintaining order/semantics
    // We'll skip the image node, but keep everything else including headings, paragraphs, links, formatting
    const content = [];
    Array.from(td.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'img') {
        return; // skip image, already used
      }
      // Remove empty <p> (just whitespace or &nbsp;)
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'p' && node.textContent.replace(/\u00A0/g, '').trim() === '') {
        return;
      }
      // Otherwise, keep node as-is
      if (node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent.trim())) {
        content.push(node);
      }
    });
    // If content is empty fallback to empty string so the cell isn't empty
    return [img, content.length ? content : ''];
  });

  // Build the table structure for the block
  const cells = [
    ['Cards (cards13)'],
    ...cards
  ];

  const block = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(block);
}
