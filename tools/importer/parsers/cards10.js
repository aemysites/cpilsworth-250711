/* global WebImporter */
export default function parse(element, { document }) {
  // Header row as in example: single cell, block name
  const cells = [['Cards (cards10)']];

  // All cards are direct <a> children
  const cards = element.querySelectorAll(':scope > a');
  cards.forEach(card => {
    // First cell: image (mandatory)
    let image = null;
    const imgContainer = card.querySelector('.utility-aspect-3x2');
    if (imgContainer) {
      image = imgContainer.querySelector('img');
    }
    
    // Second cell: text content (tag, heading, description)
    const textContent = [];
    const textDiv = card.querySelector('.utility-padding-all-1rem');
    if (textDiv) {
      // Tag (optional, presented above heading)
      const tag = textDiv.querySelector('.tag');
      if (tag && tag.textContent.trim()) {
        const tagP = document.createElement('p');
        tagP.textContent = tag.textContent.trim();
        textContent.push(tagP);
      }
      // Heading (mandatory, <h3>) - use <strong> as in markdown example
      const heading = textDiv.querySelector('h3');
      if (heading && heading.textContent.trim()) {
        const strong = document.createElement('strong');
        strong.textContent = heading.textContent.trim();
        textContent.push(strong);
      }
      // Description (optional)
      // Get the first <p> that's not inside .tag-group (i.e., not the tag)
      // In this structure, it's the first <p> inside textDiv (after <h3>), so select the p
      const desc = textDiv.querySelector('p.paragraph-sm');
      if (desc && desc.textContent.trim()) {
        textContent.push(desc);
      }
    }
    // Always two cells per row
    cells.push([
      image,
      textContent
    ]);
  });

  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
