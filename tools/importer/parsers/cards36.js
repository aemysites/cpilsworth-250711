/* global WebImporter */
export default function parse(element, { document }) {
  // Table header per specifications
  const rows = [['Cards (cards36)']];
  // Find the main grid containing cards
  const container = element.querySelector('.container');
  if (!container) return;
  const mainGrid = container.querySelector('.grid-layout');
  if (!mainGrid) return;
  // First card is a direct <a> child, the rest are inside a nested grid-layout
  let cards = [];
  // Find direct <a> children (top-level card)
  Array.from(mainGrid.children).forEach(child => {
    if (child.tagName === 'A') {
      cards.push(child);
    } else if (child.classList && child.classList.contains('grid-layout')) {
      // For the nested grid, gather <a> children (the inner cards)
      cards = cards.concat(Array.from(child.children).filter(c => c.tagName === 'A'));
    }
  });
  // For each card, extract image and content
  cards.forEach(card => {
    // IMAGE cell: find the first <img> inside the card
    const img = card.querySelector('img');
    const imageCell = img ? img : '';
    // TEXT cell:
    const textParts = [];
    // Find the heading (use the first h2-h6)
    const heading = card.querySelector('h2, h3, h4, h5, h6');
    if (heading) textParts.push(heading);
    // Find all <p> inside the card (for description)
    card.querySelectorAll('p').forEach(p => textParts.push(p));
    // Find call-to-action: .button, <button>, or <a> that is not the card link itself (but children inside)
    // In this HTML, the CTA is a .button div inside the first card
    const ctaCandidates = Array.from(card.querySelectorAll('.button, button'));
    ctaCandidates.forEach(cta => {
      // Only include CTA if it is not the card link itself
      if (cta !== card) textParts.push(cta);
    });
    rows.push([imageCell, textParts]);
  });
  // Build and replace
  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
