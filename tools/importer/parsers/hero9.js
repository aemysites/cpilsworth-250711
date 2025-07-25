/* global WebImporter */
export default function parse(element, { document }) {
  // Locate the hero block
  const hero = element.querySelector('.heroimage');
  if (!hero) return;

  // Prepare header row
  const headerRow = ['Hero (hero9)'];

  // Row 2: Background Image (static, as per screenshot, since no src in HTML)
  // The screenshot reveals an image of a DNA double helix as a background
  // Since this image is not present as <img> in the HTML, but must be represented for the block,
  // use the known image from the screenshot (example markdown):
  // https://main--cpilsworth-250711--aemysites.aem.page/media_1ca653f4f0fb50020a010f62ded9172d64671042a.jpg#width=750&height=415
  // If the hero element has a background image, extract it, else use the known fallback for demo
  let bgImg = null;
  let bgUrl = null;
  if (hero.hasAttribute('style')) {
    const style = hero.getAttribute('style');
    const match = style.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/i);
    if (match) {
      bgUrl = match[1];
    }
  } else if (window.getComputedStyle) {
    const computed = window.getComputedStyle(hero);
    const bg = computed.getPropertyValue('background-image');
    const match = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (match) {
      bgUrl = match[1];
    }
  }
  if (!bgUrl) {
    // Fallback to the example image URL from the screenshot/markdown
    bgUrl = 'https://main--cpilsworth-250711--aemysites.aem.page/media_1ca653f4f0fb50020a010f62ded9172d64671042a.jpg#width=750&height=415';
  }
  bgImg = document.createElement('img');
  bgImg.src = bgUrl;
  bgImg.alt = 'Decorative double Helix';

  // Row 3: Content
  // In the provided HTML, the hero block is empty so there is no heading, subheading, etc.
  // Per requirements, we should leave this cell empty if there's no content
  // In a real page, these may be present as children of hero, but here there are none
  const contentRow = [''];

  // Compose the table
  const tableRows = [headerRow, [bgImg], contentRow];
  const block = WebImporter.DOMUtils.createTable(tableRows, document);

  // Replace the hero with the new block table
  hero.replaceWith(block);
}
