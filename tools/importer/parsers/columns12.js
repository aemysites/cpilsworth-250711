/* global WebImporter */
export default function parse(element, { document }) {
  // Find the two main columns: image and text
  const main = element.querySelector('.grid_16.tabContent.twoColHoriWrapper_textFirst');
  if (!main) return;

  const columns = [];
  // Go through the immediate children of main
  const mainChildren = Array.from(main.children);

  // Identify which is image and which is text/section
  let imageCol = null;
  let textCol = null;
  mainChildren.forEach(child => {
    // Look for img
    if (!imageCol && child.querySelector && child.querySelector('img')) {
      imageCol = child;
    }
    // Look for .bodyCopy or section
    if (!textCol && child.querySelector && child.querySelector('.bodyCopy')) {
      textCol = child;
    }
  });

  // Defensive fallback if above didn't work
  if (!imageCol) {
    imageCol = main.querySelector('img')?.closest('div');
  }
  if (!textCol) {
    textCol = main.querySelector('.bodyCopy')?.closest('section');
  }

  // If we still couldn't find columns, abort
  if (!imageCol || !textCol) return;

  // Use the .bodyCopy div for text cell
  const textContent = textCol.querySelector('.bodyCopy') || textCol;
  // Use the full imageCol div for the image cell
  const imageContent = imageCol;

  // Table per example: header + one row, two columns
  const cells = [
    ['Columns (columns12)'],
    [textContent, imageContent],
  ];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
