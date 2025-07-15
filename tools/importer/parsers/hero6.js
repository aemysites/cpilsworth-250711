/* global WebImporter */
export default function parse(element, { document }) {
  // Get top-level grid layout
  const grid = element.querySelector('.grid-layout');

  // Row 2: prominent background image (should be positioned absolutely - first grid child)
  let bgImg = null;
  if (grid && grid.children.length > 0) {
    const bgImgContainer = grid.children[0];
    bgImg = bgImgContainer.querySelector('img');
  }

  // Row 3: Content (headline, subheading, cta, supporting image/text)
  let contentCell = '';
  if (grid && grid.children.length > 1) {
    // This is the content area (structured with card > card-body > grid, etc)
    const contentContainer = grid.children[1];
    // Find .card if present (encapsulates the actual content layout)
    const card = contentContainer.querySelector('.card');
    contentCell = card ? card : contentContainer;
  }

  // Build the table for the Hero (hero6) block
  const rows = [
    ['Hero (hero6)'],
    [bgImg ? bgImg : ''],
    [contentCell ? contentCell : '']
  ];

  const block = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(block);
}
