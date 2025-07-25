/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global WebImporter */

const isVisible = (element) => {
  if (element.closest('[data-hlx-imp-hidden-div]')) return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  return true;
};

const parseDataHlxImpRect = (element) => {
  const rectAttribute = element.closest('div')?.getAttribute('data-hlx-imp-rect');
  if (!rectAttribute) return { x: Infinity, y: Infinity };
  try {
    return JSON.parse(rectAttribute);
  } catch (error) {
    return { x: Infinity, y: Infinity };
  }
};

const brandLogoMapping = [
  {
    checkFn: (e) => {
      // Helper function to check if an element is visible

      const links = [...e.querySelectorAll(`a[href="/"], a[href="${window.location.origin}/"]`)]
        .filter(isVisible);
      return links.reduce((topLeftMost, current) => {
        const currentRect = parseDataHlxImpRect(current.closest('div'));
        const topLeftRect = topLeftMost ? parseDataHlxImpRect(topLeftMost.closest('div')) : { y: Infinity, x: Infinity };

        if (currentRect.y < topLeftRect.y
          || (currentRect.y === topLeftRect.y && currentRect.x < topLeftRect.x)) {
          return current;
        }
        return topLeftMost;
      }, null);
    },
    parseFn: (e, targetEl, bodyWidth, x) => {
      if (bodyWidth && x < bodyWidth / 2) {
        // Create a container for the brand link
        const brandContainer = document.createElement('div');
        brandContainer.append(e);
        targetEl.append(brandContainer);
        return true;
      }
      return false;
    },
  },
  {
    checkFn: (e) => [...e.querySelectorAll('a > picture, a > img')].filter((i) => i.closest('[data-hlx-imp-hidden-div]') === null)[0],
    parseFn: (e, targetEl, bodyWidth, x) => {
      if (bodyWidth && x < bodyWidth / 2) {
        const linkedPictureEl = document.createElement('div');
        const linkEl = e.parentElement;
        let imgEl = e.cloneNode(true);
        if (imgEl.tagName === 'PICTURE') {
          imgEl = imgEl.querySelector('img');
        }
        linkEl.chilren = null;
        linkEl.parentElement.append(linkedPictureEl);
        linkedPictureEl.append(document.createElement('br'));
        linkedPictureEl.append(linkEl);
        linkedPictureEl.prepend(imgEl);
        if (linkEl.textContent.replaceAll(/[\n\t]/gm, '').trim().length === 0) {
          linkEl.textContent = linkEl.href;
        }

        if (linkedPictureEl.closest('li')) {
          const liEl = linkedPictureEl.closest('li');
          targetEl.append(...liEl.children);
          liEl.remove();
        } else {
          targetEl.append(linkedPictureEl);
        }
        return true;
      }
      return false;
    },
  },
  {
    checkFn: (e) => e.querySelector('picture + br + a, img + br + a'),
    parseFn: (e, targetEl, bodyWidth, x) => {
      if (bodyWidth && x < bodyWidth / 2) {
        const imgEl = e.closest('picture, img');
        if (imgEl) {
          if (imgEl.closest('li')) {
            const liEl = imgEl.closest('li');
            targetEl.append(...liEl.children);
            liEl.remove();
          } else {
            targetEl.append(imgEl);
          }
        }
        return true;
      }
      return false;
    },
  },
  {
    checkFn: (e) => e.querySelector('img'),
    parseFn: (e, targetEl, bodyWidth, x) => {
      if (bodyWidth && x < bodyWidth / 2) {
        if (e.closest('li')) {
          const liEl = e.closest('li');
          targetEl.append(...liEl.children);
          liEl.remove();
        } else {
          targetEl.append(e);
        }
        return true;
      }
      return false;
    },
  },
  {
    checkFn: (e, { originURL }) => e.querySelector(`a[href="/"], a[href="${originURL}"], a[href="${originURL}/"]`),
    parseFn: (e, targetEl, bodyWidth, x) => {
      if (bodyWidth && x < bodyWidth / 2) {
        targetEl.append(e);
        return true;
      }
      return false;
    },
  },
  {
    checkFn: () => {
      // fetch favicon
      const resp = fetch('/favicon.ico');
      if (resp && resp.status === 200) {
        const logoEl = document.createElement('img');
        logoEl.src = '/favicon.ico';
        return logoEl;
      }
      return null;
    },
    parseFn: (e, targetEl) => {
      targetEl.append(e);
      return true;
    },
  },
];

function getBrandLogo(rootEl, document, { bodyWidth, originURL }) {
  const brandEl = document.createElement('div');
  brandLogoMapping.some((m) => {
    const logoEl = m.checkFn(rootEl, { originURL });
    if (logoEl) {
      let x = 0;
      try {
        x = JSON.parse(logoEl.closest('div')?.getAttribute('data-hlx-imp-rect')).x;
      } catch (e) {
        console.error('error', e);
      }

      return m.parseFn(logoEl, brandEl, bodyWidth, x);
    }
    return false;
  });

  return brandEl;
}

