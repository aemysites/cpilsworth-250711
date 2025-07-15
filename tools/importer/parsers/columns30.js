/* global WebImporter */
export default function parse(element, { document }) {
  // Find the main grid for columns
  const grid = element.querySelector('.w-layout-grid.grid-layout');
  const columnDivs = grid ? Array.from(grid.children) : [];
  // For each column, collect ALL content (not just the image)
  // Each grid child typically has a wrapper div, which may in turn contain an image or other content
  const columns = columnDivs.map((col) => {
    // For maximum robustness, collect all children of the column's main wrapper
    // If there's just one direct child, use it; if more, put them all in an array
    const contentDivs = Array.from(col.children);
    if (contentDivs.length === 1) {
      return contentDivs[0];
    } else if (contentDivs.length > 1) {
      return contentDivs;
    }
    // Edge case: if empty, fallback to col itself
    return col;
  });

  // Always create a header row as a single column with the block name
  const cells = [
    ['Columns (columns30)'],
    columns
  ];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
