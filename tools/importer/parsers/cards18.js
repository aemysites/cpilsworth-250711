/* global WebImporter */
export default function parse(element, { document }) {
  // Cards (cards18) block: 2 columns, N rows, each row = [icon, text]
  const headerRow = ['Cards (cards18)'];
  const cards = Array.from(element.querySelectorAll(':scope > div'));
  const rows = cards.map(card => {
    // Icon: the first div with class 'icon' within card
    const iconDiv = card.querySelector('div.icon');
    // Text content: the first <p> in card
    const textP = card.querySelector('p');
    // Defensive: if either is missing, insert an empty string
    return [iconDiv || '', textP || ''];
  });
  const cells = [headerRow, ...rows];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
