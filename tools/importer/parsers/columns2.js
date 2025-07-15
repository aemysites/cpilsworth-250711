/* global WebImporter */
export default function parse(element, { document }) {
  // Defensive: find the container and grid
  const container = element.querySelector('.container');
  if (!container) return;
  const grid = container.querySelector('.grid-layout');
  if (!grid) return;
  const gridChildren = Array.from(grid.children);
  // Left main column is the first child (an <a>)
  const leftCol = gridChildren[0];
  // Next two children are right-side content: main with images and a group with text-only links
  const rightColCards = gridChildren[1];
  const rightColLinks = gridChildren[2];

  // Defensive: gather blocks for the right column if present
  const rightColContent = [];
  if (rightColCards) {
    // these are the image cards (a.utility-link-content-block)
    rightColContent.push(...rightColCards.querySelectorAll('a.utility-link-content-block'));
  }
  if (rightColLinks) {
    // text-only cards (a.utility-link-content-block)
    rightColContent.push(...rightColLinks.querySelectorAll('a.utility-link-content-block'));
  }

  // The columns2 table: header, and one row with left and right content
  const headerRow = ['Columns (columns2)'];
  const dataRow = [leftCol, rightColContent];
  const cells = [headerRow, dataRow];

  const block = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(block);
}
