/* global WebImporter */
export default function parse(element, { document }) {
  // Find the card container in the structure
  const cardContainer = element.querySelector('.textAssetMultiColComp');
  if (!cardContainer) return;

  // Get the image element (within .col1 > [data-picture] > img)
  let image = null;
  const col1 = cardContainer.querySelector('.col1');
  if (col1) {
    const imgWrap = col1.querySelector('[data-picture]');
    if (imgWrap) {
      image = imgWrap.querySelector('img');
    }
  }

  // Get the text contents: title, description, cta
  let title = null, descNodes = [], cta = null;
  const contentCol = cardContainer.querySelector('.contentCol3');
  if (contentCol) {
    title = contentCol.querySelector('h2');
    const desc = contentCol.querySelector('.bodyCopy');
    if (desc) {
      descNodes = Array.from(desc.childNodes).filter(node => {
        // Only keep non-empty nodes
        return (node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0));
      });
    }
    cta = contentCol.querySelector('a');
  }

  // Compose the text cell using only referenced (not cloned) elements
  const textCell = document.createElement('div');
  if (title) textCell.appendChild(title);
  descNodes.forEach(node => textCell.appendChild(node));
  if (cta) textCell.appendChild(cta);

  // Table: header then card row [image, text]
  const rows = [
    ['Cards (cards43)'],
    [image, textCell]
  ];

  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
