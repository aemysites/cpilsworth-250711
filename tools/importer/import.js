/*
 * Copyright 2024 Adobe. All rights reserved.
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
/* eslint-disable no-console */
import hero6Parser from './parsers/hero6.js';
import accordion7Parser from './parsers/accordion7.js';
import hero1Parser from './parsers/hero1.js';
import columns12Parser from './parsers/columns12.js';
import accordion3Parser from './parsers/accordion3.js';
import hero8Parser from './parsers/hero8.js';
import columns15Parser from './parsers/columns15.js';
import columns16Parser from './parsers/columns16.js';
import cards13Parser from './parsers/cards13.js';
import cards10Parser from './parsers/cards10.js';
import accordion18Parser from './parsers/accordion18.js';
import columns20Parser from './parsers/columns20.js';
import hero19Parser from './parsers/hero19.js';
import hero23Parser from './parsers/hero23.js';
import hero9Parser from './parsers/hero9.js';
import hero21Parser from './parsers/hero21.js';
import table26Parser from './parsers/table26.js';
import hero17Parser from './parsers/hero17.js';
import accordion27Parser from './parsers/accordion27.js';
import columns11Parser from './parsers/columns11.js';
import cardsNoImages32Parser from './parsers/cardsNoImages32.js';
import cardsNoImages29Parser from './parsers/cardsNoImages29.js';
import accordion30Parser from './parsers/accordion30.js';
import hero28Parser from './parsers/hero28.js';
import cards25Parser from './parsers/cards25.js';
import accordion33Parser from './parsers/accordion33.js';
import accordion34Parser from './parsers/accordion34.js';
import accordion35Parser from './parsers/accordion35.js';
import cards36Parser from './parsers/cards36.js';
import columns38Parser from './parsers/columns38.js';
import columns40Parser from './parsers/columns40.js';
import hero41Parser from './parsers/hero41.js';
import accordion14Parser from './parsers/accordion14.js';
import cards43Parser from './parsers/cards43.js';
import columns44Parser from './parsers/columns44.js';
import hero22Parser from './parsers/hero22.js';
import columns37Parser from './parsers/columns37.js';
import accordion39Parser from './parsers/accordion39.js';
import columns31Parser from './parsers/columns31.js';
import hero4Parser from './parsers/hero4.js';
import columns5Parser from './parsers/columns5.js';
import columns42Parser from './parsers/columns42.js';
import headerParser from './parsers/header.js';
import metadataParser from './parsers/metadata.js';
import cleanupTransformer from './transformers/cleanup.js';
import imageTransformer from './transformers/images.js';
import linkTransformer from './transformers/links.js';
import sectionsTransformer from './transformers/sections.js';
import { TransformHook } from './transformers/transform.js';
import { customParsers, customTransformers, customElements } from './import.custom.js';
import {
  generateDocumentPath,
  handleOnLoad,
  mergeInventory,
} from './import.utils.js';

const parsers = {
  metadata: metadataParser,
  hero6: hero6Parser,
  accordion7: accordion7Parser,
  hero1: hero1Parser,
  columns12: columns12Parser,
  accordion3: accordion3Parser,
  hero8: hero8Parser,
  columns15: columns15Parser,
  columns16: columns16Parser,
  cards13: cards13Parser,
  cards10: cards10Parser,
  accordion18: accordion18Parser,
  columns20: columns20Parser,
  hero19: hero19Parser,
  hero23: hero23Parser,
  hero9: hero9Parser,
  hero21: hero21Parser,
  table26: table26Parser,
  hero17: hero17Parser,
  accordion27: accordion27Parser,
  columns11: columns11Parser,
  cardsNoImages32: cardsNoImages32Parser,
  cardsNoImages29: cardsNoImages29Parser,
  accordion30: accordion30Parser,
  hero28: hero28Parser,
  cards25: cards25Parser,
  accordion33: accordion33Parser,
  accordion34: accordion34Parser,
  accordion35: accordion35Parser,
  cards36: cards36Parser,
  columns38: columns38Parser,
  columns40: columns40Parser,
  hero41: hero41Parser,
  accordion14: accordion14Parser,
  cards43: cards43Parser,
  columns44: columns44Parser,
  hero22: hero22Parser,
  columns37: columns37Parser,
  accordion39: accordion39Parser,
  columns31: columns31Parser,
  hero4: hero4Parser,
  columns5: columns5Parser,
  columns42: columns42Parser,
  ...customParsers,
};

