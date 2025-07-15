/* global WebImporter */
export default function parse(element, { document }) {
  // Find the grid layout for the columns
  const grid = element.querySelector('.grid-layout');
  if (!grid) return;
  const cols = Array.from(grid.children);
  if (cols.length < 2) return;

  // LEFT COLUMN: Reference the actual DOM node (including all text, headings, paragraphs, and buttons)
  const leftCol = cols[0];

  // RIGHT COLUMN: Reference the actual DOM node for the image (not a clone)
  let rightCol = cols[1];
  // If rightCol is not an image, but contains an image, use the image element
  if (!rightCol.matches('img')) {
    const img = rightCol.querySelector('img');
    if (img) rightCol = img;
  }

  const cells = [
    ['Columns (columns15)'],
    [leftCol, rightCol],
  ];
  const block = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(block);
}
