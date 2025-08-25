/* global WebImporter */
export default function parse(element, { document }) {
  // Table header
  const headerRow = ['Accordion'];
  const rows = [headerRow];

  // Get the main accordion list
  const accordUL = element.querySelector('.accordUL');
  if (!accordUL) return;
  const accordLis = accordUL.querySelectorAll(':scope > li');

  accordLis.forEach((li) => {
    // Accordion title: the h3.accordHeader (include only direct text, not img/span)
    const header = li.querySelector('h3.accordHeader');
    let titleNode;
    if (header) {
      let label = '';
      // Get all text nodes in header (ignore images and spans)
      header.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          label += node.textContent.trim();
        }
      });
      // If no text nodes, fallback to textContent
      label = label || header.textContent.trim();
      titleNode = document.createElement('span');
      titleNode.textContent = label;
    } else {
      titleNode = document.createTextNode('');
    }

    // Accordion content: .accordContent (reference its children except aria-offscreen)
    const content = li.querySelector('.accordContent');
    let contentCell;
    if (content) {
      // Remove any .aria-offscreen children (they're only accessibility labels)
      const contentFragments = Array.from(content.children).filter((el) => !el.classList.contains('aria-offscreen'));
      if (contentFragments.length === 1) {
        contentCell = contentFragments[0];
      } else if (contentFragments.length > 1) {
        // Wrap multiple elements in a div for a single cell
        const wrapper = document.createElement('div');
        contentFragments.forEach((el) => wrapper.appendChild(el));
        contentCell = wrapper;
      } else {
        // Sometimes content is just a text node
        const textNodes = Array.from(content.childNodes).filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
        if (textNodes.length) {
          const wrapper = document.createElement('div');
          textNodes.forEach(n => wrapper.appendChild(document.createTextNode(n.textContent)));
          contentCell = wrapper;
        } else {
          contentCell = document.createTextNode('');
        }
      }
    } else {
      contentCell = document.createTextNode('');
    }

    rows.push([titleNode, contentCell]);
  });

  // If the block has a main title above accordion (Contact Information)
  const mainTitle = element.querySelector('h2.optSubTitle');
  const block = WebImporter.DOMUtils.createTable(rows, document);
  if (mainTitle) {
    // Insert the heading directly above the table
    const wrapper = document.createElement('div');
    wrapper.appendChild(mainTitle);
    wrapper.appendChild(block);
    element.replaceWith(wrapper);
  } else {
    element.replaceWith(block);
  }
}
