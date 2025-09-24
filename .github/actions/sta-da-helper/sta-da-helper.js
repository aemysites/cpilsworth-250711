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

import core from '@actions/core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Import the shared IMS token helper
import { getAccessTokenWithFallback } from './ims-token-helper.js';

/**
 * Get the org and site from the target URL.
 * @param {string} target - The target URL.
 * @returns {Object} - The org and site.
 * @throws {Error} - If the URL is invalid.
 */
function getOrgAndSiteFromTargetUrl(target) {
  try {
    const url = new URL(target);
    const pathSegments = url.pathname.split('/').filter((segment) => segment.length > 0);

    // last two segments are the org and site
    if (pathSegments.length >= 2) {
      const site = pathSegments[pathSegments.length - 1];
      const org = pathSegments[pathSegments.length - 2];
      return { org, site };
    } else {
      throw new Error('Target url does not contain enough path segments to determine org and site');
    }
  } catch (error) {
    throw new Error(`Error parsing target URL: ${error.message}. Target url: ${target}`);
  }
}

/**
 * Upload the content to DA.
 * @param {string} contentPath - The path to the content folder.
 * @param {string} target - The target URL (DA URL).
 * @param {string} token - The token to use to upload to DA.
 * @param {boolean} skipAssets - Whether to skip assets.
 * @returns {Promise<string[]>} - Returns the list of files that were uploaded.
 * @throws {Error} - If the upload fails.
 */
async function uploadToDa(contentPath, target, token, skipAssets) {
  const { org, site } = getOrgAndSiteFromTargetUrl(target);

  return new Promise((resolve, reject) => {
    const args = [
      '@adobe/aem-import-helper',
      'da',
      'upload',
      '--org', org,
      '--site', site,
      '--da-folder', `${contentPath}/da`,
      '--asset-list', `${contentPath}/asset-list.json`,
    ];

    // Only pass token if available
    if (token) {
      args.push('--token', token);
    }

    if (skipAssets) {
      args.push('--skip-assets');
    }

    core.info('Running command:');
    const argsSafe = token ? args.filter((arg) => arg !== token) : args;
    core.info(`${JSON.stringify(argsSafe, null, 2)}`);

    const child = spawn('npx', args, {
      stdio: ['inherit', 'inherit', 'pipe'], // Pipe stderr to capture errors
      shell: true, // Required for `npx` to work correctly in some environments
    });

    let errorOutput = '';
    child.stderr.on('data', (data) => {
      core.info(data.toString());
      errorOutput = data.toString(); // Only save the last line (real error)
    });

    child.on('exit', (code) => {
      if (code === 0) {
        // now that our upload was complete, collect all files
        // recursively from the ${contentPath}/da
        const entries = fs.readdirSync(path.join(contentPath, 'da'), {
          recursive: true,
          withFileTypes: true,
        });

        const paths = entries
          .filter((entry) => entry.isFile())
          .map((entry) => {
            const fullPath = path.join(entry.parentPath, entry.name);
            return `/${fullPath.replace(/^.*?da\//, '')}`;
          });
        resolve(paths);
      } else {
        reject(new Error(`sta-da-helper failed. Error: ${errorOutput}`));
      }
    });
  });
}

/**
 * Validate that the zip content contains what we expect, it should have a folder called da,
 * and a file called asset-list.json.
 * @param {string} contentPath - The path to the zip content.
 * @returns {void} - Throws an error if the content is missing.
 */
function checkForRequiredContent(contentPath) {
  const daFolder = path.join(contentPath, 'da');
  const assetListFile = path.join(contentPath, 'asset-list.json');

  if (!fs.existsSync(daFolder)) {
    throw new Error('DA folder not found');
  }

  if (!fs.existsSync(assetListFile)) {
    throw new Error('asset-list.json file not found');
  }
}

/**
* Main function for the GitHub Action.
*
* Depending on the provided operation, different outputs are set:
* All operations can set the error_message output.
*
* |---------------------------------------------------------------------|
* | operation          | output                                         |
* |---------------------------------------------------------------------|
* | upload             | paths - the list of files that were uploaded   |
* |---------------------------------------------------------------------|
* |  *                 | error_message - string describing the error    |
* |---------------------------------------------------------------------|
*
*/
export async function run() {
  const operation = core.getInput('operation');

  if (operation === 'upload') {
    // the target to upload to
    const target = core.getInput('target');

    // this is the folder that contains the extracted zip content
    const contentPath = core.getInput('content_path');

    // aem-import-helper can skip assets if needed
    const skipAssets = core.getBooleanInput('skip_assets');

    try {
      // Get access token with fallback logic
      const accessToken = await getAccessTokenWithFallback();

      checkForRequiredContent(contentPath);
      const files = await uploadToDa(contentPath, target, accessToken, skipAssets);
      core.setOutput('paths', files);
    } catch (error) {
      core.error(`DA Error: ${error.message}`);
      core.setOutput('error_message', `❌ Error during DA upload: ${error.message}`);
    }
  } else {
    core.error(`Invalid operation: ${operation}. Supported operations are 'upload'.`);
  }
}

await run();
