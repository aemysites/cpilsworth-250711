/* global WebImporter */
export default function parse(element, { document }) {
  // Header row must match exactly
  const headerRow = ['Hero (hero21)'];

  // The hero block has no image in the provided HTML, so second row is empty
  const imageCell = '';

  // For the content cell: find all main hero text content
  // In this HTML, the main message is inside .confirmation.section
  let contentCell = '';
  const confirmationSection = element.querySelector('.confirmation.section');
  if (confirmationSection) {
    // The confirmationSection contains the message in its subtree
    // We want to preserve all content and structure, so use the whole node
    contentCell = confirmationSection;
  }

  const cells = [
    headerRow,
    [imageCell],
    [contentCell]
  ];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