const navMapping = [
  {
    checkFn: (e) => [...e.querySelectorAll('nav ul, nav ol')]
      .filter((i) => !i.parentElement.closest('ul, ol') && !i.hasAttribute('data-hlx-imp-hidden-div'))
      .reduce((acc, navListEl) => {
        let x = null;
        try {
          x = JSON.parse(navListEl.closest('div')?.getAttribute('data-hlx-imp-rect')).x;
        } catch (err) {
          console.error('error', err);
        }

        if (!acc || (typeof x === 'number' && x < acc.x)) {
          return {
            el: navListEl,
            x,
          };
        }

        return acc;
      }, null),
    parseFn: (e, targetEl) => {
      targetEl.append(e?.el);
      return true;
    },
  },
  {
    checkFn: (e) => [...e.querySelectorAll('nav')]
      .filter((i) => !i.parentElement.closest('nav') && !i.hasAttribute('data-hlx-imp-hidden-div'))
      .reduce((acc, navListEl) => {
        let x = null;
        try {
          x = JSON.parse(navListEl.closest('div')?.getAttribute('data-hlx-imp-rect')).x;
        } catch (err) {
          console.error('error', err);
        }

        if (!acc || (typeof x === 'number' && x < acc.x)) {
          return {
            el: navListEl,
            x,
          };
        }

        return acc;
      }, null),
    parseFn: (e, targetEl) => {
      targetEl.append(e?.el);
      return true;
    },
  },
  {
    checkFn: (e, { bodyWidth }) => [...e.querySelectorAll('ol,ul')].filter((f) => f.parentElement.closest('ol,ul') === null).reduce(
      (acc, listEl) => {
        console.log('listEl', listEl);
        const items = [...listEl.querySelectorAll(':scope > li')].filter((liEl) => {
          liEl.querySelectorAll('script', 'style').forEach((d) => d.remove());
          return liEl.textContent.replaceAll('\n', '').trim().length > 0;
        });

        let x = null;
        try {
          x = JSON.parse(listEl.closest('div')?.getAttribute('data-hlx-imp-rect')).x;
        } catch (err) {
          console.error('error', err);
        }

        console.log('items', items.length, acc?.children.length, x, bodyWidth, listEl);

        if (
          items.length > 1
          && (!acc || items.length > acc.children.length)
          && (!bodyWidth || (typeof x === 'number' && x < bodyWidth / 2))
        ) {
          console.log('found', listEl);
          return listEl;
        }
        return acc;
      },
      null,
    ),
    parseFn: (e, targetEl) => {
      // cleanup
      const elsToDelete = e.querySelectorAll(':scope > :not(li)');
      elsToDelete.forEach((d) => d.remove());

      targetEl.append(e);
      return true;
    },
  },
];

function getNavigation(rootEl, document, { bodyWidth }) {
  const navEl = document.createElement('div');
  navMapping.some((m) => {
    const el = m.checkFn(rootEl, { bodyWidth });
    if (el) {
      console.log('nav', el);
      let x = 0;
      try {
        x = JSON.parse(el.closest('div')?.getAttribute('data-hlx-imp-rect')).x;
      } catch (e) {
        console.error('error', e);
      }

      return m.parseFn(el, navEl, bodyWidth, x);
    }
    return false;
  });

  return navEl;
}

function cleanup(el) {
  el.querySelectorAll('script', 'style').forEach((e) => e.remove());

  el.querySelectorAll('a').forEach((a) => {
    if (a.textContent.replaceAll('\n', '').trim().toLowerCase() === 'skip to content') {
      a.remove();
    }
  });
  return el;
}

export default function headerParser(el, { document, params, bodyWidth }) {
  console.log('headerParser', el, params, bodyWidth);
  const containerEl = document.createElement('div');

  const originURL = new URL(params.originalURL).origin;

  // get brand logo
  const brandEl = getBrandLogo(el, document, { bodyWidth, originURL });

  // get navigation content
  const navEl = getNavigation(el, document, { bodyWidth });

  // get remaining hidden elements
  const hiddenEls = document.createElement('div');
  while (el.querySelector('[data-hlx-imp-hidden-div]')) {
    hiddenEls.append(el.querySelector('[data-hlx-imp-hidden-div]'));
  }

  // get remaining content as tools
  const toolsEl = document.createElement('div');
  toolsEl.append(...el.children);

  containerEl.append(brandEl);
  containerEl.append(document.createElement('hr'));
  containerEl.append(navEl);
  containerEl.append(document.createElement('hr'));
  containerEl.append(toolsEl);

  // put hidden elements in a "hidden" section
  if (hiddenEls.children.length > 0 && hiddenEls.textContent.replaceAll('\n', '').trim().length > 0) {
    containerEl.append(document.createElement('hr'));
    containerEl.append(hiddenEls);
    containerEl.append(WebImporter.DOMUtils.createTable([
      ['section-metadata'],
      ['style', 'hidden'],
    ], document));
  }

  cleanup(containerEl);

  return containerEl;
}
