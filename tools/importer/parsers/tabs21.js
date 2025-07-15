/* global WebImporter */
export default function parse(element, { document }) {
  // Find the tab menu and tab content container
  const tabMenu = Array.from(element.children).find((el) => el.classList.contains('w-tab-menu'));
  const tabContent = Array.from(element.children).find((el) => el.classList.contains('w-tab-content'));
  if (!tabMenu || !tabContent) return;
  const tabLinks = tabMenu.querySelectorAll('a[role="tab"]');
  const tabPanes = tabContent.querySelectorAll('.w-tab-pane');

  // Header row: ONLY a single cell with 'Tabs' as per spec
  const rows = [['Tabs']];

  // For each tab, create a row [label, content]
  tabLinks.forEach((tabLink, i) => {
    let labelEl = tabLink.querySelector('div') || tabLink;
    // Reference existing element (do not clone)
    const labelCell = labelEl;
    // Grab the corresponding tab pane content
    const pane = tabPanes[i];
    let contentCell = '';
    if (pane) {
      const mainContent = pane.firstElementChild || pane;
      contentCell = mainContent;
    }
    rows.push([labelCell, contentCell]);
  });

  // Use createTable as specified
  const block = WebImporter.DOMUtils.createTable(rows, document);
  // Replace original element
  element.replaceWith(block);
}
