/* global WebImporter */
export default function parse(element, { document }) {
  // Locate the container and grid layout
  const container = element.querySelector('.container');
  if (!container) return;
  const grid = container.querySelector('.grid-layout');
  if (!grid) return;

  // Get columns: expect image and content
  const cols = Array.from(grid.children);
  if (cols.length < 2) return;

  // Strictly reference only existing elements for each cell.
  // Column 1: image (first child)
  const imageCol = cols[0];
  // Column 2: text (second child)
  const textCol = cols[1];

  // Table structure: header row, then columns row
  const headerRow = ['Columns (columns1)'];
  const columnsRow = [imageCol, textCol];

  const cells = [headerRow, columnsRow];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
