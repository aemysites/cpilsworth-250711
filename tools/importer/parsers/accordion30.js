/* global WebImporter */
export default function parse(element, { document }) {
  // Accordion block header
  const headerRow = ['Accordion'];
  const rows = [headerRow];

  // Find all accordion list items
  const accordionItems = element.querySelectorAll('ul.accordUL > li.accordLi');
  accordionItems.forEach((li) => {
    // Extract the title from h3.accordHeader (direct text only, ignoring aria-offscreen and img)
    const h3 = li.querySelector('h3.accordHeader');
    let title = '';
    if (h3) {
      // Remove aria-offscreen and img nodes from the h3 for clean text
      Array.from(h3.querySelectorAll('.aria-offscreen, img')).forEach((n) => n.remove());
      title = h3.textContent.trim();
    }

    // Extract the content node(s) -- keep as is, reference from document
    const contentDiv = li.querySelector('div.accordContent');
    let contentCell;
    if (contentDiv) {
      // Remove any aria-offscreen nodes in content
      contentDiv.querySelectorAll('.aria-offscreen').forEach((n) => n.remove());
      // Find first child that is a visible HTML element (not a text node)
      // Usually the tabbed content is the first child div
      const contentNodes = Array.from(contentDiv.children).filter(n => n.nodeType === 1);
      if (contentNodes.length === 0) {
        // fallback: use the contentDiv itself if it's not empty
        contentCell = contentDiv.childNodes.length ? contentDiv : '';
      } else if (contentNodes.length === 1) {
        contentCell = contentNodes[0];
      } else {
        // More than one content block: provide all
        contentCell = contentNodes;
      }
    } else {
      contentCell = '';
    }

    rows.push([title, contentCell]);
  });

  // Create and replace block
  const block = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(block);
}
