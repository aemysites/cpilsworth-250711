/* global WebImporter */
export default function parse(element, { document }) {
  // Header row as specified
  const headerRow = ['Cards (cards36)'];
  const rows = [headerRow];

  // The page structure: each card is a columncontrol.section or customcolumncontrol.section
  const cardSectionSelectors = [
    '.columncontrol.section',
    '.customcolumncontrol.section',
  ];
  const allSections = [];
  cardSectionSelectors.forEach(sel => {
    element.querySelectorAll(sel).forEach(section => allSections.push(section));
  });

  allSections.forEach(section => {
    // IMAGE: right column image (first <img> in .rightCol)
    const rightImg = section.querySelector('.rightCol img');

    // TEXT: leftCol content
    const leftBody = section.querySelector('.leftCol .bodyCopy');
    const textParts = [];
    if (leftBody) {
      // Heading
      const heading = leftBody.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading) textParts.push(heading);
      // Paragraphs (skip those with only &nbsp; or blank)
      leftBody.querySelectorAll('p').forEach(p => {
        if (p.querySelector('img')) return;
        if (p.textContent && p.textContent.replace(/\u00a0/g, '').trim() !== '') {
          textParts.push(p);
        }
      });
    }
    // CTA: button or anchor below leftCol
    let ctaBtn = section.querySelector('button.buttonCommon, a.buttonCommon');
    if (ctaBtn) {
      // If it's a button with onclick, convert to anchor with correct href
      if (ctaBtn.tagName === 'BUTTON') {
        let href = null;
        const onclick = ctaBtn.getAttribute('onclick');
        if (onclick) {
          const match = onclick.match(/openLink\('([^']+)'/);
          if (match) href = match[1];
        }
        if (href) {
          const a = document.createElement('a');
          a.href = href;
          // Only the visible text (remove aria-offscreen etc)
          a.textContent = ctaBtn.textContent.replace(/\s+/g, ' ').trim();
          a.className = ctaBtn.className;
          textParts.push(a);
        } else {
          textParts.push(ctaBtn);
        }
      } else {
        textParts.push(ctaBtn);
      }
    }
    // Only include row if we have both image and some text
    if (rightImg && textParts.length) {
      rows.push([rightImg, textParts.length === 1 ? textParts[0] : textParts]);
    }
  });
  if (rows.length > 1) {
    const table = WebImporter.DOMUtils.createTable(rows, document);
    element.replaceWith(table);
  }
}
