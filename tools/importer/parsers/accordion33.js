/* global WebImporter */
export default function parse(element, { document }) {
  // Accordion block header row
  const rows = [['Accordion (accordion33)']];

  // Find accordion items (li elements)
  const accordionUL = element.querySelector('.accordUL');
  if (!accordionUL) return;
  const items = accordionUL.querySelectorAll(':scope > li.accordLi');

  items.forEach((li) => {
    // TITLE cell: Extract only the visible heading text and any inline formatting
    const header = li.querySelector('h3.accordHeader');
    let titleCell;
    if (header) {
      // Remove aria-offscreen and arrow image from header for clean title
      const headerClone = header.cloneNode(true);
      headerClone.querySelectorAll('.aria-offscreen, img').forEach(el => el.remove());
      // The visible title is the textContent of the headerClone, but preserve any inline HTML (bold, etc.)
      // So, grab all childNodes except the removed ones
      titleCell = document.createElement('span');
      Array.from(headerClone.childNodes).forEach((node) => {
        if (node.nodeType === 3) {
          // text node
          titleCell.appendChild(document.createTextNode(node.textContent));
        } else if (node.nodeType === 1) {
          // element node (e.g. <em>, <strong>)
          titleCell.appendChild(node);
        }
      });
    } else {
      titleCell = document.createTextNode('');
    }

    // CONTENT cell: Reference the main body content as a single block
    let contentCell;
    const contentDiv = li.querySelector('.accordContent');
    if (contentDiv) {
      // Remove aria-offscreen elements
      contentDiv.querySelectorAll('.aria-offscreen').forEach(el => el.remove());
      // The real content is usually inside a single div.grid_16.bodyCopy, but can be more complex
      // We'll reference all direct children of contentDiv except aria-offscreen
      // If only one element remains, reference it; else, pass all as array
      const contentBlocks = Array.from(contentDiv.children).filter(el => !el.classList.contains('aria-offscreen'));
      if (contentBlocks.length === 1) {
        contentCell = contentBlocks[0];
      } else if (contentBlocks.length > 1) {
        contentCell = contentBlocks;
      } else {
        // If for some reason no children, keep fallback
        contentCell = document.createTextNode('');
      }
    } else {
      contentCell = document.createTextNode('');
    }

    rows.push([titleCell, contentCell]);
  });

  // Create the accordion block table and replace the original element
  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
