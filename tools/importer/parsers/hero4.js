/* global WebImporter */
export default function parse(element, { document }) {
  // Header row as per instructions
  const headerRow = ['Hero (hero4)'];
  // No background image row (leave empty)
  const backgroundRow = [''];

  // Main content row: must include all visible text, buttons, links
  const container = element.querySelector('.container_24');
  let contentNodes = [];
  if (container) {
    // Gather all non-empty direct child elements and meaningful text nodes
    contentNodes = Array.from(container.childNodes).filter(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Accept all elements except script/style
        const tag = node.tagName ? node.tagName.toLowerCase() : '';
        return tag !== 'script' && tag !== 'style' &&
          (node.textContent.trim() !== '' || node.querySelector('button, a'));
      }
      // For text nodes, keep if not just whitespace
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.trim() !== '';
      }
      return false;
    });
    // If for some reason there are no content nodes, but there is text deep inside, check for any descendants
    if (!contentNodes.length && container.textContent.trim()) {
      contentNodes = [document.createTextNode(container.textContent.trim())];
    }
  }
  // Always provide a cell, even if empty
  const contentRow = [contentNodes.length ? contentNodes : ['']];

  const rows = [headerRow, backgroundRow, contentRow];
  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
