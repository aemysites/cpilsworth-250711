/* global WebImporter */
export default function parse(element, { document }) {
  // Table header as per example
  const rows = [['Accordion (accordion33)']];

  // Each direct child div is an accordion item
  const items = element.querySelectorAll(':scope > div');
  items.forEach((item) => {
    // Title: get .w-dropdown-toggle > .paragraph-lg or fallback to .w-dropdown-toggle directly
    let title = null;
    const toggle = item.querySelector(':scope > .w-dropdown-toggle');
    if (toggle) {
      title = toggle.querySelector('.paragraph-lg') || toggle;
    } else {
      // fallback: first .paragraph-lg in item
      title = item.querySelector('.paragraph-lg') || document.createElement('span');
    }

    // Content: get nav.accordion-content > .utility-padding-all-1rem or fallback to nav.accordion-content
    let content = null;
    const nav = item.querySelector('nav.accordion-content');
    if (nav) {
      const contentWrap = nav.querySelector('.utility-padding-all-1rem');
      if (contentWrap) {
        content = contentWrap;
      } else {
        content = nav;
      }
    } else {
      // fallback: .rich-text inside item, or item itself
      content = item.querySelector('.rich-text') || item;
    }

    rows.push([title, content]);
  });

  const table = WebImporter.DOMUtils.createTable(rows, document);
  element.replaceWith(table);
}
