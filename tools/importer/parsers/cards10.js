/* global WebImporter */
export default function parse(element, { document }) {
  // Helper: get all direct card columns (col1, col2, col3)
  function getCardColumns(wrapper) {
    return Array.from(wrapper.querySelectorAll(':scope > div')).filter(div =>
      div.classList.contains('col1') ||
      div.classList.contains('col2') ||
      div.classList.contains('col3')
    );
  }

  // Find the wrapper that contains the card columns
  let cardsWrapper = element;
  for (let i = 0; i < 5; i++) {
    let cols = getCardColumns(cardsWrapper);
    if (cols.length) break;
    const next = cardsWrapper.querySelector(':scope > div');
    if (!next) break;
    cardsWrapper = next;
  }
  const columns = getCardColumns(cardsWrapper);

  const cells = [['Cards (cards10)']];
  columns.forEach(col => {
    // Image: find the first <img> within the column
    let img = col.querySelector('img');
    let imageCell = img ? img : '';

    // Text cell:
    let section = col.querySelector('section') || col;
    let textParts = [];

    // Heading (h2, h3, h4, but exclude aria-offscreen visually hidden ones)
    let heading = Array.from(section.querySelectorAll('h2, h3, h4')).find(h => {
      return !h.classList.contains('aria-offscreen');
    });
    if (heading) textParts.push(heading);

    // Date: first <sup> or <sub> (many site news cards use these)
    let date = section.querySelector('sup, sub');
    if (date) textParts.push(date);

    // Description: all <p> in the section that aren't just the date
    let pNodes = Array.from(section.querySelectorAll('p')).filter(p => {
      // Exclude if only contains <sup> or <sub> and whitespace
      let onlyDate = (p.children.length === 1) &&
        (p.querySelector('sup,sub')) &&
        (p.textContent.trim() === date?.textContent?.trim());
      return !onlyDate && p.textContent.trim();
    });
    pNodes.forEach(p => textParts.push(p));

    // Description fallback: for div.bodyCopy if no <p> inside
    if (!pNodes.length) {
      let bodyCopy = section.querySelector('.bodyCopy');
      if (bodyCopy && bodyCopy.textContent.trim()) {
        textParts.push(bodyCopy);
      }
    }

    // Calls to action: all direct <a> inside section
    let links = Array.from(section.querySelectorAll('a'));
    links.forEach(link => textParts.push(link));

    // If textParts is still empty, fallback to section's textContent (shouldn't happen)
    if (!textParts.length && section.textContent.trim()) {
      textParts.push(document.createTextNode(section.textContent.trim()));
    }

    // Assemble the row
    cells.push([imageCell, textParts.length === 1 ? textParts[0] : textParts]);
  });

  if (cells.length > 1) {
    const table = WebImporter.DOMUtils.createTable(cells, document);
    element.replaceWith(table);
  }
}
