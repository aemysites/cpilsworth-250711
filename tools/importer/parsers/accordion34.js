/* global WebImporter */
export default function parse(element, { document }) {
  // Header row for the block
  const rows = [['Accordion (accordion34)']];

  // Find the accordion item elements (li.accordLi)
  const ul = element.querySelector('ul.accordUL');
  if (!ul) return;
  const lis = ul.querySelectorAll(':scope > li');

  lis.forEach((li) => {
    // Get heading/title cell
    const h3 = li.querySelector('h3.accordHeader');
    let titleCell = '';
    if (h3) {
      // Remove span.aria-offscreen and img inside the h3 (but do not clone, reference!)
      // Since we need to reference the real elements, let's build a DocumentFragment for the cell
      const frag = document.createDocumentFragment();
      [...h3.childNodes].forEach((node) => {
        if (
          (node.nodeType === Node.ELEMENT_NODE &&
            (node.classList.contains('aria-offscreen') || node.tagName === 'IMG'))
        ) {
          // skip
        } else {
          frag.appendChild(node);
        }
      });
      // Wrap in a div to avoid th/td in the block
      const div = document.createElement('div');
      div.appendChild(frag);
      titleCell = div;
    }
    // Get content cell
    const accordContent = li.querySelector('.accordContent');
    let contentCell = '';
    if (accordContent) {
      // Ignore aria-offscreen accordPanelFocus span at the start
      let children = Array.from(accordContent.children);
      if (
        children.length > 0 &&
        children[0].classList.contains('aria-offscreen') &&
        children[0].classList.contains('accordPanelFocus')
      ) {
        children = children.slice(1);
      }
      // If there are no element children, try to get textContent
      if (children.length === 0) {
        contentCell = accordContent.textContent.trim();
      } else if (children.length === 1) {
        contentCell = children[0];
      } else {
        contentCell = children;
      }
    }
    rows.push([titleCell, contentCell]);
  });

  // Build and replace with the table block
  const block = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(block);
}
