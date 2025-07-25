/* global WebImporter */
export default function parse(element, { document }) {
  // Header row as in the example
  const headerRow = ['Columns (columns42)'];

  // Locate the main content pane
  const pane = element.querySelector('.pane');
  let leftCell = '';
  let rightCell = '';

  if (pane) {
    // Left cell: everything from .pane except the <form>
    const leftContent = [];
    Array.from(pane.childNodes).forEach(node => {
      // Exclude the <form> (goes in right cell)
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'form') return;
      // Skip empty text nodes
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '') return;
      leftContent.push(node);
    });
    // If there is any left content, use it
    if (leftContent.length > 0) {
      leftCell = leftContent;
    }
    // Right cell is the form (with all children)
    const form = pane.querySelector('form');
    if (form) {
      rightCell = form;
    }
  }

  // Compose block table
  const cells = [
    headerRow,
    [leftCell, rightCell]
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
