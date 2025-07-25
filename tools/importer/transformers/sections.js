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

let currentSection = null;

function buildSectionMetadataTable(section, document) {
  const smCells = [
    ['Section Metadata'],
    ['style', section],
  ];
  return WebImporter.DOMUtils.createTable(smCells, document);
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeParse) {
    if (payload.section) {
      // handle before element part of the section
      if (!currentSection && (currentSection !== payload.section)) {
        element.before(payload.document.createElement('hr'));
      }

      // handle after element part of the section
      let doCloseSection = false;
      if (payload.nextEl) {
        if (payload.nextEl.section) {
          if (payload.nextEl.section !== payload.section) {
            doCloseSection = true;
          }
        } else {
          doCloseSection = true;
        }
      }

      if (doCloseSection) {
        element.after(payload.document.createElement('hr'));
        element.after(buildSectionMetadataTable(payload.section, payload.document));
      }

      currentSection = payload.section;
    } else {
      currentSection = null;
    }
  }
}
