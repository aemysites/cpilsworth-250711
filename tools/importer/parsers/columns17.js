/* global WebImporter */
export default function parse(element, { document }) {
  // Find the grid layout within the section
  const grid = element.querySelector('.w-layout-grid');
  if (!grid) return;
  // Get all direct children of the grid (should be 3: left content, contact list, image)
  const gridChildren = Array.from(grid.children);

  // Identify left content (contains h2 and h3), contact list (ul), and image (img)
  let leftContent = null;
  let contactList = null;
  let image = null;
  gridChildren.forEach((child) => {
    if (!leftContent && child.querySelector('h2') && child.querySelector('h3')) {
      leftContent = child;
    } else if (!contactList && child.tagName === 'UL') {
      contactList = child;
    } else if (!image && child.tagName === 'IMG') {
      image = child;
    }
  });

  // Defensive: If contactList or image are missing, create empty nodes to fill columns
  if (!contactList) {
    contactList = document.createElement('div');
  }
  if (!image) {
    image = document.createElement('div');
  }

  // Compose left column from leftContent and contactList
  const leftCol = document.createElement('div');
  if (leftContent) leftCol.appendChild(leftContent);
  if (contactList) leftCol.appendChild(contactList);

  // Build table rows as per spec: header row should be single column!
  const headerRow = ['Columns (columns17)']; // <--- Only one column
  const contentRow = [leftCol, image]; // second row as many columns as needed

  const table = WebImporter.DOMUtils.createTable([
    headerRow,
    contentRow
  ], document);

  element.replaceWith(table);
}
