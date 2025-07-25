/* global WebImporter */
export default function parse(element, { document }) {
  // Helper function: get immediate children with a class
  function getChildrenByClass(parent, className) {
    return Array.from(parent.children).filter(child => child.classList.contains(className));
  }

  // Locate all mainGridWrapper blocks (each is a row in the columns block)
  const mainGridWrappers = Array.from(element.querySelectorAll(':scope > div > div.fifty_100_percent.mainGridWrapper'));

  // For each mainGridWrapper, extract its columns as cells
  const cells = [];
  cells.push(['Columns (columns16)']); // Header row, must match block name

  for (const wrapper of mainGridWrappers) {
    // For each mainGridWrapper, get its two column divs (with class 'fifty_percent mainGrid' OR 'fifty_percent mainGrid megaPic' etc)
    const columns = Array.from(wrapper.querySelectorAll(':scope > div.fifty_percent.mainGrid, :scope > div.fifty_percent.mainGrid.megaPic, :scope > div.fifty_percent.mainGrid.mobileBreakPoint, :scope > div.fifty_percent.mainGrid.megaPic.mobileBreakPoint, :scope > div.fifty_percent.mainGrid.removeFocus, :scope > div.fifty_percent.mainGrid.megaPic.removeFocus, :scope > div.fifty_percent.mainGrid.mobileBreakPoint.removeFocus'));

    // If not found, fallback to any two direct children (can happen if classes change)
    let columnEls = columns.length > 0 ? columns : Array.from(wrapper.children);

    // For each column, find the immediate grid block (should be the first child)
    const rowCells = columnEls.map(col => {
      // Usually we want the first child div, but sometimes the column itself has the info
      const possible = Array.from(col.children).find(e => e.tagName === 'DIV' || e.tagName === 'SECTION') || col;
      return possible;
    });
    cells.push(rowCells);
  }

  // Check for any additional mainGridWrapper blocks at root level (not inside the .container_24)
  const rootGridWrappers = Array.from(element.querySelectorAll(':scope > div.fifty_100_percent.mainGridWrapper'));
  for(const wrapper of rootGridWrappers) {
    if (!mainGridWrappers.includes(wrapper)) {
      const columns = Array.from(wrapper.querySelectorAll(':scope > div.fifty_percent.mainGrid, :scope > div.fifty_percent.mainGrid.megaPic'));
      let columnEls = columns.length > 0 ? columns : Array.from(wrapper.children);
      const rowCells = columnEls.map(col => {
        const possible = Array.from(col.children).find(e => e.tagName === 'DIV' || e.tagName === 'SECTION') || col;
        return possible;
      });
      cells.push(rowCells);
    }
  }

  // Create the columns block table
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}