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

import { TransformHook } from './transform.js';

/**
 *  Cleanup unwanted attributes in element and children
  * @param {Element} e
*/
function cleanUpAttributes(e) {
  e.removeAttribute('class');
  e.removeAttribute('style');
  const attrNames = e.getAttributeNames().filter((a) => a.startsWith('data-') || a.startsWith('aria-'));
  if (attrNames.length > 0) {
    attrNames.forEach((a) => {
      e.removeAttribute(a);
    });
  }
  [...e.children].forEach((child) => cleanUpAttributes(child));
}

export default function transform(hookName, element) {
  if (hookName === TransformHook.beforeParse) {
    // remove non-content elements
    WebImporter.DOMUtils.remove(element, [
      'style',
      'script',
      'noscript',
    ]);
  }
  if (hookName === TransformHook.afterTransform) {
    // cleanup unwanted attributes
    cleanUpAttributes(element);
    // remove remaining unwanted elements
    WebImporter.DOMUtils.remove(element, [
      'source',
      'iframe',
      'link',
    ]);
  }
}
