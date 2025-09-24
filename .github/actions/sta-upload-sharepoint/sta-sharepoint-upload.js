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
import fs from 'fs';
// eslint-disable-next-line import/no-unresolved
import mime from 'mime-types';
import path from 'path';

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

// Retry configuration - can be overridden via environment variables
const UPLOAD_MAX_RETRIES = parseInt(process.env.STA_UPLOAD_MAX_RETRIES, 10) || 2;
const UPLOAD_BASE_DELAY = parseInt(process.env.STA_UPLOAD_BASE_DELAY, 10) || 1000;

// Upload report for this invocation.  Global to simplify recursion.
const uploadReport = {
  uploads: 0,
  uploadList: [],
  failures: 0,
  failedList: [],
  failedFolderCreations: 0,
  lockedFiles: 0,
};

// Source structure for this invocation.  Global to simplify recursion.
const sourceStructure = {
  folders: [],
  files: [],
};

// Sleep function using Promise
async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Custom error class that preserves the HTTP response for retry logic
 */
class GraphApiError extends Error {
  constructor(message, response) {
    super(message);
    this.name = 'GraphApiError';
    this.response = response;
  }
}

/**
 * Get delay from Retry-After header
 * @param {Response} response - Fetch response object
 * @returns {number} Delay in milliseconds, or null if header is not present/invalid
 */
function getRetryAfterDelay(response) {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) {
    return null;
  }

  let millisToSleep = Math.round(parseFloat(retryAfter) * 1000);
  if (Number.isNaN(millisToSleep)) {
    const parsedDate = Date.parse(retryAfter);
    if (Number.isNaN(parsedDate)) {
      return null; // Invalid date string
    }
    millisToSleep = Math.max(0, parsedDate - Date.now());
  }

  return millisToSleep > 0 ? millisToSleep : null;
}

/**
 * Utility function to retry upload operations with exponential backoff for transient errors
 * @param {Function} operation - Async function that performs the upload operation
 * @param {string} context - Context for logging (e.g., file path)
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<any>} - The result of the operation
 */
async function retryUploadOperation(operation, context, maxRetries = UPLOAD_MAX_RETRIES) {
  const retryableStatuses = [429, 500, 502, 503, 504];
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const result = await operation();
      if (attempt > 0) {
        core.info(`✓ Upload operation succeeded on attempt ${attempt + 1} for ${context}`);
      }
      return result;
    } catch (error) {
      lastError = error;

      // Check if this is a retryable error
      let isRetryable = false;
      let retryAfterDelay = null;

      if (error.name === 'GraphApiError' && error.response) {
        // Graph API errors with response object
        isRetryable = retryableStatuses.includes(error.response.status);
        if (isRetryable) {
          retryAfterDelay = getRetryAfterDelay(error.response);
        }
      } else if (error.message && error.message.includes('fetch failed')) {
        // Network errors
        isRetryable = true;
      } else {
        // Legacy: Check for Graph API errors with retryable status codes in the message
        const isRetryableError = error.message && (
          retryableStatuses.some((status) => error.message.includes(`Graph API error ${status}`))
        );
        isRetryable = isRetryableError;
      }

      if (attempt < maxRetries && isRetryable) {
        // Calculate delay: prefer Retry-After header, fall back to exponential backoff
        const waitTime = retryAfterDelay !== null
          ? retryAfterDelay
          : UPLOAD_BASE_DELAY * (2 ** attempt);
        const delaySource = retryAfterDelay !== null ? 'Retry-After header' : 'exponential backoff';

        core.info(`⏳ Upload operation failed for ${context}. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries + 1}) using ${delaySource}: ${error.message}`);
        await sleep(waitTime);
      } else {
        // Non-retryable error or max retries exceeded
        break;
      }
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error(`Upload operation failed after ${maxRetries + 1} attempts for ${context}`);
}

async function graphFetch(token, endpoint, initOptions) {
  const init = initOptions || {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  };

  core.debug(`Accessing Graph API endpoint: ${GRAPH_API}${endpoint}`);
  const res = await fetch(
    `${GRAPH_API}${endpoint}`,
    init,
  );

  if (!res.ok) {
    // Count locked files if the response status is 423.
    if (res.status === 423) {
      uploadReport.lockedFiles += 1;
    }
    const errorText = await res.text();
    throw new GraphApiError(`Graph API error ${res.status}: ${errorText}`, res);
  }

  return res.json();
}

