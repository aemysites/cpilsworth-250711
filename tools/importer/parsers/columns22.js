/* global WebImporter */
export default function parse(element, { document }) {
  // Find the active tab pane (the visible grid)
  const activeTab = element.querySelector('.w-tab-pane.w--tab-active');
  if (!activeTab) return;
  // Find the grid inside the active tab
  const grid = activeTab.querySelector('.w-layout-grid');
  if (!grid) return;

  // Each grid item is a column: usually an <a> with all content inside
  const gridItems = Array.from(grid.children);

  // For each column, gather all content (image, heading, description, and any text)
  function extractContent(col) {
    const cells = [];
    // image
    const img = col.querySelector('img');
    if (img) cells.push(img);
    // heading
    const heading = col.querySelector('h3, .h4-heading');
    if (heading) cells.push(heading);
    // description
    const desc = col.querySelector('.paragraph-sm');
    if (desc) cells.push(desc);
    // any other direct text
    col.childNodes.forEach(node => {
      if (node.nodeType === 3 && node.textContent.trim()) {
        cells.push(document.createTextNode(node.textContent));
      }
    });
    // fallback
    if (cells.length === 0) {
      Array.from(col.childNodes).forEach(node => cells.push(node));
    }
    return cells.length === 1 ? cells[0] : cells;
  }

  // Build the columns row dynamically
  const columnsRow = gridItems.map(extractContent);

  // Header row must match the example exactly, with a single column
  const headerRow = ['Columns (columns22)'];

  // Compose the rows: header row as single column, columns row as N columns
  const rows = [headerRow, columnsRow];

  // Create the table
  const table = WebImporter.DOMUtils.createTable(rows, document);

  // Fix the table header row to use colspan matching the columns
  const th = table.querySelector('tr:first-child th');
  if (th && columnsRow.length > 1) {
    th.setAttribute('colspan', columnsRow.length);
  }

  // Replace the original element with the table
  element.replaceWith(table);
}
