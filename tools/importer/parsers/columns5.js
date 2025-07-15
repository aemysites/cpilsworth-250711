/* global WebImporter */
export default function parse(element, { document }) {
  // Get all direct children of the columns grid
  const columns = Array.from(element.querySelectorAll(':scope > div'));

  // For each column, collect its inner content (e.g., image wrappers or all content in the column)
  const columnContent = columns.map(col => {
    // Instead of just the image, put the whole content block (typically the aspect ratio wrapper div)
    return col;
  });

  // Header row: one cell with the block name
  const headerRow = ['Columns (columns5)'];
  // Content row: one cell for each column's content
  const contentRow = columnContent;

  // Create the table with the required structure
  const table = WebImporter.DOMUtils.createTable([
    headerRow,
    contentRow
  ], document);

  // Replace the original element with the new block table
  element.replaceWith(table);
}
