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

import fs from 'fs';
import path from 'path';
import core from '@actions/core';
import unzipper from 'unzipper';

/**
 * Get the list of paths from a filter.xml file.
 * Enhanced to handle multiple XML formats.
 * @param {string} xmlString
 * @returns {string[]}
 */
export function getFilterPaths(xmlString) {
  const paths = [];

  // Try multiple regex patterns to handle different XML formats
  const patterns = [
    // Self-closing filter tags: <filter root="/path"/>
    /<filter\s+root="([^"]+)"\s*\/>/g,
    // Opening and closing filter tags: <filter root="/path"></filter>
    /<filter\s+root="([^"]+)"><\/filter>/g,
    // Opening and closing filter tags with content: <filter root="/path">...</filter>
    /<filter\s+root="([^"]+)"[^>]*>.*?<\/filter>/g,
    // Filter tags with other attributes
    /<filter[^>]+root="([^"]+)"[^>]*>/g,
  ];

  for (const pattern of patterns) {
    let match;
    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(xmlString)) !== null) {
      const filterPath = match[1];
      if (filterPath && !paths.includes(filterPath)) {
        paths.push(filterPath);
      }
    }
  }

  return paths;
}

/**
 * Gets the path to the content package zip file from the specified directory.
 * @param zipContentsPath
 * @returns {string}
 */
function getContentPackagePath(zipContentsPath) {
  // Find the first .zip file in the directory
  const files = fs.readdirSync(zipContentsPath);
  const firstZipFile = files.find((file) => file.endsWith('.zip'));
  if (!firstZipFile) {
    throw new Error('No .zip files found in the specified directory.');
  }

  // Return the first .zip file found - presumably the content package
  return path.join(zipContentsPath, firstZipFile);
}

export async function doExtractContentPaths(zipContentsPath) {
  const contentPackagePath = getContentPackagePath(zipContentsPath);
  core.info(`✅ Content Package Path: ${contentPackagePath}`);
  core.setOutput('content_package_path', contentPackagePath);

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(contentPackagePath)
        .pipe(unzipper.ParseOne('META-INF/vault/filter.xml'))
        .pipe(fs.createWriteStream('filter.xml'))
        .on('finish', () => {
          core.info('filter.xml extracted successfully');
          fs.readFile('filter.xml', 'utf8', (err, data) => {
            if (err) {
              reject(new Error(`Error reading extracted file: ${err}`));
            } else {
              core.debug(`Filter XML content: ${data}`);
              const paths = getFilterPaths(data);
              core.setOutput('page_paths', paths);
              resolve();
            }
          });
        })
        .on('error', (error) => {
          reject(new Error(`Error extracting filter.xml: ${error}`));
        });
    });
  } finally {
    // Clean up the filter xml file after extraction
    try {
      if (fs.existsSync('filter.xml')) {
        fs.unlinkSync('filter.xml');
      }
    } catch (cleanupError) {
      core.warning(`Failed to remove filter.xml: ${cleanupError.message}`);
    }
  }
}

export const BOILERPLATE_PATTERN = /sta-xwalk-boilerplate/g;

/**
 * Replace boilerplate paths in content with repository-specific paths
 * @param {string} content - Original file content
 * @param {string} repoName - Repository name for replacement
 * @returns {Object} - Object with modifiedContent and modificationCount
 */
export function replaceBoilerplatePaths(content, repoName) {
  // Simple replacement of all occurrences of sta-xwalk-boilerplate with repo name
  // Count matches before replacement for logging
  const matches = content.match(BOILERPLATE_PATTERN);
  if (!matches) {
    return { modifiedContent: content, modificationCount: 0 };
  }

  const modificationCount = matches.length;
  const modifiedContent = content.replace(BOILERPLATE_PATTERN, repoName);

  return { modifiedContent, modificationCount };
}

/**
 * Get relative path and prefix for logging based on file location
 * @param {string} filePath - Full file path
 * @param {string} jcrRootPath - Path to jcr_root directory
 * @param {string} metaInfPath - Path to META-INF directory
 * @returns {object} with the following properties:
 *   - relativePath: {string} - The relative path from either jcr_root or META-INF directory
 *   - pathPrefix: {string} - The prefix for logging ('jcr_root/' or 'META-INF/')
 *   - isJcrRoot: {boolean} - Whether the file is located under the jcr_root directory
 */
export function getFilePathInfo(filePath, jcrRootPath, metaInfPath) {
  const isJcrRoot = filePath.startsWith(jcrRootPath);
  const relativePath = isJcrRoot
    ? path.relative(jcrRootPath, filePath)
    : path.relative(metaInfPath, filePath);
  const pathPrefix = isJcrRoot ? 'jcr_root/' : 'META-INF/';
  return { relativePath, pathPrefix, isJcrRoot };
}

/**
 * Process all XML files recursively and replace boilerplate paths.
 * This function is only called for boilerplate packages during conversion.
 * @param {string} jcrRootPath - Path to jcr_root directory
 * @param {string} metaInfPath - Path to META-INF directory
 * @param {string} repoName - Repository name to use for replacement
 */
export function processContentXmlFiles(jcrRootPath, metaInfPath, repoName) {
  core.info('Processing XML files in jcr_root and META-INF for path replacement');

  /**
   * Recursively find all .content.xml files that need processing
   * @param {string} dirPath - Directory to search
   * @returns {string[]} - Array of .content.xml file paths
   */
  function findXmlFiles(dirPath) {
    const xmlFiles = [];

    if (!fs.existsSync(dirPath)) {
      return xmlFiles;
    }

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Recursively search subdirectories
        xmlFiles.push(...findXmlFiles(itemPath));
      } else if (item === '.content.xml') {
        // Process .content.xml files
        xmlFiles.push(itemPath);
      }
    }

    return xmlFiles;
  }

  // Find .content.xml files in both directories
  const jcrRootXmlFiles = findXmlFiles(jcrRootPath);
  const metaInfXmlFiles = findXmlFiles(metaInfPath);
  const allXmlFiles = [...jcrRootXmlFiles, ...metaInfXmlFiles];

  core.info(`Found ${jcrRootXmlFiles.length} .content.xml files in jcr_root and ${metaInfXmlFiles.length} .content.xml files in META-INF to process`);

  let totalReplacements = 0;

  for (const filePath of allXmlFiles) {
    const { relativePath, pathPrefix } = getFilePathInfo(filePath, jcrRootPath, metaInfPath);
    try {
      // Read file content for processing
      const originalContent = fs.readFileSync(filePath, 'utf8');

      // Process the file content
      const { modifiedContent, modificationCount } = replaceBoilerplatePaths(
        originalContent,
        repoName,
      );

      // Write back the modified content if changes were made
      if (modificationCount > 0) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        totalReplacements += modificationCount;

        core.info(`  ✅ Updated ${pathPrefix}${relativePath}: ${modificationCount} modifications`);
      }
    } catch (error) {
      core.warning(`  ⚠️ Failed to process ${pathPrefix}${relativePath}: ${error.message}`);
    }
  }

  core.info(`✅ Completed processing XML files: ${totalReplacements} total path replacements made`);
}
