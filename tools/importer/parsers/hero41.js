/* global WebImporter */
export default function parse(element, { document }) {
  // Find the hero block (by class)
  const hero = element.querySelector('.hero');
  if (!hero) return;

  // Find the prominent hero background image
  let img = hero.querySelector('img.fullWidthImg');
  if (!img) {
    img = hero.querySelector('img');
  }

  // Find the hero inner wrapper where text content lives
  let content = null;
  const wrapper = hero.querySelector('.heroCompWrapper');
  if (wrapper) {
    // Typically the <section> inside the wrapper holds the text/cta
    const section = wrapper.querySelector('section');
    if (section) {
      content = section;
    } else {
      // fallback: use wrapper itself if no section
      content = wrapper;
    }
  }

  // Compose the table
  const cells = [
    ['Hero (hero41)'],
    [img || ''],
    [content || ''],
  ];
  const block = WebImporter.DOMUtils.createTable(cells, document);

  // Replace the hero block with the new table
  hero.replaceWith(block);
}
