/* global WebImporter */
export default function parse(element, { document }) {
  // Find the main grid layout containing the columns
  const grid = element.querySelector('.grid-layout');
  if (!grid) return;
  const columns = Array.from(grid.children);
  // The header row must have only one cell, even if visual columns > 1
  const cells = [
    ['Columns (columns9)'], // header row, exactly one cell
    columns.map((col) => col) // next row: one cell for each visual column
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
