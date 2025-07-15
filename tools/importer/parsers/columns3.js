/* global WebImporter */
export default function parse(element, { document }) {
  // Find the grid (columns) container
  const grid = element.querySelector('.w-layout-grid');
  if (!grid) return;
  const gridChildren = Array.from(grid.children);
  // Defensive: expect at least two columns
  const leftColSource = gridChildren[0];
  const rightColSource = gridChildren[1];
  // Build left column content (headline and subheading)
  const leftCol = document.createElement('div');
  if (leftColSource) {
    // Move h2 and p into the leftCol div
    const h2 = leftColSource.querySelector('h2');
    const p = leftColSource.querySelector('p');
    if (h2) leftCol.appendChild(h2);
    if (p) leftCol.appendChild(p);
  }
  // The right column is the group of buttons (already a div with children)
  // Reference the actual element, do not clone
  const rightCol = rightColSource || document.createElement('div');
  // Table structure: header row, then a content row with two columns
  const tableRows = [
    ['Columns (columns3)'],
    [leftCol, rightCol]
  ];
  const block = WebImporter.DOMUtils.createTable(tableRows, document);
  element.replaceWith(block);
}
