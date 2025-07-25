/* global WebImporter */
export default function parse(element, { document }) {
  // Get all three columns (should be grid_8 direct children of the container_24)
  const colContainers = element.querySelectorAll(':scope > .container_24 > .grid_8');
  const cells = [];
  colContainers.forEach(col => {
    // Each column contains a parsys > descriptivetext > container_24
    // We want the .container_24 block inside .descriptivetext for each col
    const desc = col.querySelector('.descriptivetext .container_24');
    if (desc) {
      cells.push(desc);
    } else {
      // If something is missing, push an empty cell to preserve layout
      cells.push(document.createElement('div'));
    }
  });

  // If less than 3 columns found, fill with empty divs to keep column count and layout
  while (cells.length < 3) {
    cells.push(document.createElement('div'));
  }

  // The header row must be a single cell (array with one string),
  // the importer will render it as a cell with colspan equal to the number of columns
  const rows = [
    ['Columns (columns44)'],
    cells
  ];

  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
