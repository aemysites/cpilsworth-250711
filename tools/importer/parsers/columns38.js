/* global WebImporter */
export default function parse(element, { document }) {
  // Find flexcont for columns
  const flexcont = element.querySelector('.flexcont');
  if (!flexcont) return;
  const colDivs = flexcont.querySelectorAll(':scope > .flexcontdiv');
  if (colDivs.length < 2) return;

  // Left column (first flexcontdiv > .leftCol)
  const leftCol = colDivs[0].querySelector('.leftCol');
  let leftContent = null;
  if (leftCol) {
    leftContent = leftCol.querySelector('.descriptiveText') || leftCol;
  }

  // Right column (second flexcontdiv > .rightCol)
  const rightCol = colDivs[1].querySelector('.rightCol');
  let rightContent = null;
  if (rightCol) {
    rightContent = rightCol.querySelector('.descriptiveText') || rightCol;
  }

  // The header row must have exactly one cell, even if there are multiple columns in the content row
  const headerRow = ['Columns (columns38)'];
  const columnsRow = [leftContent, rightContent];
  const rows = [headerRow, columnsRow];

  const block = WebImporter.DOMUtils.createTable(rows, document);

  // Fix header row to span all columns if WebImporter.DOMUtils.createTable doesn't do this automatically
  const ths = block.querySelectorAll('tr:first-child th');
  if (ths.length > 1) {
    // Merge cells: keep only the first, set colspan
    const first = ths[0];
    first.colSpan = columnsRow.length;
    // Remove all other header cells
    for (let i = 1; i < ths.length; i++) {
      ths[i].remove();
    }
  }

  element.replaceWith(block);
}
