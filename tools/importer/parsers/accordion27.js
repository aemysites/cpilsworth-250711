/* global WebImporter */
export default function parse(element, { document }) {
  // Prepare header row, matching exactly as per specification
  const headerRow = ['Accordion (accordion27)'];
  const rows = [];

  // Get all immediate divider children (each accordion item)
  const dividers = Array.from(element.querySelectorAll(':scope > .divider'));

  dividers.forEach((divider) => {
    // Each divider contains a grid, with 2 children: title, content
    const grid = divider.querySelector('.w-layout-grid');
    if (!grid) return; // skip empty/faulty divider
    const gridChildren = Array.from(grid.children).filter(Boolean);
    if (gridChildren.length < 2) return; // require title and content
    const titleEl = gridChildren[0]; // reference, do not clone
    const contentEl = gridChildren[1]; // reference, do not clone
    rows.push([titleEl, contentEl]);
  });

  // If there are no rows, do not create an empty table
  if (rows.length === 0) return;

  const table = WebImporter.DOMUtils.createTable([
    headerRow,
    ...rows,
  ], document);
  element.replaceWith(table);
}
