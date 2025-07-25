/* global WebImporter */
export default function parse(element, { document }) {
  // Block header row: block name, exactly one column
  const rows = [['Cards (cards10)']];

  // Get all card column elements in order
  const cardBlocks = element.querySelectorAll('.tabContent');

  cardBlocks.forEach(card => {
    // --- IMAGE CELL ---
    // Find the anchor wrapping the image (if present)
    let imgAnchor = card.querySelector('a');
    let img = card.querySelector('img');
    let imgCell = null;
    if (imgAnchor && imgAnchor.querySelector('img')) {
      imgCell = imgAnchor;
    } else if (img) {
      imgCell = img;
    }

    // --- TEXT CELL ---
    // Prefer the <section> with heading, description, and cta, as a single content block
    let textSection = card.querySelector('section');
    let textCell = null;
    if (textSection) {
      textCell = textSection;
    } else {
      // fallback: put all headings, paragraphs, and links (excluding images) as a block
      const frag = document.createElement('div');
      card.childNodes.forEach(child => {
        if (!(child.tagName && child.tagName.toLowerCase() === 'a' && child.querySelector('img'))) {
          frag.appendChild(child);
        }
      });
      textCell = frag;
    }
    
    // Only add the row if both image and text exist
    if (imgCell && textCell) {
      rows.push([imgCell, textCell]);
    }
  });

  // Only replace if at least one card was found
  if (rows.length > 1) {
    const table = WebImporter.DOMUtils.createTable(rows, document);
    element.replaceWith(table);
  }
}
