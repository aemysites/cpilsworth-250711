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
import { pathToFileURL } from 'url';

const HLX_ADM_API = 'https://admin.hlx.page';
const OP_LABEL = {
  preview: 'preview',
  live: 'publish',
  publish: 'publish',
  both: 'preview and/or publish',
};

/**
 * Utility function to retry HTTP operations with exponential backoff for 5xx errors
 * @param {Function} operation - Async function that returns a fetch response
 * @param {string} context - Context for logging (e.g., publishPath)
 * @param {number} maxRetries - Maximum number of retry attempts (default: 5)
 * @returns {Promise<Response>} - The fetch response
 */
async function retryHttpOperation(operation, context, maxRetries = 5) {
  const retryableStatuses = [429, 500, 502, 503, 504];
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await operation();

      // If response is ok or not a retryable error, return it
      if (response.ok || !retryableStatuses.includes(response.status)) {
        if (attempt > 0) {
          if (response.ok) {
            core.info(`✓ HTTP operation succeeded on attempt ${attempt + 1} for ${context}`);
          } else {
            core.info(`✓ HTTP operation was not retried on attempt ${attempt + 1} for ${context}`);
          }
        }
        return response;
      }

      // Handle retryable errors (429, 5xx)
      if (attempt < maxRetries) {
        const retryAfter = response.headers.get('Retry-After');
        let waitTime = 2 ** attempt * 1000; // Exponential backoff: 1s, 2s, 4s, 8s, 16s

        // Respect Retry-After header if present
        if (retryAfter) {
          const retryAfterMs = parseInt(retryAfter, 10) * 1000;
          if (!Number.isNaN(retryAfterMs) && retryAfterMs > 0) {
            waitTime = retryAfterMs;
          }
        }

        core.info(`⏳ HTTP operation failed with ${response.status} for ${context}. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise((resolve) => {
          setTimeout(resolve, waitTime);
        });
        // Continue to next iteration instead of using continue statement
      } else {
        // Max retries exceeded
        core.warning(`❌ HTTP operation failed after ${maxRetries + 1} attempts for ${context}: ${response.status} ${response.statusText}`);
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const waitTime = 2 ** attempt * 1000;
        core.info(`⏳ HTTP operation threw error for ${context}. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`);
        await new Promise((resolve) => {
          setTimeout(resolve, waitTime);
        });
      }
    }
  }

  // If we get here, all retries failed with errors
  throw lastError || new Error(`HTTP operation failed after ${maxRetries + 1} attempts for ${context}`);
}

/**
 * Simple function to remove a path's final extension, if it exists.
 * @param {string} path
 * @returns {string}
 */
function removeExtension(path) {
  const lastSlash = path.lastIndexOf('/');
  const fileName = path.slice(lastSlash + 1);
  const dotIndex = fileName.lastIndexOf('.');

  if (dotIndex === -1) return path; // No extension
  return path.slice(0, lastSlash + 1) + fileName.slice(0, dotIndex);
}

/**
 * Operate (preview or live) on one path, relative to the
 * endpoint (i.e. ${HLX_ADM_API}/${operation}/${owner}/${repo}/${branch}/)
 * @param {string} endpoint
 * @param {string} path
 * @param {string} operation 'preview' or 'live'
 * @returns {Promise<*|boolean>}
 */
async function operateOnPath(endpoint, path, operation = 'preview') {
  let publishPath = path;
  if (path.endsWith('.docx')) {
    publishPath = removeExtension(publishPath);
  } else if (path.endsWith('.xlsx')) {
    publishPath = `${removeExtension(publishPath)}.json`;
  }

  try {
    const resp = await retryHttpOperation(
      () => fetch(`${endpoint}${publishPath}`, {
        method: 'POST',
        body: '{}',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Expose-Headers': 'x-error',
        },
      }),
      publishPath,
    );

    if (!resp.ok) {
      const xError = resp.headers.get('x-error');
      core.debug(`.${operation} operation failed on ${publishPath}: ${resp.status} : ${resp.statusText} : ${xError}`);

      // Check for unsupported media type or 404, and try without an extension
      if (resp.status === 415 || (operation === 'live' && resp.status === 404)) {
        const noExtPath = removeExtension(path);
        // Avoid infinite loop by ensuring the path changed.
        if (noExtPath !== path && noExtPath !== publishPath) {
          core.info(`❓ Failed with an "Unsupported Media" or 404 error. Retrying operation without an extension: ${noExtPath}`);
          return operateOnPath(endpoint, noExtPath, operation);
        }
        core.warning(`❌ Operation failed on extensionless ${publishPath}: ${xError}`);
      } else if (resp.status === 423) {
        core.warning(`❌ Operation failed on ${publishPath}. The file appears locked. Is it being edited? (${xError})`);
      } else {
        core.warning(`❌ Operation failed on ${publishPath}: ${xError}`);
      }
      return false;
    }

    const data = await resp.json();
    core.info(`✓ Operation successful on ${publishPath}: ${data[operation].url}`);
    return true;
  } catch (error) {
    core.warning(`❌ Operation call failed on ${publishPath}: ${error.message}`);
  }

  return false;
}

/**
 * Get the site and drive ID for a SharePoint site.
 * @returns {Promise<void>}
 */
export async function run() {
  const context = core.getInput('context');
  const urlsInput = core.getInput('urls');
  const operationInput = core.getInput('operation') || 'preview';
  const paths = urlsInput.split(',').map((url) => url.trim());
  const operations = [];

  // Set up the operations, as found in the operation url (i.e. preview and/or live).
  if (operationInput === 'preview' || operationInput === 'both') {
    operations.push('preview');
  }
  if (operationInput === 'publish' || operationInput === 'live' || operationInput === 'both') {
    operations.push('live');
  }
  if (operations.length === 0) {
    core.setOutput('error_message', `Invalid operation: ${operationInput}. Supported operations are 'preview', 'publish' or 'both'.`);
    return;
  }

  const { project } = JSON.parse(context);
  const { owner, repo, branch = 'main' } = project;
  if (!owner || !repo || !branch) {
    core.setOutput('error_message', 'Invalid context format.');
    return;
  }

  const operationReport = {
    successes: 0,
    failures: 0,
    failureList: {
      preview: [],
      publish: [],
    },
  };

  core.debug(`URLs: ${urlsInput}`);

  try {
    for (const operation of operations) {
      const operationLabel = OP_LABEL[operation];
      core.info(`Performing ${operationLabel} for ${paths.length} urls using ${owner} : ${repo} : ${branch}.`);

      const endpoint = `${HLX_ADM_API}/${operation}/${owner}/${repo}/${branch}`;

      for (const path of paths) {
        core.debug(`.Performing ${operationLabel} operation on path: ${HLX_ADM_API}/${operation}/${owner}/${repo}/${branch}${path}`);
        const successfullyUploaded = await operateOnPath(endpoint, path, operation);
        if (successfullyUploaded) {
          operationReport.successes += 1;
        } else {
          operationReport.failures += 1;
          operationReport.failureList[operationLabel].push(path);
        }
      }
    }

    core.setOutput('successes', operationReport.successes);
    core.setOutput('failures', operationReport.failures);
    if (operationReport.failures > 0) {
      core.warning(`❌ The paths that failed are: ${JSON.stringify(operationReport.failureList, undefined, 2)}`);
      core.setOutput('error_message', `❌ Error: Failed to ${OP_LABEL[operationInput]} ${operationReport.failures} of ${paths.length} paths.`);
    } else if (operations.length * paths.length !== operationReport.successes) {
      core.warning(`❌ The paths that failed are: ${JSON.stringify(operationReport.failureList, undefined, 2)}`);
      core.setOutput('error_message', `❌ Error: Failed to ${OP_LABEL[operationInput]} all the paths.`);
    }
  } catch (error) {
    core.warning(`❌ Error: ${error.message}`);
    core.setOutput('error_message', `❌ Error: Failed to ${OP_LABEL[operationInput]} all of the paths.`);
  }
}

// Export for testing
export { retryHttpOperation };

// Only run if this is the main module (not being imported for testing)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run();
}
