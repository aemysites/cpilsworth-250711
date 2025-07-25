/* global WebImporter */
export default function parse(element, { document }) {
  // Header row: must match the example exactly
  const headerRow = ['Hero (hero17)'];

  // Second row: no background image in provided HTML, so set to empty string
  const backgroundImageRow = [''];

  // Third row: gather all text content (heading, paragraph, form, etc.)
  // Find the main hero content region: cargoSearch or tracktraceform
  let heroContent = null;
  // Try cargoSearch
  heroContent = element.querySelector('.module.cargoSearch');
  // Fallback: tracktraceform
  if (!heroContent) heroContent = element.querySelector('.tracktraceform');
  // Last fallback: use the element itself
  if (!heroContent) heroContent = element;

  // Collect all meaningful content from heroContent
  // Remove non-content elements: script, style, link
  Array.from(heroContent.querySelectorAll('script, style, link')).forEach(e => e.remove());
  // Remove empty divs (except those with a form or visible text)
  Array.from(heroContent.querySelectorAll('div')).forEach(div => {
    if (!div.textContent.trim() && !div.querySelector('form')) {
      div.remove();
    }
  });

  // The cell should contain all remaining children of heroContent, so all text and forms are included
  const contentNodes = Array.from(heroContent.childNodes).filter(n => {
    // Remove purely empty text nodes
    if (n.nodeType === Node.TEXT_NODE) return n.textContent.trim().length > 0;
    return true;
  });

  const contentRow = [contentNodes];

  // Assemble and replace
  const cells = [headerRow, backgroundImageRow, contentRow];
  const block = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(block);
}
