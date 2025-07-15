/* global WebImporter */
export default function parse(element, { document }) {
  // Find the layout grid containing the columns
  const grid = element.querySelector('.w-layout-grid');
  if (!grid) return;

  // Get all direct children of the grid (should be image and content column)
  const columns = Array.from(grid.children);
  if (columns.length < 2) return;

  // The image column (should be an <img> tag)
  const imgCol = columns.find(col => col.tagName === 'IMG') || columns[0];
  // The text/content column (should be a <div>)
  const textCol = columns.find(col => col !== imgCol) || columns[1];

  // Build the table as per example: header row, then content row with 2 columns
  const headerRow = ['Columns (columns31)'];
  const contentRow = [imgCol, textCol];

  const table = WebImporter.DOMUtils.createTable([
    headerRow,
    contentRow
  ], document);
  
  element.replaceWith(table);
}
