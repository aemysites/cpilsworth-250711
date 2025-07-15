/* global WebImporter */
export default function parse(element, { document }) {
  // The header row must exactly match the block name and variant.
  const headerRow = ['Cards (cards8)'];

  // Each card is a direct child div.utility-aspect-1x1, containing an img
  const cardDivs = element.querySelectorAll(':scope > .utility-aspect-1x1');
  const rows = [headerRow];

  cardDivs.forEach((div) => {
    const img = div.querySelector('img');
    if (img) {
      // No text content in this HTML source for cards, so second cell is empty
      rows.push([img, '']);
    }
  });

  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}