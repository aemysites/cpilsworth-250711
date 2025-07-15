/* global WebImporter */
export default function parse(element, { document }) {
  // Helper: find all direct child divs that look like cards (direct child with an img)
  const cardDivs = Array.from(element.children).filter(div => div.querySelector('img'));

  // Table header exactly as required
  const rows = [['Cards (cards12)']];

  cardDivs.forEach(cardDiv => {
    // Find the first img descendant (required for the card)
    const img = cardDiv.querySelector('img');

    // Find a text wrapper (by convention utility-padding-all-2rem, else utility-position-relative, else fallback to any h3/p in cardDiv)
    let textWrapper = cardDiv.querySelector('.utility-padding-all-2rem')
      || cardDiv.querySelector('.utility-position-relative')
      || cardDiv;
    // Title (heading)
    const heading = textWrapper.querySelector('h1, h2, h3, h4, h5, h6');
    // Description (p)
    const desc = textWrapper.querySelector('p');

    // Compose cell for text content (heading + desc)
    const cellFrag = document.createDocumentFragment();
    if (heading) cellFrag.appendChild(heading);
    if (desc) cellFrag.appendChild(desc);
    // If neither heading nor desc, leave the cell empty string
    const textCell = cellFrag.childNodes.length ? cellFrag : '';

    rows.push([
      img,
      textCell
    ]);
  });

  // Create and replace
  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
