/* global WebImporter */
export default function parse(element, { document }) {
  // Find the main multi-column container
  const multiCol = element.querySelector('.textAssetMultiColComp');
  if (!multiCol) return;

  // Get all direct children divs with class col1, col2, col3, ...
  const columns = Array.from(multiCol.children).filter(child =>
    child.className && /col\d/.test(child.className)
  );

  // For each column, get its content section (the <section> child)
  const columnContents = columns.map(col => {
    const section = col.querySelector('section');
    return section || col;
  });

  // Table: header row, and a row with N columns
  const cells = [
    ['Columns (columns20)'],
    columnContents
  ];

  // Create table and replace original element
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
