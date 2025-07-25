/* global WebImporter */
export default function parse(element, { document }) {
  // Find the carousel root
  const carousel = element.querySelector('.cmp-carousel');
  if (!carousel) return;

  // Get all slides
  const slides = Array.from(carousel.querySelectorAll(':scope > .cmp-carousel__content > .cmp-carousel__item'));
  if (!slides.length) return;

  // Find the currently active slide, or fallback to the first
  const activeSlide = slides.find(slide => !slide.hasAttribute('aria-hidden') || slide.getAttribute('aria-hidden') === 'false') || slides[0];

  // Get hero image element if present
  const imgEl = activeSlide.querySelector('.fullWidthImgOverlay img');

  // Get the content block (headings, paragraphs, CTAs, etc.)
  // Use the SECTION under .heroCompWrapper to keep all text & actions
  let contentBlock = '';
  const wrapper = activeSlide.querySelector('.container_24.heroCompWrapper');
  if (wrapper) {
    const section = wrapper.querySelector('section');
    if (section) {
      // Reference the existing section node (do NOT clone, per requirements)
      contentBlock = section;
    }
  }

  // Generate table structure to match the example: 1 column, 3 rows
  const cells = [
    ['Hero (hero28)'],
    [imgEl || ''],
    [contentBlock || '']
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);

  // Replace the original element with the constructed table block
  element.replaceWith(table);
}
