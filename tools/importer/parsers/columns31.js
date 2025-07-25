/* global WebImporter */
export default function parse(element, { document }) {
  // Table header as specified
  const headerRow = ['Columns (columns31)'];

  // Find the left column (.mainGrid.megaPic)
  const leftCol = element.querySelector('.mainGrid.megaPic');
  let leftCellContent = [];
  if (leftCol) {
    // Get the overlay image
    const overlayImg = leftCol.querySelector('div[data-picture] img');
    // Get the overlay text link (headline)
    const overlayHeadlineLink = leftCol.querySelector('a.gcsBigContent');
    if (overlayImg) {
      leftCellContent.push(overlayImg);
    }
    if (overlayHeadlineLink) {
      leftCellContent.push(overlayHeadlineLink);
    }
  }

  // Find the right column(s)
  const rightCol = element.querySelector('.mainGrid:not(.megaPic)');
  let rightCellContent = [];
  if (rightCol) {
    // Each .fifty_100_percent is a horizontal row in the right column
    const rightRows = rightCol.querySelectorAll('.fifty_100_percent');
    rightRows.forEach((row) => {
      // Text on left, image on right (within sub-row)
      const textCol = row.querySelector('.mob_grayText');
      const imgCol = row.querySelector('.mob_grayImg');
      // Only render if there's actual content
      if (textCol || imgCol) {
        const subRow = document.createElement('div');
        if (textCol) subRow.appendChild(textCol);
        if (imgCol) subRow.appendChild(imgCol);
        rightCellContent.push(subRow);
      }
    });
  }

  // Only include arrays as cells if they have at least 1 node, else empty string
  const leftCell = leftCellContent.length ? leftCellContent : '';
  const rightCell = rightCellContent.length ? rightCellContent : '';

  // Construct the block table array
  const cells = [
    headerRow,
    [leftCell, rightCell]
  ];

  // Create and replace
  const block = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(block);
}
