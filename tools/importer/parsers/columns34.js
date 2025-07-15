/* global WebImporter */
export default function parse(element, { document }) {
  // Find the grid containing the columns
  const grid = element.querySelector('.grid-layout');
  if (!grid) return;
  // Get the immediate children of the grid (each column/cell)
  const columns = Array.from(grid.children);
  // Defensive: ensure at least 2 columns.
  if (columns.length < 2) return;

  // The header row must be a single cell (spanning all columns visually), matching the example
  // The content row must have a cell for each column
  const headerRow = ['Columns (columns34)'];
  const contentRow = columns;

  const table = WebImporter.DOMUtils.createTable([
    headerRow,
    contentRow
  ], document);

  element.replaceWith(table);
}