/**
 * Graph API fetch with retry logic for transient failures.
 * @param {string} token - Access token
 * @param {string} endpoint - API endpoint
 * @param {Object} initOptions - Fetch options
 * @returns {Promise<Object>} - JSON response
 */
async function graphFetchWithRetry(token, endpoint, initOptions) {
  return retryUploadOperation(
    () => graphFetch(token, endpoint, initOptions),
    endpoint,
  );
}

/**
 * Upload file with retry logic for transient failures.
 * @param {string} accessToken SharePoint access token
 * @param {string} driveId Destination root drive id
 * @param {string} folderId Destination folder id within the drive id root
 * @param {Object.<string, string, string>} file The file to upload
 * @returns {Promise<boolean>} The result of the upload operation.
 */
async function uploadFileWithRetry(accessToken, driveId, folderId, file) {
  try {
    await retryUploadOperation(
      async () => {
        // Need to recreate the file stream for each retry attempt
        const fileStream = fs.createReadStream(file.path);
        const mimeType = mime.lookup(file.path) || 'application/octet-stream';

        core.debug(`Uploading ${file.path} with mime type ${mimeType}`);

        await graphFetch(
          accessToken,
          `/drives/${driveId}/items/${folderId}:${file.relative}:/content`,
          {
            method: 'PUT',
            body: fileStream,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
              'Content-Type': mimeType,
            },
            duplex: 'half', // Required for streaming requests
          },
        );

        core.debug(`File ${file.path} uploaded successfully.`);
      },
      file.path,
    );
    return true;
  } catch (error) {
    core.warning(`Failed to upload file ${file.path}: ${error.message}`);
    return false;
  }
}

/**
 * Create the folders in SharePoint if they don't exist.
 * @param {string} accessToken
 * @param {string} driveId The root drive id for the SharePoint site
 * @param {string} folderId The folder id for the SharePoint site, under the drive.
 * @param {Object.<string, string>} sourceFolders The folders to create (name and
 *                                                relative path to the mountpoint)
 * @param {number} delay The delay, in milliseconds between folder creations
 * @returns {Promise<boolean>}
 */
async function createFoldersIfNecessary(
  accessToken,
  driveId,
  folderId,
  sourceFolders,
  delay,
) {
  const folderMap = new Map();
  folderMap.set('', folderId);

  for (const folder of sourceFolders) {
    const segments = folder.path.split('/');
    // Current path is the path as we increment through the segments.
    let currentPath;
    // The parent id is the id of the folder we are creating the next segment in.
    let parentId = folderId;

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (folderMap.has(currentPath)) {
        parentId = folderMap.get(currentPath);
      } else {
        // Create/check folder
        const url = `${GRAPH_API}/drives/${driveId}/items/${parentId}/children`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: segment,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          folderMap.set(currentPath, data.id);
          parentId = data.id;
        } else if (res.status === 409) {
          // Already exists - get its data.
          const existing = await graphFetchWithRetry(
            accessToken,
            `/drives/${driveId}/items/${parentId}/children?$filter=name eq '${segment}'`,
          );
          if (!existing?.value || existing.value.length === 0) {
            core.warning(`Failed to get data for existing folder ${currentPath}: ${res.status} ${res.statusText}`);
            throw new Error(`Failed to get data for existing folder ${currentPath}. Upload is aborted.`);
          } else if (existing.value.length !== 1) {
            core.warning(`Found multiple existing folders for ${currentPath}.`);
            throw new Error(`Found multiple existing folders for ${currentPath}. Upload is aborted.`);
          }
          const { id } = existing.value[0];
          folderMap.set(currentPath, id);
          parentId = id;
          await sleep(delay);
        } else {
          core.warning(`Failed to create folder ${currentPath}: ${res.status} ${res.statusText}`);
          uploadReport.failedFolderCreations += 1;
          throw new Error(`Failed to create folder ${currentPath}. Upload is aborted.`);
        }
      }
    }
  }
}

/**
 * Recursively get the structure of the source (zip) folder.  This is used
 * to determine the folder structure to create in SharePoint and simplify
 * the upload of files, using their full path, knowing the destination
 * folders already exist.
 * @param {string} srcFolder
 * @param {boolean} isTopLevel If true, this is the top-level folder, and we
 *                           expect at least one item to be present.
 * @returns {Promise<*>}
 */
