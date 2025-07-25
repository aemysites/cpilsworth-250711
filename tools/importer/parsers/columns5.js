/* global WebImporter */
export default function parse(element, { document }) {
  // Helper: Get all four true columns for the desktop footer
  function getDesktopColumns(panelWrapper) {
    const columns = [];
    // Look for .grid_5 elements directly under .panelHeaderWrapperTablet and inside wrappers
    Array.from(panelWrapper.children).forEach(child => {
      // If the child is a grid_5 column, push it
      if (child.classList && child.classList.contains('grid_5')) {
        columns.push(child);
      } else if (child.querySelectorAll) {
        // If the child has grid_5 children (e.g. .panelWrapperTabletRight), push each one individually
        Array.from(child.querySelectorAll(':scope > .grid_5')).forEach(grandchild => {
          columns.push(grandchild);
        });
      }
    });
    return columns;
  }

  // Desktop first
  let columns = [];
  const desktopPanel = element.querySelector('.links_container .panelHeaderWrapperTablet');
  if (desktopPanel) {
    const colDivs = getDesktopColumns(desktopPanel);
    // For each column, create a fragment containing only h3 and ul
    columns = colDivs.map(col => {
      const frag = document.createDocumentFragment();
      const h3 = col.querySelector('h3');
      const ul = col.querySelector('ul');
      if (h3) frag.appendChild(h3);
      if (ul) frag.appendChild(ul);
      return frag;
    });
  } else {
    // Fallback: mobile h3/ul pairs
    const mobileDiv = element.querySelector('.footer_links_mob > div');
    if (mobileDiv) {
      const kids = Array.from(mobileDiv.children);
      for (let i = 0; i < kids.length - 1; i++) {
        if (kids[i].tagName && kids[i].tagName.toLowerCase() === 'h3' && kids[i+1].tagName && kids[i+1].tagName.toLowerCase() === 'ul') {
          const frag = document.createDocumentFragment();
          frag.appendChild(kids[i]);
          frag.appendChild(kids[i+1]);
          columns.push(frag);
          i++;
        }
      }
    }
  }
  // Fallback: all content in one cell
  if (!columns.length) {
    const frag = document.createDocumentFragment();
    Array.from(element.childNodes).forEach(node => {
      frag.appendChild(node);
    });
    columns = [frag];
  }
  // Build table: header row one cell, next row 4 cells (if possible)
  const cells = [
    ['Columns (columns5)'],
    columns
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
