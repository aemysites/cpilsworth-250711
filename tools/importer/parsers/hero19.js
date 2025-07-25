/* global WebImporter */
export default function parse(element, { document }) {
  // Block header row
  const headerRow = ['Hero (hero19)'];

  // Find the prominent image (background image)
  let img = element.querySelector('img');
  if (!img) {
    const pictureDiv = element.querySelector('[data-picture]');
    if (pictureDiv) {
      img = pictureDiv.querySelector('img');
    }
  }
  let imageRow = [''];
  if (img) {
    imageRow = [img];
  }

  // 3rd row: Find the content (title, subtitle, cta etc)
  // The content is inside .container_24.heroCompWrapper > section.imgTxtFullWidth
  let contentCell = '';
  let contentSection = element.querySelector('.container_24.heroCompWrapper section.imgTxtFullWidth');
  if (!contentSection) {
    // fallback to .container_24 > section.imgTxtFullWidth
    contentSection = element.querySelector('.container_24 section.imgTxtFullWidth');
  }
  if (!contentSection) {
    // fallback to just .imgTxtFullWidth
    contentSection = element.querySelector('section.imgTxtFullWidth');
  }
  if (contentSection) {
    // check if section contains any visible content
    if (contentSection.children.length > 0 || contentSection.textContent.trim().length > 0) {
      contentCell = Array.from(contentSection.childNodes).filter(node => {
        // keep non-empty text nodes and elements
        return (node.nodeType === 1 && (node.textContent.trim().length > 0 || node.querySelector('*'))) ||
               (node.nodeType === 3 && node.textContent.trim().length > 0);
      });
      // If only one node, don't wrap in array
      if (contentCell.length === 1) contentCell = contentCell[0];
      if (contentCell.length === 0) contentCell = '';
    }
  }
  let contentRow = [contentCell];

  // Compose the block table as per the Markdown sample (1 column, 3 rows)
  const cells = [headerRow, imageRow, contentRow];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
