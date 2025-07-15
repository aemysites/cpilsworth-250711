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

function isDate(str) {
  if (typeof str !== 'string') return false;
  const date = new Date(str);
  return !Number.isNaN(Number(date));
}

/**
 * Parse the document for metadata cell values.
 *
 * @param {HTMLElement} element The root query element.
 * @param {Object} props Additional parse function props.
 */
export default function parse(element, { document }) {
  const meta = WebImporter.Blocks.getMetadata(document) || {};
  Object.entries(meta).forEach(([key, value]) => {
    // use first image
    if (key === 'Image') {
      const [img1] = value.src.split(',');
      // eslint-disable-next-line no-param-reassign
      value.src = img1;
    }
    // convert dates
    if (isDate(value)) {
      meta[key] = new Date(value).toISOString().slice(0, 10);
    }
  });
  // create the block
  const block = WebImporter.Blocks.createBlock(document, {
    name: 'Metadata',
    cells: meta,
  });
  element.append(block);
}
