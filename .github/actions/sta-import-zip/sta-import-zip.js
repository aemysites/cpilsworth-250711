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
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import unzipper from 'unzipper';

const CONTENT_DIR_NAME = 'contents';
const ZIP_NAME = 'import.zip';

// Retry configuration - can be overridden via environment variables
const DOWNLOAD_MAX_RETRIES = parseInt(process.env.STA_DOWNLOAD_MAX_RETRIES, 10) || 3;
const DOWNLOAD_BASE_DELAY = parseInt(process.env.STA_DOWNLOAD_BASE_DELAY, 10) || 2000;

/**
 * Custom error class that preserves the HTTP response for retry logic
 */
class HttpError extends Error {
  constructor(message, response) {
    super(message);
    this.name = 'HttpError';
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
 * Utility function to retry download operations with exponential backoff for transient errors
 * @param {Function} operation - Async function that performs the download
 * @param {string} context - Context for logging (e.g., download URL)
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<any>} - The result of the operation
 */
async function retryDownloadOperation(operation, context, maxRetries = DOWNLOAD_MAX_RETRIES) {
  const retryableStatuses = [429, 502, 503, 504, 520, 521, 522, 523, 524];
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const result = await operation();
      if (attempt > 0) {
        core.info(`✓ Download operation succeeded on attempt ${attempt + 1} for ${context}`);
      }
      return result;
    } catch (error) {
      lastError = error;

      // Check if this is a retryable error
      let isRetryable = false;
      let retryAfterDelay = null;

      if (error.name === 'TypeError') {
        // Network errors (fetch failed)
        isRetryable = true;
      } else if (error.name === 'HttpError' && error.response) {
        // HTTP errors with response object
        isRetryable = retryableStatuses.includes(error.response.status);
        if (isRetryable) {
          retryAfterDelay = getRetryAfterDelay(error.response);
        }
      } else {
        // Legacy: Check if this is a fetch error with a retryable status in the message
        const isRetryableHttpError = error.message && (
          retryableStatuses.some((status) => error.message.includes(status.toString()))
        );
        isRetryable = isRetryableHttpError;
      }

      if (attempt < maxRetries && isRetryable) {
        // Calculate delay: prefer Retry-After header, fall back to exponential backoff
        const baseDelay = DOWNLOAD_BASE_DELAY;
        const waitTime = retryAfterDelay !== null ? retryAfterDelay : baseDelay * (2 ** attempt);
        const delaySource = retryAfterDelay !== null ? 'Retry-After header' : 'exponential backoff';

        core.info(`⏳ Download operation failed for ${context}. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries + 1}) using ${delaySource}: ${error.message}`);
        await new Promise((resolve) => {
          setTimeout(resolve, waitTime);
        });
      } else {
        // Non-retryable error or max retries exceeded
        break;
      }
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error(`Download operation failed after ${maxRetries + 1} attempts for ${context}`);
}

/**
 * Create a temporary directory, with a 'contents' directory in it.
 * @returns {string} The path to the temporary directory.
 */
function createTempDirectory() {
  const tempDirPrefix = path.join(os.tmpdir(), 'sta-');
  const tempDir = fs.mkdtempSync(tempDirPrefix);

  const contentsDir = path.join(tempDir, CONTENT_DIR_NAME);
  fs.mkdirSync(contentsDir, { recursive: true });

  core.info(`✅ Import Zip directory created: ${tempDir}. Contents: ${contentsDir}`);

  return tempDir;
}

/**
 * Fetch a zip file from a URL and save it to a specified directory.
 * @param {string} downloadUrl - The URL of the zip file to download.
 * @param {string} zipDestination - The full file path where the zip file will be saved.
 * @returns {Promise<string>} - The path to the saved zip file.
 */
async function fetchZip(downloadUrl, zipDestination) {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new HttpError(`Failed to download zip. Check if the url expired and try again. Contact support if the problem persists. ${response.status} ${response.statusText}`, response);
  }

  try {
    const fileStream = fs.createWriteStream(zipDestination);
    const nodeStream = Readable.fromWeb(response.body);

    await pipeline(nodeStream, fileStream);

    // Validate zip file (will throw exception if invalid)
    const directory = await unzipper.Open.file(zipDestination);

    core.info(`✅ Downloaded Import zip to ${zipDestination} with ${directory.files.length} files.`);
  } catch (error) {
    throw new Error(`Failed to download zip: ${error.message || error}`);
  }
}

/**
 * Fetch a zip file with retry logic for transient failures.
 * @param {string} downloadUrl - The URL of the zip file to download.
 * @param {string} zipDestination - The full file path where the zip file will be saved.
 * @returns {Promise<string>} - The path to the saved zip file.
 */
async function fetchZipWithRetry(downloadUrl, zipDestination) {
  return retryDownloadOperation(
    () => fetchZip(downloadUrl, zipDestination),
    downloadUrl,
  );
}

/**
 * Unzip one file at a time.
 * @param {string} zipPath
 * @param {string} contentsDir
 * @returns {Promise<void>}
 */
async function extractZip(zipPath, contentsDir) {
  let totalFiles = -1;
  try {
    const directory = await unzipper.Open.file(zipPath);
    totalFiles = directory.files.length;
    let extractedFiles = 0;
    let nextProgress = 20;
    for (const entry of directory.files) {
      const fullPath = path.join(contentsDir, entry.path);
      if (entry.type === 'Directory') {
        fs.mkdirSync(fullPath, { recursive: true });
      } else {
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        const writable = fs.createWriteStream(fullPath);
        await new Promise((resolve, reject) => {
          entry.stream()
            .pipe(writable)
            .on('finish', resolve)
            .on('error', reject);
        });
      }

      extractedFiles += 1;
      const progress = Math.floor((extractedFiles / totalFiles) * 100);
      if (progress >= nextProgress) {
        core.info(`⏳ Extraction progress: ${progress}% (${extractedFiles}/${totalFiles} files)`);
        nextProgress += 20;
      }
    }
  } catch (error) {
    throw new Error(`Failed to extract zip: ${error.message || error}`);
  }

  core.info(`✅ Import zip extracted to: ${contentsDir}`);

  return totalFiles;
}

/**
 * Create a temporary directory, download the Import zip to it and
 * extract it to a 'contents' folder in the temp directory.
 * @returns {Promise<void>}
 */
export async function run() {
  let zipDestination;
  try {
    const downloadUrl = core.getInput('download_url');
    if (!downloadUrl.includes('spacecat')) {
      throw new Error(`Invalid download url: ${downloadUrl}`);
    }
    // eslint-disable-next-line no-new
    new URL(downloadUrl);

    const tempDir = createTempDirectory();
    zipDestination = path.join(tempDir, ZIP_NAME);
    const contentsDir = path.join(tempDir, CONTENT_DIR_NAME);
    await fetchZipWithRetry(downloadUrl, zipDestination);
    const fileCount = await extractZip(zipDestination, contentsDir);

    core.setOutput('temp_dir', tempDir);
    core.setOutput('zip_contents_path', contentsDir);
    core.setOutput('file_count', fileCount);
  } catch (error) {
    core.warning(`❌ Error: ${error.message}`);
    core.setOutput('error_message', `❌ Error: ${error.message}`);
  } finally {
    try {
      // Done with the zip file, so delete it if possible.
      if (zipDestination) {
        fs.unlinkSync(zipDestination);
      }
    } catch (error) {
      core.info(`Could not delete ${zipDestination}. Let the OS handle the deletion.`);
    }
  }
}

await run();

// Export functions for testing
export { retryDownloadOperation, fetchZipWithRetry };
