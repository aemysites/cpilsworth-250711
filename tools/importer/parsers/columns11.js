/* global WebImporter */
export default function parse(element, { document }) {
  // Get the container holding the columns
  const container = element.querySelector(':scope > .container_24');
  let columnDivs = [];
  if (container) {
    columnDivs = Array.from(container.querySelectorAll(':scope > .grid_12'));
  }

  // For each column, get its main content (.parsys children or fallback to children)
  const columnCells = columnDivs.map(col => {
    const parsys = col.querySelector(':scope > .leftCol.parsys, :scope > .rightCol.parsys');
    if (parsys) {
      return Array.from(parsys.children);
    } else {
      return Array.from(col.children);
    }
  });

  // Defensive fallback: if no columns, treat the entire element as a single cell
  const tableCells = (columnCells.length > 0) ? columnCells : [[element]];

  // Build the table: header row is a single cell (regardless of column count)
  const headerRow = ['Columns (columns11)'];

  // Build the data for createTable: header in single cell, second row = all columns
  const rows = [headerRow, tableCells];

  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
