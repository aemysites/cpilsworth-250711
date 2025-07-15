/* global WebImporter */
export default function parse(element, { document }) {
  // 1. Find the grid container that holds columns
  const grid = element.querySelector('.grid-layout');
  if (!grid) return;

  // 2. Get all immediate children of the grid (should be 2: content and image columns)
  const columns = Array.from(grid.children);
  if (columns.length < 2) return;

  // 3. Reference both column DOM nodes directly for the table
  const col1 = columns[0];
  const col2 = columns[1];

  // 4. Compose the block table structure
  const cells = [
    ['Columns (columns26)'],
    [col1, col2],
  ];

  // 5. Create the table and replace the original element
  const block = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(block);
}