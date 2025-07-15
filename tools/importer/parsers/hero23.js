/* global WebImporter */
export default function parse(element, { document }) {
  // Get immediate children of the main grid
  const grid = element.querySelector('.w-layout-grid.grid-layout');
  if (!grid) return;

  // Find image: look for the first <img> in the grid
  const imageEl = grid.querySelector('img');

  // Find the text/content block: the first nested grid within the main grid
  let textBlock = null;
  const nestedContainer = grid.querySelector('.w-layout-grid.container');
  if (nestedContainer) {
    // Find the main text content div inside nestedContainer
    // Use the section as the text block
    textBlock = nestedContainer.querySelector('div.section');
  }

  // Prepare table rows
  const headerRow = ['Hero (hero23)'];
  const imageRow = [imageEl || ''];
  const textRow = [textBlock || ''];

  const rows = [headerRow, imageRow, textRow];
  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}