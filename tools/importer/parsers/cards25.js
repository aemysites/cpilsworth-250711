/* global WebImporter */
export default function parse(element, { document }) {
  // Define the exact block header
  const headerRow = ['Cards (cards25)'];

  // Helper: get all direct link siblings with the same style as cards (flexible for blocks of links or a single link)
  let cardLinks = [];
  if (
    element.parentElement &&
    Array.from(element.parentElement.children).every(
      el => el.tagName === 'A' && el.classList.contains('descTextLink')
    )
  ) {
    cardLinks = Array.from(element.parentElement.children);
  } else {
    cardLinks = [element];
  }

  // Helper: get visible text (ignore aria-offscreen, preserve semantic html)
  function getCardTextContent(link) {
    // Clone link, remove aria-offscreen, extract contents
    const temp = link.cloneNode(true);
    temp.querySelectorAll('.aria-offscreen').forEach(e => e.remove());
    // Get all text excluding the inline image
    let textNodes = [];
    temp.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        textNodes.push(document.createTextNode(node.textContent.trim()));
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.tagName !== 'IMG'
      ) {
        textNodes.push(node);
      }
    });
    // If all text nodes, wrap in a span for structure
    if (textNodes.length === 1) {
      return textNodes[0];
    } else if (textNodes.length > 1) {
      const span = document.createElement('span');
      textNodes.forEach(n => span.appendChild(n));
      return span;
    }
    return '';
  }

  // Compose rows for each card
  const rows = cardLinks.map(link => {
    // First cell: image (if any)
    const img = link.querySelector('img');
    // Second cell: all text content (as link, with correct text and href)
    const textContent = getCardTextContent(link);
    const a = document.createElement('a');
    a.href = link.href;
    if (textContent) a.appendChild(textContent);
    // Only add both cells if both exist, else keep to two columns
    return [img || '', a];
  });

  // Build and replace
  const table = WebImporter.DOMUtils.createTable([
    headerRow,
    ...rows
  ], document);
  element.replaceWith(table);
}
