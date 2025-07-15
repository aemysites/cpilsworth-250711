/* global WebImporter */
export default function parse(element, { document }) {
  // Find the grid container
  const grid = element.querySelector('.grid-layout');
  if (!grid) return;
  const columns = Array.from(grid.children);

  // Header row must contain only one column as per spec
  const headerRow = ['Columns (columns29)'];

  // Content row: as many cells as there are columns
  const contentRow = columns.map(col => col);

  // Compose table as per requirements
  const table = WebImporter.DOMUtils.createTable([
    headerRow,
    contentRow
  ], document);

  // Replace original element
  element.replaceWith(table);
}
