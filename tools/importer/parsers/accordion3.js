/* global WebImporter */
export default function parse(element, { document }) {
  // Table header as required by spec
  const headerRow = ['Accordion (accordion3)'];
  const rows = [headerRow];

  // Find the <ul class="accordUL"> with accordion items
  const ul = element.querySelector('ul.accordUL');
  if (ul) {
    const lis = ul.querySelectorAll(':scope > li');
    lis.forEach((li) => {
      // --- TITLE CELL ---
      let titleElem;
      const header = li.querySelector('.accordHeader');
      if (header) {
        // Remove arrow <img> and aria-offscreen <span> for a clean title, but preserve strong formatting if any.
        const headerClone = header.cloneNode(true);
        // Remove elements not meant for visible UI
        headerClone.querySelectorAll('.aria-offscreen, .accordArrow').forEach(el => el.remove());
        // Use the remaining header, preserve all child HTML formatting
        // If there's still child nodes left, use them, else fallback to textContent
        if (headerClone.childNodes.length === 1 && headerClone.childNodes[0].nodeType === 3) {
          // Only text node left
          titleElem = document.createElement('span');
          titleElem.textContent = headerClone.textContent.trim();
        } else {
          // Use all (mixed) child nodes
          titleElem = document.createElement('span');
          Array.from(headerClone.childNodes).forEach(node => titleElem.appendChild(node));
        }
      } else {
        // Fallback
        titleElem = document.createElement('span');
        titleElem.textContent = 'Accordion Item';
      }
      // --- CONTENT CELL ---
      // Get all visible HTML content from the accordContent div
      const content = li.querySelector('.accordContent');
      let contentCell;
      if (content) {
        // Remove aria-offscreen (screenreader only)
        content.querySelectorAll('.aria-offscreen').forEach(el => el.remove());
        // If there is only one real child, use it; otherwise, put all children in an array
        const visibleNodes = Array.from(content.childNodes).filter(node => {
          // element, or non-empty text
          return node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim());
        });
        if (visibleNodes.length === 0) {
          contentCell = document.createElement('div');
        } else if (visibleNodes.length === 1) {
          contentCell = visibleNodes[0];
        } else {
          // Combine multiple nodes in a <div> for structure
          const wrapper = document.createElement('div');
          visibleNodes.forEach(node => wrapper.appendChild(node));
          contentCell = wrapper;
        }
      } else {
        contentCell = document.createElement('div');
      }

      rows.push([titleElem, contentCell]);
    });
  }

  const block = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(block);
}
