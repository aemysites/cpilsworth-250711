/* global WebImporter */
export default function parse(element, { document }) {
  // Find the hero section in the given element
  const hero = element.querySelector('.hero');
  if (!hero) return;

  // Row 2: Background image (none present in this source HTML)
  let bgImageCell = '';
  // If hero had a background image as <img> or <picture>, supply it here (not present in this case)
  // ---
  // Row 3: Title, Subheading, Call to Action (reference existing elements)
  const content = [];

  // Title as heading
  const heroHeader = hero.querySelector('h1');
  if (heroHeader && heroHeader.textContent.trim()) {
    content.push(heroHeader);
  }
  // Subheading (optional, may be empty in this case)
  const heroSubHeader = hero.querySelector('h2');
  if (heroSubHeader && heroSubHeader.textContent.trim()) {
    content.push(heroSubHeader);
  }

  // No explicit CTA present in this HTML

  // Compose table as per instructions
  const cells = [
    ['Hero (hero6)'],
    [bgImageCell],
    [content]
  ];

  // Create the table and replace the hero element
  const table = WebImporter.DOMUtils.createTable(cells, document);
  hero.replaceWith(table);
}
