/* global WebImporter */
export default function parse(element, { document }) {
  // The header row must have two columns to match the data rows
  const headerRow = ['Cards (cards24)', ''];
  // Get all direct card links
  const cards = Array.from(element.querySelectorAll(':scope > a.utility-link-content-block'));
  // Build rows: each with [image, text content]
  const rows = cards.map((card) => {
    // Left cell: image
    let img = null;
    const imgWrap = card.querySelector('div.utility-aspect-2x3');
    if (imgWrap) {
      img = imgWrap.querySelector('img');
    }
    // Right cell: tag/date + heading
    const textParts = [];
    const meta = card.querySelector('div.flex-horizontal');
    if (meta) textParts.push(meta);
    const heading = card.querySelector('h3, .h4-heading, h4');
    if (heading) textParts.push(heading);
    return [img, textParts];
  });
  // Compose the table
  const cells = [headerRow, ...rows];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  // Replace the element with the block table
  element.replaceWith(table);
}
