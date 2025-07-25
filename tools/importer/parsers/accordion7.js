/* global WebImporter */
export default function parse(element, { document }) {
  // Find the main accordion list
  const ul = element.querySelector('ul.accordUL');
  if (!ul) return;
  const lis = Array.from(ul.children).filter(li => li.tagName === 'LI');

  const rows = [];
  // Header row must match the example exactly
  rows.push(['Accordion (accordion7)']);

  // For each accordion section
  lis.forEach(li => {
    // Title: use the h3 text, stripping out aria-offscreen spans and imgs
    const h3 = li.querySelector('h3.accordHeader');
    let title = '';
    if (h3) {
      // Remove aria-offscreen spans and imgs for title extraction
      const h3TitleParts = Array.from(h3.childNodes).filter(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node;
          if (el.classList.contains('aria-offscreen')) return false;
          if (el.tagName === 'IMG') return false;
        }
        return true;
      });
      // Join the text content of the remaining nodes
      title = h3TitleParts.map(n => n.textContent).join('').trim();
    }

    // Content: The .accordContent div, exclude aria-offscreen spans
    const content = li.querySelector('div.accordContent');
    let contentCell = '';
    if (content) {
      // Remove aria-offscreen spans from direct children
      const contentChildren = Array.from(content.children).filter(
        c => !(c.classList && c.classList.contains('aria-offscreen'))
      );
      // If there are children, put them all in an array; otherwise use the content element
      if (contentChildren.length === 1) {
        contentCell = contentChildren[0];
      } else if (contentChildren.length > 1) {
        contentCell = contentChildren;
      } else {
        contentCell = content.innerHTML.trim() ? content : '';
      }
    }
    rows.push([title, contentCell]);
  });

  // Create the accordion block table and replace the original element
  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
