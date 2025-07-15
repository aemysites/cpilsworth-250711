/* global WebImporter */
export default function parse(element, { document }) {
  // Table header matches the example exactly
  const headerRow = ['Hero (hero13)'];

  // The background image: find the first <img> in the parallax or grid area
  let imageEl = null;
  // Find the .w-layout-grid (should be only one)
  const grid = element.querySelector('.w-layout-grid');
  if (grid) {
    // Search for an img in the grid area (anywhere)
    imageEl = grid.querySelector('img');
  }

  // Second row: optional image
  const imageRow = [imageEl ? imageEl : ''];

  // Third row: text content - find the h1's container for all hero text
  let textContentEl = null;
  let h1Container = null;
  if (grid) {
    // Find all direct children of the grid
    const children = grid.querySelectorAll(':scope > div');
    for (const child of children) {
      if (child.querySelector('h1')) {
        h1Container = child;
        break;
      }
    }
  }
  // The h1Container may have a content container (like .utility-margin-bottom-6rem)
  if (h1Container) {
    // Find the single div inside (text content container)
    const innerDiv = h1Container.querySelector(':scope > div');
    textContentEl = innerDiv || h1Container;
  }
  const textRow = [textContentEl ? textContentEl : ''];

  // Compose the table
  const cells = [
    headerRow,
    imageRow,
    textRow
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
