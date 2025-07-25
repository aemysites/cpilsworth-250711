/* global WebImporter */
export default function parse(element, { document }) {
  // Find all card containers (each .descriptivetext is a card)
  const cardWrappers = element.querySelectorAll(':scope > .descriptivetext');

  const rows = [];
  // Header row, matches the example exactly
  rows.push(['Cards (cardsNoImages29)']);

  cardWrappers.forEach(cardWrapper => {
    // Get the deepest container
    const container = cardWrapper.querySelector(':scope > .container_24.descriptiveText');
    if (!container) return;

    // Try to extract the heading (optional)
    const heading = container.querySelector('h2');
    // Extract the descriptive paragraph (optional)
    const descriptionDiv = container.querySelector('.bodyCopy');
    let descriptionEls = [];
    if (descriptionDiv) {
      descriptionEls = Array.from(descriptionDiv.childNodes).filter(node => {
        return node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim());
      });
    }
    // Extract the button (CTA, optional)
    const button = container.querySelector('button');
    let cta = null;
    if (button) {
      // Parse link from onclick
      const onclick = button.getAttribute('onclick');
      let href = '';
      if (onclick) {
        const match = onclick.match(/openLink\('(.*?)'/i);
        if (match) href = match[1];
      }
      // Find the button's visible text
      let linkText = '';
      Array.from(button.childNodes).forEach(node => {
        if (node.nodeType === 3 && node.textContent.trim()) {
          linkText += node.textContent.trim();
        }
      });
      if (!linkText) linkText = 'Click here';
      const a = document.createElement('a');
      a.href = href;
      a.textContent = linkText;
      cta = a;
    }

    // Compose cell content in visual/semantic order
    const cellContent = [];
    if (heading) cellContent.push(heading);
    if (descriptionEls.length) descriptionEls.forEach(el => cellContent.push(el));
    if (cta) cellContent.push(cta);
    rows.push([cellContent]);
  });

  // Create the block table and replace the original element
  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