const transformers = {
  cleanup: cleanupTransformer,
  images: imageTransformer,
  links: linkTransformer,
  sections: sectionsTransformer,
  ...customTransformers,
};

// Additional page elements to parse that are not included in the inventory
const pageElements = [{ name: 'metadata' }, ...customElements];

WebImporter.Import = {
  findSiteUrl: (instance, siteUrls) => (
    siteUrls.find(({ id }) => id === instance.urlHash)
  ),
  transform: (hookName, element, payload) => {
    // perform any additional transformations to the page
    Object.values(transformers).forEach((transformerFn) => (
      transformerFn.call(this, hookName, element, payload)
    ));
  },
  getParserName: ({ name, key }) => key || name,
  getElementByXPath: (document, xpath) => {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );
    return result.singleNodeValue;
  },
  getFragmentXPaths: (
    { urls = [], fragments = [] },
    sourceUrl = '',
  ) => (fragments.flatMap(({ instances = [] }) => instances)
    .filter((instance) => {
      // find url in urls array
      const siteUrl = WebImporter.Import.findSiteUrl(instance, urls);
      if (!siteUrl) {
        return false;
      }
      return siteUrl.url === sourceUrl;
    })
    .map(({ xpath }) => xpath)),
};

/**
* Page transformation function
*/
function transformPage(main, { inventory, ...source }) {
  const { urls = [], blocks: inventoryBlocks = [] } = inventory;
  const { document, params: { originalURL } } = source;

  // get fragment elements from the current page
  const fragmentElements = WebImporter.Import.getFragmentXPaths(inventory, originalURL)
    .map((xpath) => WebImporter.Import.getElementByXPath(document, xpath))
    .filter((el) => el);

  // get dom elements for each block on the current page
  const blockElements = inventoryBlocks
    .flatMap((block) => block.instances
      .filter((instance) => WebImporter.Import.findSiteUrl(instance, urls)?.url === originalURL)
      .map((instance) => ({
        ...block,
        uuid: instance.uuid,
        section: instance.section,
        element: WebImporter.Import.getElementByXPath(document, instance.xpath),
      })))
    .filter((block) => block.element);

  const defaultContentElements = inventory.outliers
    .filter((instance) => WebImporter.Import.findSiteUrl(instance, urls)?.url === originalURL)
    .map((instance) => ({
      ...instance,
      element: WebImporter.Import.getElementByXPath(document, instance.xpath),
    }));

  // remove fragment elements from the current page
  fragmentElements.forEach((element) => {
    if (element) {
      element.remove();
    }
  });
  
  // before page transform hook
  WebImporter.Import.transform(TransformHook.beforePageTransform, main, { ...source });

  // transform all elements using parsers
  [...defaultContentElements, ...blockElements, ...pageElements]
    // sort elements by order in the page
    .sort((a, b) => (a.uuid ? parseInt(a.uuid.split('-')[1], 10) - parseInt(b.uuid.split('-')[1], 10) : 999))
    .forEach((item, idx, arr) => {
      const { element = main, ...pageBlock } = item;
      const isFragmentElement = fragmentElements.includes(item.element);
      if (isFragmentElement) {
        return;
      }
      const parserName = WebImporter.Import.getParserName(pageBlock);
      const parserFn = parsers[parserName];
      try {
        let parserElement = element;
        if (typeof parserElement === 'string') {
          parserElement = main.querySelector(parserElement);
        }
        // before parse hook
        WebImporter.Import.transform(
          TransformHook.beforeParse,
          parserElement,
          {
            ...source,
            ...pageBlock,
            nextEl: arr[idx + 1],
          },
        );
        // parse the element
        if (parserFn) {
          parserFn.call(this, parserElement, { ...source });
        }
        // after parse hook
        WebImporter.Import.transform(
          TransformHook.afterParse,
          parserElement,
          {
            ...source,
            ...pageBlock,
            nextEl: arr[idx + 1],
          },
        );
      } catch (e) {
        console.warn(`Failed to parse block: ${parserName}`, e);
      }
    });
}

