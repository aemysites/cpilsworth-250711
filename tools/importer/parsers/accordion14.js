/* global WebImporter */
export default function parse(element, { document }) {
  // Find the main accordion list
  const accordUL = element.querySelector('ul.accordUL');
  if (!accordUL) return;
  // Find all direct li children (accordion items)
  const accordLis = Array.from(accordUL.querySelectorAll(':scope > li'));
  // Accordion block header exactly as required, single column
  const rows = [
    ['Accordion (accordion14)'],
  ];
  // Add a row for each accordion item, exactly two columns: title and content
  accordLis.forEach((li) => {
    // Title cell: use the h3's visible text only, removing aria-offscreen and images
    let titleCell = '';
    const h3 = li.querySelector(':scope > h3');
    if (h3) {
      let text = '';
      Array.from(h3.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (
            !node.classList.contains('aria-offscreen') &&
            node.tagName.toLowerCase() !== 'img'
          ) {
            text += node.textContent;
          }
        }
      });
      titleCell = text.trim();
    }
    // Content cell: reference the accordContent div, removing aria-offscreen elements
    let contentCell = '';
    const contentDiv = li.querySelector(':scope > .accordContent');
    if (contentDiv) {
      // Remove aria-offscreen elements directly from the existing element
      contentDiv.querySelectorAll('.aria-offscreen').forEach(e => e.remove());
      contentCell = contentDiv;
    }
    // Always add the row if there is a title or content
    rows.push([titleCell, contentCell]);
  });
  // Create block table and replace the original element
  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
