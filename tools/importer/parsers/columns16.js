/* global WebImporter */
export default function parse(element, { document }) {
  // Helper to get immediate children by selector
  function childrenBySelector(parent, selector) {
    return Array.from(parent.children).filter(child => child.matches(selector));
  }

  // Header row
  const headerRow = ['Columns (columns16)'];

  // Get the .container
  const container = element.querySelector(':scope > .container');
  if (!container) return;
  // Get the two top-level grids
  const grids = childrenBySelector(container, '.w-layout-grid');
  if (grids.length < 2) return;
  const [firstGrid, secondGrid] = grids;

  // ========== TOP ROW (Text Columns) =============
  // Left column: heading block
  // Right column: main content block
  // There are always two direct children of firstGrid (the two columns):
  // - first: left col (heading, eyebrow, h1)
  // - second: right col (intro text, author, button)
  const firstGridCols = childrenBySelector(firstGrid, 'div');
  // Defensive: must have at least 2 cols
  if (firstGridCols.length < 2) return;
  const leftCol = firstGridCols[0];
  const rightCol = firstGridCols[1];

  // ========== SECOND ROW (Image Columns) =============
  // The secondGrid contains two divs (the columns), each with img inside
  const imageCols = childrenBySelector(secondGrid, 'div');
  
  // Defensive: ensure there are at least 2 columns
  if (imageCols.length < 2) return;

  // ========== Build the Table =============
  // First content row: leftCol, rightCol
  // Second content row: imageCol1, imageCol2
  const cells = [
    headerRow,
    [leftCol, rightCol],
    [imageCols[0], imageCols[1]]
  ];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
