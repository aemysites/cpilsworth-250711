/* global WebImporter */
export default function parse(element, { document }) {
  // Build table header row as in the example
  const headerRow = ['Cards (cardsNoImages32)'];
  // Get all direct <p> children: each will become a card
  const paragraphs = Array.from(element.querySelectorAll(':scope > p'));
  const cells = [headerRow];
  // Add a row for each paragraph, referencing the original <p> element
  paragraphs.forEach((p) => {
    cells.push([p]);
  });
  // Create table and replace the original element
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
