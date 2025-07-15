/* global WebImporter */
export default function parse(element, { document }) {
  // The Hero (hero11) block expects:
  // 1 column, 3 rows:
  // [header], [background image], [text area]
  // The provided HTML only contains images (likely the visual part of the hero), no text or CTA.

  // 1. Extract images (use first image as hero background, as example markdown)
  const images = Array.from(element.querySelectorAll('img'));
  // Use only the first image for the hero (per the markdown example)
  const backgroundImage = images[0] || '';
  // 2. The text row (title, subtitle, CTA) is absent in this HTML, so provide empty cell

  // 3. Build the block table
  const cells = [
    ['Hero (hero11)'],
    [backgroundImage],
    [''],
  ];

  // 4. Create the table and replace
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}