/* global WebImporter */
export default function parse(element, { document }) {
  // Header row as required
  const headerRow = ['Hero (hero19)'];

  // --- Extract background images as a block ---
  // The image grid is the first .grid-layout.desktop-3-column inside element
  const imageGrid = element.querySelector('.grid-layout.desktop-3-column');
  let imagesContainer = null;
  if (imageGrid) {
    // get image elements only (reference, do NOT clone)
    const imgs = Array.from(imageGrid.querySelectorAll('img'));
    if (imgs.length > 0) {
      imagesContainer = document.createElement('div');
      imgs.forEach(img => imagesContainer.appendChild(img));
    }
  }

  // --- Extract content elements (heading, subheading, CTAs) ---
  let contentCellElements = [];
  // The content is inside .ix-hero-scale-3x-to-1x-content > .container
  const contentHolder = element.querySelector('.ix-hero-scale-3x-to-1x-content');
  if (contentHolder) {
    const contentContainer = contentHolder.querySelector('.container');
    if (contentContainer) {
      // Heading
      const h1 = contentContainer.querySelector('h1');
      if (h1) contentCellElements.push(h1);
      // Subheading
      const subheading = contentContainer.querySelector('p');
      if (subheading) contentCellElements.push(subheading);
      // Button group (may have 0, 1, or more buttons)
      const buttonGroup = contentContainer.querySelector('.button-group');
      if (buttonGroup) {
        // Reference the actual button group element
        contentCellElements.push(buttonGroup);
      }
    }
  }

  // Ensure at least an empty cell for image/content if missing
  const cells = [
    headerRow,
    [imagesContainer || ''],
    [contentCellElements.length > 0 ? contentCellElements : '']
  ];

  // Create and replace
  const block = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(block);
}
