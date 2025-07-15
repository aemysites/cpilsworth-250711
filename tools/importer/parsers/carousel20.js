/* global WebImporter */
export default function parse(element, { document }) {
  // The header row must have a single cell to span both columns, matching the markdown example
  const headerRow = ['Carousel (carousel20)'];

  // Extract image and optional heading from the card
  const cardBody = element.querySelector('.card-body');
  let imgEl = null;
  let textEl = null;

  if (cardBody) {
    imgEl = cardBody.querySelector('img');
    const heading = cardBody.querySelector('.h4-heading');
    if (heading) {
      // Place the heading in a div for semantic grouping
      textEl = document.createElement('div');
      textEl.appendChild(heading);
    } else {
      textEl = '';
    }
  } else {
    imgEl = '';
    textEl = '';
  }

  // Two columns for the slide row: image | text
  const slideRow = [imgEl, textEl];

  // The cells array: header row (one cell), then rows for each slide (two cells)
  const cells = [headerRow, slideRow];

  // Create and insert the new block table
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
