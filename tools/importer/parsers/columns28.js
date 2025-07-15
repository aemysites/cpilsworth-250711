/* global WebImporter */
export default function parse(element, { document }) {
  // Build header row: must be a single cell array, even if multiple columns follow
  const headerRow = ['Columns (columns28)'];

  // Gather direct column <div>s
  const columns = Array.from(element.querySelectorAll(':scope > div'));

  // For each column, extract the image (or all children if needed)
  const contentRow = columns.map(col => {
    // If it has one child and that is a .utility-aspect-1x1, use its children
    if (col.childElementCount === 1 && col.firstElementChild.classList.contains('utility-aspect-1x1')) {
      return Array.from(col.firstElementChild.children);
    }
    // Otherwise, use all children
    return Array.from(col.children);
  }).map(cell => (Array.isArray(cell) && cell.length === 1 ? cell[0] : cell));

  // Compose the table (header row single cell, next row with columns)
  const table = WebImporter.DOMUtils.createTable([
    headerRow,
    contentRow
  ], document);

  element.replaceWith(table);
}