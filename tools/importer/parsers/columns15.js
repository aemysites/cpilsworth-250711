/* global WebImporter */
export default function parse(element, { document }) {
  // Find the multi-column container
  const multiCol = element.querySelector('.textAssetMultiColComp');
  if (!multiCol) return;

  // Find columns (supporting .col1, .col2, .col3, up to 6)
  const columns = [];
  for (let i = 1; i <= 6; i += 1) {
    const col = multiCol.querySelector(`:scope > .col${i}`);
    if (col) columns.push(col);
  }
  // Fallback: all direct child divs (if .colN not found)
  const colEls = columns.length ? columns : Array.from(multiCol.querySelectorAll(':scope > div'));

  // For each column, get the <section> inside or fallback to the column itself
  const colContents = colEls.map(col => {
    const section = col.querySelector('section') || col;
    return section;
  });

  // Build the table: header row spans all columns, second row has one cell per column
  const headerRow = ['Columns (columns15)']; // one cell, will visually span all columns
  const contentRow = colContents;
  const tableCells = [headerRow, contentRow];

  // Create and replace with the block table
  const block = WebImporter.DOMUtils.createTable(tableCells, document);
  element.replaceWith(block);
}
