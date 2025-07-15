/* global WebImporter */
export default function parse(element, { document }) {
  // Table header row
  const headerRow = ['Hero (hero38)'];

  // Get the .w-layout-grid children
  const grid = element.querySelector('.w-layout-grid');
  const gridChildren = grid ? grid.querySelectorAll(':scope > div') : [];

  // Row 2: Background image (reference the actual image element if available)
  let bgImg = '';
  if (gridChildren.length > 0) {
    const possibleImg = gridChildren[0].querySelector('img');
    if (possibleImg) bgImg = possibleImg;
  }
  const imageRow = [bgImg];

  // Row 3: Content (heading, paragraph, CTA link if present)
  let contentCell = '';
  if (gridChildren.length > 1) {
    // The second grid child contains the text content
    const textContainer = gridChildren[1];
    // Get the main heading (h1)
    const h1 = textContainer.querySelector('h1');
    // Get the first paragraph (subheading/description)
    const p = textContainer.querySelector('p');
    // Get the CTA button (first link in button group or anywhere)
    let cta = null;
    const buttonGroup = textContainer.querySelector('.button-group');
    if (buttonGroup) {
      cta = buttonGroup.querySelector('a');
    }
    if (!cta) {
      cta = textContainer.querySelector('a');
    }
    // Compose content cell
    // Use a fragment for clean grouping and to preserve original elements
    const frag = document.createDocumentFragment();
    if (h1) frag.appendChild(h1);
    if (p) frag.appendChild(p);
    if (cta) frag.appendChild(cta);
    // Only use the fragment if it contains nodes
    if (frag.childNodes.length) {
      contentCell = frag;
    }
  }
  const contentRow = [contentCell];

  // Compose the table
  const cells = [headerRow, imageRow, contentRow];
  const block = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(block);
}
