/* global WebImporter */
export default function parse(element, { document }) {
  // Find the main grid containing the two columns
  const mainGrid = element.querySelector('.w-layout-grid.grid-layout');
  if (!mainGrid) return;

  // We'll need to extract the two main columns:
  // 1. Left: heading, avatar/name
  // 2. Right: testimonial text, divider, logo

  // Find all immediate children of mainGrid
  const gridChildren = Array.from(mainGrid.children);

  // Defensive: Find the heading (h2)
  const heading = gridChildren.find(e => e.matches('p.h2-heading'));
  // Find the testimonial paragraph
  const testimonial = gridChildren.find(e => e.matches('p.paragraph-lg'));
  // Find the nested grid with divider, avatar, and logo
  const nestedGrid = gridChildren.find(e => e.matches('.w-layout-grid.grid-layout'));

  // For left column: heading + avatar/name
  const leftCol = document.createElement('div');
  if (heading) leftCol.appendChild(heading);

  if (nestedGrid) {
    // Find the .flex-horizontal for avatar and name
    const flex = nestedGrid.querySelector('.flex-horizontal');
    if (flex) leftCol.appendChild(flex);
  }

  // For right column: testimonial + divider + logo
  const rightCol = document.createElement('div');
  if (testimonial) rightCol.appendChild(testimonial);
  if (nestedGrid) {
    // The divider
    const divider = nestedGrid.querySelector('.divider');
    if (divider) rightCol.appendChild(divider);
    // The logo (utility-display-inline-block)
    const logo = nestedGrid.querySelector('.utility-display-inline-block');
    if (logo) rightCol.appendChild(logo);
  }

  // Build the block table
  const headerRow = ['Columns (columns25)'];
  const cells = [
    headerRow,
    [leftCol, rightCol]
  ];
  const block = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(block);
}