async function populateSourceStructure(srcFolder, isTopLevel = false) {
  const entries = fs.readdirSync(srcFolder, { withFileTypes: true });
  core.debug(`Reading source items from ${srcFolder}`);

  if (isTopLevel && entries.length === 0) {
    throw new Error(`No upload items found in ${srcFolder}. Ensure the zip file contains valid content.`);
  }

  for (const entry of entries) {
    const fullPath = path.join(srcFolder, entry.name);

    if (entry.isDirectory()) {
      core.debug(`> Recording directory and recursing it: ${fullPath}`);
      sourceStructure.folders.push({
        name: entry.name,
        path: fullPath,
      });
      await populateSourceStructure(fullPath);
    } else if (entry.isFile()) {
      core.debug(`> Adding file: ${fullPath}`);
      sourceStructure.files.push({
        name: entry.name,
        path: fullPath,
      });
    } else {
      core.debug(`> Skipping non-file/non-directory item: ${fullPath}`);
    }
  }

  core.debug(`Done with ${srcFolder}`);
}

/**
 * Upload all the files from a source folder to SharePoint.  For each sub-folder
 * encountered, assume it is created in SharePoint, and upload that folder's
 * contents.
 * @param {string} accessToken SharePoint access token
 * @param {string} driveId Destination root drive id
 * @param {string} folderId Destination folder id within the drive id root
 * @param {Object.<string, string, string>} sourceFiles The file name, full local and
 *                                                      relative target path to each
 *                                                      file to be uploaded.
 * @param {number} delay The delay, in milliseconds
 * @returns {Promise<void>}
 */
async function uploadFiles(accessToken, driveId, folderId, sourceFiles, delay) {
  for (const item of sourceFiles) {
    const success = await uploadFileWithRetry(accessToken, driveId, folderId, item);
    if (success) {
      uploadReport.uploads += 1;
      uploadReport.uploadList.push(item.relative);
    } else {
      uploadReport.failures += 1;
      uploadReport.failedList.push(item.path);
    }

    await sleep(delay);
  }
}

/**
 * Given a folder full of import content to upload, and the necessary
 * @returns {Promise<void>}
 */
export async function run() {
  const accessToken = core.getInput('access_token');
  const driveId = core.getInput('drive_id'); // Shared Documents
  const folderId = core.getInput('folder_id'); // sites/esaas-demos/andrew-top
  const zipContentsPath = core.getInput('zip_contents_path');
  const delayInput = core.getInput('delay');
  const delay = parseInt(delayInput, 10);
  const docsDir = `${zipContentsPath}/docx`;

  core.info(`Upload files from ${docsDir} with a delay of ${delay} milliseconds between uploads.`);

  try {
    if (!fs.existsSync(docsDir)) {
      throw new Error(`Directory ${docsDir} was not found and no files were uploaded. Check zip contents and ensure it contains valid content.`);
    }

    // Get the source structure (folders, files, etc.).
    await populateSourceStructure(docsDir, true);

    // Now create the folder structure in SharePoint, if necessary.
    core.info(`Creating ${JSON.stringify(sourceStructure.folders.length)} folders, if necessary.`);
    await createFoldersIfNecessary(
      accessToken,
      driveId,
      folderId,
      sourceStructure.folders.map((folder) => ({
        name: folder.name,
        path: folder.path.replace(docsDir, ''),
      })),
      delay,
    );

    // Now upload each file, knowing the destination folders already exist.
    core.info(`Uploading ${sourceStructure.files.length} files.`);
    await uploadFiles(
      accessToken,
      driveId,
      folderId,
      sourceStructure.files.map((nextFile) => ({
        name: nextFile.name,
        path: nextFile.path,
        relative: nextFile.path.replace(docsDir, ''),
      })),
      delay,
    );

    if (uploadReport.failures > 0 || uploadReport.failedList.length > 0) {
      core.setOutput('error_message', '❌ Upload Error: Some uploads failed. Check the workflow for more details.');
    }
  } catch (error) {
    core.warning(`Failed to upload the files: ${error.message}`);
    core.setOutput('error_message', `❌ Upload Error: ${error.message}`);
  } finally {
    core.info(`Upload report: ${JSON.stringify(uploadReport)}`);
    core.setOutput('upload_successes', String(uploadReport.uploads));
    core.setOutput('upload_list', String(uploadReport.uploadList.join(', ')));
    core.setOutput('upload_failures', String(uploadReport.failures));
    core.setOutput('upload_failed_list', uploadReport.failedList.join(', '));
    core.setOutput('upload_failed_locked', String(uploadReport.lockedFiles));
  }
}

await run();

// Export functions for testing
export { retryUploadOperation, graphFetchWithRetry, uploadFileWithRetry };
