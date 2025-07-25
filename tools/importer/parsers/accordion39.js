/* global WebImporter */
export default function parse(element, { document }) {
  // Construct the header row for the block table
  const headerRow = ['Accordion (accordion39)'];
  const rows = [headerRow];

  // Find the UL containing all accordion items
  const ul = element.querySelector('ul.accordUL');
  if (!ul) return;

  // Iterate each direct LI (accordion item)
  ul.querySelectorAll(':scope > li').forEach((li) => {
    // Title cell: extract text from h3.accordHeader, ignoring child spans/images
    const h3 = li.querySelector('h3.accordHeader');
    let title = '';
    if (h3) {
      // Only use the text nodes (not child elements)
      title = Array.from(h3.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent.trim()).join(' ');
    }

    // Content cell: the content is inside div.accordContent, which may contain an extra span (aria-offscreen)
    let contentCell = '';
    const contentDiv = li.querySelector('div.accordContent');
    if (contentDiv) {
      // The actual content is the first div child inside contentDiv (skip aria-offscreen spans)
      let innerContent = Array.from(contentDiv.children).find(child => child.tagName === 'DIV');
      if (innerContent) {
        contentCell = innerContent;
      } else {
        // fallback: use the contentDiv itself (in case structure changes)
        contentCell = contentDiv;
      }
    }

    rows.push([title, contentCell]);
  });

  // Create the block table and replace the original element
  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
