/* global WebImporter */
export default function parse(element, { document }) {
  // Accordion block header
  const headerRow = ['Accordion'];
  const rows = [headerRow];

  // Find the UL with all accordion items
  const ul = element.querySelector('ul.accordUL');
  if (!ul) return;
  // For each LI in the accordion
  const lis = ul.querySelectorAll(':scope > li');
  lis.forEach((li) => {
    // --- TITLE CELL ---
    // Get the header/title H3
    const h3 = li.querySelector('.accordHeader');
    let titleCell = '';
    if (h3) {
      // We want the text content minus the offscreen span and arrow img
      // Remove child span.aria-offscreen and img elements
      const titleParts = [];
      h3.childNodes.forEach((node) => {
        if (node.nodeType === 3) {
          // text node
          if (node.textContent.trim()) titleParts.push(node.textContent.trim());
        } else if (node.nodeType === 1 && node.tagName !== 'SPAN' && node.tagName !== 'IMG') {
          titleParts.push(node.textContent.trim());
        }
      });
      titleCell = titleParts.join(' ').trim();
    }
    // --- CONTENT CELL ---
    // The content panel
    const panel = li.querySelector('.accordContent');
    let contentCell = '';
    if (panel) {
      // Remove aria-offscreen span from content
      let mainContent = null;
      // Find the first div.section_x (or similar)
      const sectionDiv = panel.querySelector('div[class*="section_"]');
      if (sectionDiv) {
        mainContent = sectionDiv;
      } else {
        // If there's other non-empty content in panel, use it
        // But only include children that are not aria-offscreen
        const cells = [];
        Array.from(panel.childNodes).forEach((child) => {
          if (
            child.nodeType === 1 && !child.classList.contains('aria-offscreen')
          ) {
            cells.push(child);
          } else if (child.nodeType === 3 && child.textContent.trim()) {
            // text node
            const span = document.createElement('span');
            span.textContent = child.textContent.trim();
            cells.push(span);
          }
        });
        if (cells.length === 1) {
          mainContent = cells[0];
        } else if (cells.length > 1) {
          mainContent = cells;
        }
      }
      if (mainContent) {
        contentCell = mainContent;
      }
    }
    rows.push([titleCell, contentCell]);
  });
  const block = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(block);
}
