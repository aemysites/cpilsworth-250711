/* global WebImporter */
export default function parse(element, { document }) {
  // Find the deepest 'table' element in the block.
  // Per the source HTML, the table is within a 'defaultTableComp' inside a container.
  let dataTable = element.querySelector('table');

  // Defensive: if table not found, do nothing
  if (!dataTable) return;

  // Also check for a heading (h2/h1/h3) immediately preceding the table in the DOM,
  // inside the same container, and include if it has visible text content
  let heading = null;
  if (dataTable.parentElement) {
    // Search for heading siblings before table
    let prev = dataTable.previousElementSibling;
    while (prev) {
      if (/^H[123]$/i.test(prev.tagName) && prev.textContent.trim()) {
        heading = prev;
        break;
      }
      prev = prev.previousElementSibling;
    }
  }

  // Compose content cell: heading (if present) and the table
  const cellContent = [];
  if (heading) cellContent.push(heading);
  cellContent.push(dataTable);

  // Build cells array: header row, and the content row
  const cells = [
    ['Table'],
    [cellContent]
  ];

  // Create the block and replace
  const block = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(block);
}
