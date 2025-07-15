/* global WebImporter */
export default function parse(element, { document }) {
  // Get the main grid containing both the text/buttons and the images
  const grid = element.querySelector('.grid-layout');
  if (!grid) return;

  // Immediate children: left (text) and right (images)
  const gridChildren = Array.from(grid.children);
  let textArea = null;
  let imageArea = null;
  for (const child of gridChildren) {
    if (child.querySelector('img')) {
      imageArea = child.querySelector('.grid-layout');
    } else {
      textArea = child;
    }
  }

  // Gather images (reference actual DOM elements)
  const images = imageArea ? Array.from(imageArea.querySelectorAll('img')) : [];

  // Compose the right column (text/buttons) as an array of existing elements
  let textColumnContent = [];
  if (textArea) {
    const heading = textArea.querySelector('h1');
    if (heading) textColumnContent.push(heading);
    const subheading = textArea.querySelector('p');
    if (subheading) textColumnContent.push(subheading);
    const buttonGroup = textArea.querySelector('.button-group');
    if (buttonGroup) {
      const buttons = Array.from(buttonGroup.querySelectorAll('a'));
      textColumnContent = textColumnContent.concat(buttons);
    }
  }

  // Header row must have two cells: first is the block name, second is empty
  const rows = [];
  rows.push(['Carousel (carousel35)', '']);
  images.forEach((img, idx) => {
    if (idx === 0 && textColumnContent.length) {
      rows.push([img, textColumnContent]);
    } else {
      rows.push([img, '']);
    }
  });

  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
