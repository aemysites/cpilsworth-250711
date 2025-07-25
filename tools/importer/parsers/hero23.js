/* global WebImporter */
export default function parse(element, { document }) {
  // 1st row: Header
  const headerRow = ['Hero (hero23)'];

  // 2nd row: Background Image (optional)
  // Try to find the main hero image from the HTML
  let img = element.querySelector('img.fullWidthImg');
  let imgCell = '';
  if (img) {
    imgCell = img;
  }

  // 3rd row: Headline, subheading, CTA
  // Find the section that contains heading and CTA
  // We'll look for headings and button inside element
  let contentCell = document.createElement('div');

  // Headline (h2)
  let h2 = element.querySelector('h2, h1, .heroSubHeader');
  if (h2) {
    contentCell.appendChild(h2);
  }

  // CTA (button to link)
  let button = element.querySelector('button');
  if (button) {
    // Try to get URL from button's onclick, fallback to href attribute inside <a>
    let linkUrl = '';
    let onclickAttr = button.getAttribute('onclick');
    if (onclickAttr) {
      let urlMatch = onclickAttr.match(/'(https?:[^']+)'/);
      if (urlMatch) {
        linkUrl = urlMatch[1];
      }
    }
    // Generate a link if URL found
    let ctaLink = document.createElement('a');
    ctaLink.href = linkUrl || '#';
    ctaLink.textContent = button.textContent.trim();
    // Keep button-like class for styling if needed
    ctaLink.className = 'buttonCommon';
    contentCell.appendChild(ctaLink);
  }

  const cells = [
    headerRow,
    [imgCell],
    [contentCell]
  ];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
