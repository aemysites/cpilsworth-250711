/* global WebImporter */
export default function parse(element, { document }) {
  // Create the header row, exactly as in the example
  const headerRow = ['Hero (hero1)'];

  // No background image in the HTML, so the image row is empty
  const imageRow = [''];

  // For the content cell, include all direct .descriptivetext blocks as in the HTML
  // This preserves all content including headings, paragraphs, and buttons
  const sections = Array.from(element.querySelectorAll(':scope > .descriptivetext'));

  // If for some reason no .descriptivetext matches, fallback to all child elements (robustness)
  const contentCell = sections.length ? sections : Array.from(element.children);

  // The block table: 1 column, 3 rows (header, image, content)
  const rows = [
    headerRow,
    imageRow,
    [contentCell]
  ];

  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
