/* global WebImporter */
export default function parse(element, { document }) {
  // Accordion block header as shown in the example
  const headerRow = ['Accordion'];
  const rows = [];

  // Find the main menu list
  const menuList = element.querySelector('ul.listContainer');
  if (!menuList) return;

  // Get direct children li.navigation1 (top level menu)
  const menuItems = menuList.querySelectorAll(':scope > li.navigation1');

  menuItems.forEach((li) => {
    // Title cell: get the visible link (inside <a>, direct or inside <span>)
    let titleLink = li.querySelector(':scope > a, :scope > span a');
    let title = titleLink || '';

    // Content cell: if submenu (div.headerpanels2), use its ul.listContainer if present, otherwise as empty string
    let contentCell = '';
    const panel = li.querySelector(':scope > div.headerpanels2');
    if (panel) {
      // If there is a submenu, use the <ul> inside it as the content, if present
      const submenuUl = panel.querySelector('ul.listContainer');
      if (submenuUl) {
        contentCell = submenuUl;
      } else {
        // If no ul, but there is content, use the panel itself
        contentCell = panel;
      }
    }
    rows.push([title, contentCell]);
  });

  const cells = [headerRow, ...rows];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  element.replaceWith(table);
}
