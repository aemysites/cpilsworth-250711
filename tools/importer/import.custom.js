
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

/**
 * A map of custom parser names to imported parser functions.
 *
 * eg.
 * {
 *   myParser: customParser1,
 * }
 */
export const customParsers = {};

/**
 * An array of custom page elements to parse.
 * The name is the parser name.
 * If the element is a string, it will be used as a selector to the element to parse.
 * If the element is not provided, the parser will be applied to the main element.
 *
 * eg.
 * [
 *   { name: 'myParser', element: 'selector' },
 * ]
 */
export const customElements = [];

/**
 * Custom transformer to convert SVGs to PNG images after all other transforms.
 * Replaces each SVG with an <img> using a data URL.
 */
function svgToPngTransformer(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;
  const svgs = element.querySelectorAll('svg');
  svgs.forEach((svg) => {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
    const img = svg.ownerDocument.createElement('img');
    img.src = svgDataUrl;
    svg.replaceWith(img);
  });
}

export const customTransformers = {
  svgToPng: svgToPngTransformer,
};
