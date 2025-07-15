/* global WebImporter */
export default function parse(element, { document }) {
  // The block always creates a single table with 1 column and 3 rows:
  // Row 1: Header 'Hero (hero7)'
  // Row 2: background image (optional)
  // Row 3: main text (heading, subheading, buttons)

  // Find the two main direct children DIVs
  const gridDivs = element.querySelectorAll(':scope > div');

  // Defensive defaults
  let img = null;
  let contentBlock = null;

  if (gridDivs.length >= 2) {
    // First gridDiv contains image (has img as descendant)
    img = gridDivs[0].querySelector('img');
    // Second gridDiv contains the content block
    // There may be a card wrapper within a nested grid
    // Look for .card inside the whole second column
    contentBlock = gridDivs[1].querySelector('.card');
    if (!contentBlock) {
      // fallback: flatten one level and check for .card
      const nestedGrids = gridDivs[1].querySelectorAll(':scope > div');
      for (const div of nestedGrids) {
        const found = div.querySelector('.card');
        if (found) {
          contentBlock = found;
          break;
        }
      }
    }
  } else {
    // fallback: search entire element
    img = element.querySelector('img');
    contentBlock = element.querySelector('.card');
  }

  // Build the block rows
  const headerRow = ["Hero (hero7)"];
  const imageRow = [img ? img : ''];
  const contentRow = [contentBlock ? contentBlock : ''];

  const cells = [headerRow, imageRow, contentRow];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
