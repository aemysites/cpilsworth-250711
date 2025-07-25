/* global WebImporter */
export default function parse(element, { document }) {
  // Get all <li> elements (columns)
  const lis = Array.from(element.children).filter(child => child.tagName.toLowerCase() === 'li');

  // Build columns: each column contains the full content of the li
  const columnContents = lis.map(li => {
    // Use a fragment to hold all child nodes of li
    const frag = document.createDocumentFragment();
    Array.from(li.childNodes).forEach(node => {
      frag.appendChild(node);
    });
    return frag;
  });

  // The rows for the block table
  // Header row: single cell with the block name (spans all columns visually)
  // Columns row: each column content in its own cell
  const rows = [
    ['Columns (columns40)'],
    [...columnContents]
  ];

  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
