/* global WebImporter */
export default function parse(element, { document }) {
  // Find the columns container
  const grid = element.querySelector(':scope > .grid-layout');
  if (!grid) return;

  // Get all direct children as columns
  const columns = Array.from(grid.children);
  const columnCount = columns.length;
  if (!columnCount) return;

  // To create a single header cell that spans all columns, we need to set colspan after createTable
  const headerRow = ['Columns (columns14)'];
  const contentRow = columns;
  const cells = [headerRow, contentRow];

  // Create the table
  const table = WebImporter.DOMUtils.createTable(cells, document);

  // Fix the header cell to span all columns
  const headerCell = table.querySelector('th');
  if (headerCell && columnCount > 1) {
    headerCell.setAttribute('colspan', columnCount);
  }

  // Replace the original element with the table
  element.replaceWith(table);
}
