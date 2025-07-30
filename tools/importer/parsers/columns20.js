/* global WebImporter */
export default function parse(element, { document }) {
  // Find the main multi-column container
  const container = element.querySelector('.textAssetMultiColComp');
  if (!container) return;

  // Get immediate column divs
  const colDivs = [
    container.querySelector('.col1'),
    container.querySelector('.col2'),
    container.querySelector('.col3')
  ];

  // For each column, extract the <section> as the main column content
  const columns = colDivs.map(col => {
    if (!col) return document.createTextNode('');
    const section = col.querySelector('section');
    // If <section> is found, use it; otherwise, fallback to the column div
    return section || col;
  });

  // Fix: Table header must span all content columns. Create a single header row with one cell,
  // then a second row with as many columns as needed.
  // This is the structure that matches the example.
  const headerRow = ['Columns (columns20)'];
  const dataRow = columns;
  const tableData = [headerRow, dataRow];
  const table = WebImporter.DOMUtils.createTable(tableData, document);
  // Manually set colspan on the header cell to span all content columns
  const th = table.querySelector('tr:first-child th');
  if (th && columns.length > 1) {
    th.setAttribute('colspan', columns.length);
  }
  element.replaceWith(table);
}