/**
* Fragment transformation function
*/
function transformFragment(main, { fragment, inventory, ...source }) {
  const { document, params: { originalURL } } = source;

  if (fragment.name === 'nav') {
    const navEl = document.createElement('div');

    // get number of blocks in the nav fragment
    const navBlocks = Math.floor(fragment.instances.length / fragment.instances.filter((ins) => ins.uuid.includes('-00-')).length);
    console.log('navBlocks', navBlocks);

    for (let i = 0; i < navBlocks; i += 1) {
      const { xpath } = fragment.instances[i];
      const el = WebImporter.Import.getElementByXPath(document, xpath);
      if (!el) {
        console.warn(`Failed to get element for xpath: ${xpath}`);
      } else {
        navEl.append(el);
      }
    }

    // body width
    const bodyWidthAttr = document.body.getAttribute('data-hlx-imp-body-width');
    const bodyWidth = bodyWidthAttr ? parseInt(bodyWidthAttr, 10) : 1000;

    try {
      const headerBlock = headerParser(navEl, {
        ...source, document, fragment, bodyWidth,
      });
      main.append(headerBlock);
    } catch (e) {
      console.warn('Failed to parse header block', e);
    }
  } else {
    (fragment.instances || [])
      .filter((instance) => {
        const siteUrl = WebImporter.Import.findSiteUrl(instance, inventory.urls);
        if (!siteUrl) {
          return false;
        }
        return `${siteUrl.url}#${fragment.name}` === originalURL;
      })
      .map(({ xpath }) => ({
        xpath,
        element: WebImporter.Import.getElementByXPath(document, xpath),
      }))
      .filter(({ element }) => element)
      .forEach(({ xpath, element }) => {
        main.append(element);

        const fragmentBlock = inventory.blocks
          .find(({ instances }) => instances.find((instance) => {
            const siteUrl = WebImporter.Import.findSiteUrl(instance, inventory.urls);
            return `${siteUrl.url}#${fragment.name}` === originalURL && instance.xpath === xpath;
          }));

        if (!fragmentBlock) return;
        const parserName = WebImporter.Import.getParserName(fragmentBlock);
        const parserFn = parsers[parserName];
        if (!parserFn) return;
        try {
          parserFn.call(this, element, source);
        } catch (e) {
          console.warn(`Failed to parse block: ${fragmentBlock.key}, with xpath: ${xpath}`, e);
        }
      });
  }
}

export default {
  onLoad: async (payload) => {
    await handleOnLoad(payload);
  },

  transform: async (source) => {
    const { document, params: { originalURL } } = source;

    /* eslint-disable-next-line prefer-const */
    let publishUrl = window.location.origin;
    // $$publishUrl = '{{{publishUrl}}}';

    let inventory = null;
    // $$inventory = {{{inventory}}};
    if (!inventory) {
      const siteUrlsUrl = new URL('/tools/importer/site-urls.json', publishUrl);
      const inventoryUrl = new URL('/tools/importer/inventory.json', publishUrl);
      try {
        // fetch and merge site-urls and inventory
        const siteUrlsResp = await fetch(siteUrlsUrl.href);
        const inventoryResp = await fetch(inventoryUrl.href);
        const siteUrls = await siteUrlsResp.json();
        inventory = await inventoryResp.json();
        inventory = mergeInventory(siteUrls, inventory, publishUrl);
      } catch (e) {
        console.error('Failed to merge site-urls and inventory');
      }
      if (!inventory) {
        return [];
      }
    }

    let main = document.body;

    WebImporter.DOMUtils.remove(main, [
      '.new-news-alert',
      '.sharedHeader',
      '.skiptocontent',
      '.search-modal',
    ]);

    // before transform hook
    WebImporter.Import.transform(TransformHook.beforeTransform, main, { ...source, inventory });

    // perform the transformation
    let path = null;
    const sourceUrl = new URL(originalURL);
    const fragName = sourceUrl.hash ? sourceUrl.hash.substring(1) : '';
    if (fragName) {
      // fragment transformation
      const fragment = inventory.fragments.find(({ name }) => name === fragName);
      if (!fragment) {
        return [];
      }
      main = document.createElement('div');
      transformFragment(main, { ...source, fragment, inventory });
      path = fragment.path;
    } else {
      // page transformation
      transformPage(main, { ...source, inventory });
      path = generateDocumentPath(source, inventory);
    }

    // after transform hook
    WebImporter.Import.transform(TransformHook.afterTransform, main, { ...source, inventory });

    return [{
      element: main,
      path,
    }];
  },
};
