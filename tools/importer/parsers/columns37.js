/* global WebImporter */
export default function parse(element, { document }) {
  // Get all direct children (each is a column)
  const columnDivs = Array.from(element.querySelectorAll(':scope > div'));
  // Guard: if no columns, don't attempt to build
  if (columnDivs.length === 0) return;
  // Table header as specified; one column only.
  const cells = [['Columns (columns37)']];
  // Content row: one cell for each column
  cells.push(columnDivs);
  // Create the block table
  const table = WebImporter.DOMUtils.createTable(cells, document);
  // Replace the original element with the new block table
  element.replaceWith(table);
}
