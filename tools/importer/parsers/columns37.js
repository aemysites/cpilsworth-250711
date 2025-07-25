/* global WebImporter */
export default function parse(element, { document }) {
  // Find the two main columns within the main container
  const container = element.querySelector('.container_24');
  if (!container) return;
  const columns = container.querySelectorAll(':scope > .grid_12');

  // Helper: get all .descriptivetext.section blocks from column
  function getColumnContent(gridCol) {
    const parsys = gridCol.querySelector(':scope > .parsys');
    if (!parsys) return [];
    // Each .descriptivetext.section is a block
    return Array.from(parsys.querySelectorAll(':scope > .descriptivetext.section'));
  }

  // Compose content cells (one cell per column)
  const colCells = [];
  columns.forEach((col) => {
    const blocks = getColumnContent(col);
    colCells.push(blocks.length ? blocks : '');
  });

  // Create table with header row matching EXACTLY the example (single cell), and a second row with two columns
  const cells = [
    [
      (() => {
        // Create a <th> that will span the number of columns for correct semantics
        const th = document.createElement('th');
        th.textContent = 'Columns (columns37)';
        th.colSpan = colCells.length;
        return th;
      })()
    ],
    colCells
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
