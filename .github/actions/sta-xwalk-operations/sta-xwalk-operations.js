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
import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
// eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
import archiver from 'archiver';
import {
  doExtractContentPaths,
  getFilterPaths,
  processContentXmlFiles,
  BOILERPLATE_PATTERN,
} from './xwalk-content.js';

export const XWALK_OPERATIONS = Object.freeze({
  UPLOAD: 'upload',
  GET_PAGE_PATHS: 'get-page-paths',
  CONVERT_BOILERPLATE: 'convert-boilerplate',
});

/**
 * Get and validate the required input for the action.
 * @param name
 * @returns {string}
 */
function getAndValidateInputs(name) {
  const value = core.getInput(name);
  if (!value) {
    throw new Error(`Input "${name}" is required.`);
  }
  return value;
}

/**
 * Upload the content package and asset mapping to AEM.
 * @param xwalkZipPath
 * @param assetMappingPath
 * @param target
 * @param accessToken
 * @param skipAssets
 * @returns {Promise<unknown>}
 */
async function doUpload(
  xwalkZipPath,
  assetMappingPath,
  target,
  accessToken,
  skipAssets = false,
) {
  return new Promise((resolve, reject) => {
    const args = [
      '@adobe/aem-import-helper',
      'aem',
      'upload',
      '--zip', xwalkZipPath,
      '--asset-mapping', assetMappingPath,
      '--target', target,
      '--token', accessToken,
    ];
    if (skipAssets) {
      args.push('--skip-assets');
    }

    // Try to make it easy to read in the logs.
    const suffixArray = ['', '', '\n>  ', '', '\n>  ', '', '\n>  ', '', '\n>  '];
    const maskedArgs = args.map((arg, index) => (arg === accessToken ? '***\n>  ' : `${arg}${suffixArray[index % suffixArray.length]}`));
    core.info('Running command:');
    core.info(`> npx ${maskedArgs.join(' ')}`);

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
        resolve();
      } else {
        reject(new Error(`AEM upload failed. Error: ${errorOutput}`));
      }
    });
  });
}

/**
 * Expected boilerplate paths that indicate this is a boilerplate package
 */
const BOILERPLATE_PATHS = [
  '/content/sta-xwalk-boilerplate/tools',
  '/content/sta-xwalk-boilerplate/block-collection',
  '/content/dam/sta-xwalk-boilerplate/block-collection',
];

/**
 * Check if all the given paths start with any of the BOILERPLATE_PATHS
 * @param {string[]} paths - Array of paths from filter.xml
 * @returns {boolean} - True if all paths start with any boilerplate path
 */
function isBoilerplatePackage(paths) {
  if (!paths || paths.length === 0) {
    return false;
  }

  // Check if all paths start with any of the boilerplate paths
  function startsWithBoilerplate(pathItem) {
    return BOILERPLATE_PATHS.some((boilerplatePath) => pathItem.startsWith(boilerplatePath));
  }
  return paths.every(startsWithBoilerplate);
}

/**
 * Gets the path to the content package zip file from the specified directory.
 * @param zipContentsPath
 * @returns {string|null} - Returns null if no zip file found (for boilerplate content)
 */
function getContentPackagePath(zipContentsPath) {
  // Find the first .zip file in the directory
  const files = fs.readdirSync(zipContentsPath);
  const firstZipFile = files.find((file) => file.endsWith('.zip'));
  if (!firstZipFile) {
    return null; // No zip file found - might be boilerplate content
  }

  // Return the first .zip file found - presumably the content package
  return path.join(zipContentsPath, firstZipFile);
}

/**
 * Extract filter.xml and check if this is a boilerplate package
 * @param {string} zipContentsPath - Path to the extracted import zip contents
 * @returns {Promise<{isBoilerplate: boolean, contentPackagePath: string, pagePaths: string[]}>}
 */
async function detectBoilerplate(zipContentsPath) {
  const contentPackagePath = getContentPackagePath(zipContentsPath);

  // Check if this is boilerplate content (no zip file, but META-INF directory exists)
  const metaInfPath = path.join(zipContentsPath, 'META-INF', 'vault', 'filter.xml');
  const isBoilerplateContent = !contentPackagePath && fs.existsSync(metaInfPath);

  let extractedPaths = [];

  if (isBoilerplateContent) {
    core.info('✅ Detected boilerplate content - reading filter.xml directly');

    try {
      const filterContent = fs.readFileSync(metaInfPath, 'utf8');
      core.debug(`Filter XML content: ${filterContent}`);
      extractedPaths = getFilterPaths(filterContent);
      core.info(`✅ Extracted ${extractedPaths.length} page paths from boilerplate content: ${extractedPaths.join(', ')}`);
    } catch (error) {
      throw new Error(`Error reading filter.xml from boilerplate content: ${error.message}`);
    }
  } else {
    if (!contentPackagePath) {
      throw new Error('No .zip files found in the specified directory and no boilerplate content detected.');
    }

    core.info(`✅ Content Package Path: ${contentPackagePath}`);

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
                extractedPaths = paths;
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

  const isBoilerplate = isBoilerplatePackage(extractedPaths);

  return {
    isBoilerplate,
    contentPackagePath: contentPackagePath || '', // Return empty string for boilerplate content
    pagePaths: extractedPaths,
  };
}

/**
 * Convert boilerplate paths to repository-specific paths
 * @param {string} filterXmlContent - Original filter.xml content
 * @param {string} repoName - Repository name to use for replacement
 * @returns {string} - Modified filter.xml content
 */
function convertBoilerplatePaths(filterXmlContent, repoName) {
  core.info(`Converting boilerplate paths for repository: ${repoName}`);

  // Use regex to find and replace paths, preserving XML structure
  let modifiedContent = filterXmlContent;

  // Replace the paths in root attributes and any text content
  modifiedContent = modifiedContent.replace(BOILERPLATE_PATTERN, repoName);

  // Also handle the case where paths might be in different formats or escaped
  // This regex looks for paths that contain 'sta-xwalk-boilerplate' and replaces them
  modifiedContent = modifiedContent.replace(
    /root="([^"]*sta-xwalk-boilerplate[^"]*)"/g,
    (match, originalPath) => {
      // Convert ALL paths that contain 'sta-xwalk-boilerplate' to use the repo name
      if (originalPath.includes('sta-xwalk-boilerplate')) {
        const newPath = originalPath.replace(BOILERPLATE_PATTERN, repoName);
        core.info(`  Converted path: ${originalPath} -> ${newPath}`);
        return `root="${newPath}"`;
      }
      return match;
    },
  );

  return modifiedContent;
}

/**
 * Rename folders in jcr_root from sta-xwalk-boilerplate to repo name
 * @param {string} jcrRootPath - Path to jcr_root directory
 * @param {string} repoName - Repository name to use
 */
function renameFoldersInJcrRoot(jcrRootPath, repoName) {
  core.info(`Renaming folders in jcr_root from sta-xwalk-boilerplate to ${repoName}`);

  // Check if content/sta-xwalk-boilerplate exists
  const contentDir = path.join(jcrRootPath, 'content');
  const boilerplateContentDir = path.join(contentDir, 'sta-xwalk-boilerplate');
  const newContentDir = path.join(contentDir, repoName);

  if (fs.existsSync(boilerplateContentDir)) {
    core.info(`Renaming: ${boilerplateContentDir} -> ${newContentDir}`);
    fs.renameSync(boilerplateContentDir, newContentDir);
  }

  // Check if content/dam/sta-xwalk-boilerplate exists
  const damDir = path.join(jcrRootPath, 'content', 'dam');
  const boilerplateDamDir = path.join(damDir, 'sta-xwalk-boilerplate');
  const newDamDir = path.join(damDir, repoName);

  if (fs.existsSync(boilerplateDamDir)) {
    core.info(`Renaming: ${boilerplateDamDir} -> ${newDamDir}`);
    fs.renameSync(boilerplateDamDir, newDamDir);
  }
}

/**
 * Create zip file from directory contents
 * @param {string} sourceDir - Directory to zip
 * @param {string} outputPath - Path for the output zip file
 * @returns {Promise<void>}
 */
async function createZipFromDirectory(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level.
    });

    output.on('close', () => {
      core.info(`✅ Created zip file: ${outputPath} (${archive.pointer()} total bytes)`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add all contents of the source directory to the zip
    archive.directory(sourceDir, false);

    archive.finalize();
  });
}

/**
 * Extract content package to a directory
 * @param {string} contentPackagePath - Path to the content package zip
 * @param {string} extractDir - Directory to extract to
 * @returns {Promise<void>}
 */
async function extractContentPackage(contentPackagePath, extractDir) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(contentPackagePath)
      .pipe(unzipper.Extract({ path: extractDir }))
      .on('close', resolve)
      .on('error', reject);
  });
}

/**
 * Create a content package from already extracted boilerplate content
 * @param {string} zipContentsPath - Path to the already extracted import zip contents
 * @param {string} repoName - Repository name for path replacement
 * @returns {Promise<string>} - Path to the created content package
 */
async function createPackageFromExtractedContent(zipContentsPath, repoName) {
  core.info(`Creating package from extracted boilerplate content in: ${zipContentsPath}`);

  // Check if this is already extracted content (has jcr_root and META-INF directories)
  const jcrRootPath = path.join(zipContentsPath, 'jcr_root');
  const metaInfPath = path.join(zipContentsPath, 'META-INF');

  if (!fs.existsSync(jcrRootPath) || !fs.existsSync(metaInfPath)) {
    throw new Error('Expected jcr_root and META-INF directories not found in extracted content');
  }

  core.info('✅ Found jcr_root and META-INF directories - processing extracted boilerplate content');

  // Read and modify filter.xml
  const filterXmlPath = path.join(metaInfPath, 'vault', 'filter.xml');
  if (!fs.existsSync(filterXmlPath)) {
    throw new Error('filter.xml not found in META-INF/vault directory');
  }

  const originalFilterContent = fs.readFileSync(filterXmlPath, 'utf8');
  core.debug(`📄 Original filter.xml content:\n${originalFilterContent}`);

  const modifiedFilterContent = convertBoilerplatePaths(originalFilterContent, repoName);
  core.debug(`📄 Modified filter.xml content:\n${modifiedFilterContent}`);

  // Write the modified filter.xml back
  fs.writeFileSync(filterXmlPath, modifiedFilterContent, 'utf8');
  core.info('✅ Updated filter.xml with repository-specific paths');

  // Rename folders in jcr_root
  renameFoldersInJcrRoot(jcrRootPath, repoName);

  // Process all XML files to replace boilerplate paths (only for boilerplate packages)
  core.info('🔄 Processing XML files for boilerplate path replacement...');
  processContentXmlFiles(jcrRootPath, metaInfPath, repoName);

  // Create new zip with modified content - only include jcr_root and META-INF
  const convertedPackagePath = path.join(zipContentsPath, `converted-boilerplate-${repoName}.zip`);

  // Create a temporary directory with only the content we want to zip
  const tempPackageDir = path.join(zipContentsPath, 'temp_package');
  if (fs.existsSync(tempPackageDir)) {
    fs.rmSync(tempPackageDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempPackageDir, { recursive: true });

  // Copy jcr_root and META-INF to temp directory
  const tempJcrRoot = path.join(tempPackageDir, 'jcr_root');
  const tempMetaInf = path.join(tempPackageDir, 'META-INF');

  fs.cpSync(jcrRootPath, tempJcrRoot, { recursive: true });
  fs.cpSync(metaInfPath, tempMetaInf, { recursive: true });

  // Create zip from temp directory
  await createZipFromDirectory(tempPackageDir, convertedPackagePath);

  // Clean up temp directory
  fs.rmSync(tempPackageDir, { recursive: true, force: true });

  if (fs.existsSync(convertedPackagePath)) {
    core.info(`✅ Created converted boilerplate package: ${convertedPackagePath}`);
    return convertedPackagePath;
  } else {
    throw new Error('Failed to create converted package');
  }
}

/**
 * Modify extracted content package (handles both zipped and extracted boilerplate content)
 * @param {string} zipContentsPath - Path to the extracted import zip contents
 * @param {string} repoName - Repository name for path replacement
 * @returns {Promise<string>} - Path to the converted content package
 */
async function modifyExtractedContentPackage(zipContentsPath, repoName) {
  core.info(`Processing content package in: ${zipContentsPath}`);

  // Check if this is already extracted boilerplate content (no .zip file, but has directories)
  const jcrRootPath = path.join(zipContentsPath, 'jcr_root');
  const metaInfPath = path.join(zipContentsPath, 'META-INF');
  const hasDirectories = fs.existsSync(jcrRootPath) && fs.existsSync(metaInfPath);
  const contentPackagePath = getContentPackagePath(zipContentsPath);

  if (!contentPackagePath && hasDirectories) {
    core.info('🔄 Detected extracted boilerplate content - creating package from directories');
    return createPackageFromExtractedContent(zipContentsPath, repoName);
  }
  if (contentPackagePath) {
    core.info(`🔄 Found content package: ${contentPackagePath} - extracting and modifying`);

    // Extract the content package
    const extractedDir = path.join(zipContentsPath, 'extracted_package');
    if (fs.existsSync(extractedDir)) {
      fs.rmSync(extractedDir, { recursive: true, force: true });
    }
    fs.mkdirSync(extractedDir, { recursive: true });

    await extractContentPackage(contentPackagePath, extractedDir);
    core.info('✅ Content package extracted successfully');

    // Now process the extracted content
    return createPackageFromExtractedContent(extractedDir, repoName);
  }
  throw new Error('No content package found and no extracted boilerplate content detected');
}

/**
 * Perform the XWalk operation (see action.yml for more details).
 *
 * | Operation       | Name                 | Description                           | Required |
 * |-----------------|----------------------|---------------------------------------|----------|
 * | INPUTS                                                                                    |
 * | *               | operation            | The XWalk operation to perform.       | Yes      |
 * | *               | zip_contents_path    | Path to Import zip contents.          | Yes      |
 * | UPLOAD          | access_token         | Base64 token for upload.              | No       |
 * | UPLOAD          | aem_author_url       | Target Adobe AEM Cloud URL.           | No       |
 * | UPLOAD          | content_package_path | Path to AEM package in zip contents.  | No       |
 * | UPLOAD          | skip_assets          | Agent name for log identification.    | No       |
 * | CONVERT_BOILERPLATE | repo_name        | Repository name for path replacement. | Yes      |
 * |-----------------|----------------------|---------------------------------------|----------|
 * | OUTPUTS                                                                                   |
 * | *               | error_message        | Error if operation could not complete.| Output   |
 * | GET_PAGE_PATHS  | content_package_path | Path to content package zip file.     | Output   |
 * | GET_PAGE_PATHS  | page_paths           | Comma-delimited list of page paths.   | Output   |
 * | CONVERT_BOILERPLATE | is_boilerplate   | Whether package is boilerplate.       | Output   |
 * | CONVERT_BOILERPLATE | content_package_path | Path to content package zip file. | Output   |
 * | CONVERT_BOILERPLATE | page_paths       | Comma-delimited list of page paths.   | Output   |
 * | CONVERT_BOILERPLATE | converted_package_path | Path to converted package.      | Output   |
 * | CONVERT_BOILERPLATE | converted_page_paths | JSON string of converted paths.   | Output   |
 *
 * @returns {Promise<void>}
 */
export async function run() {
  // Read common inputs and validate them.
  const operation = core.getInput('operation');
  const zipContentsPath = core.getInput('zip_contents_path');
  if (!zipContentsPath
    || !fs.existsSync(zipContentsPath)
    || !fs.statSync(zipContentsPath).isDirectory()) {
    throw new Error(`Zip Contents not found at path: ${zipContentsPath}`);
  }

  try {
    if (operation === XWALK_OPERATIONS.UPLOAD) {
      const accessToken = getAndValidateInputs('access_token');
      const target = getAndValidateInputs('aem_author_url');
      const contentPackagePath = getAndValidateInputs('content_package_path');
      const skipAssets = getAndValidateInputs('skip_assets') === 'true';

      if (!contentPackagePath
        || !fs.existsSync(contentPackagePath)
        || !fs.statSync(contentPackagePath).isFile()) {
        throw new Error(`Content package not found at path: ${contentPackagePath}`);
      }

      const url = new URL(target);
      const hostTarget = `${url.origin}/`;
      const assetMappingPath = `${zipContentsPath}/asset-mapping.json`;

      core.info(`✅ Uploading "${contentPackagePath}" and "${assetMappingPath}" to ${hostTarget}. Assets will ${skipAssets ? 'not ' : ''}be uploaded.`);

      await doUpload(
        contentPackagePath,
        assetMappingPath,
        hostTarget,
        accessToken,
        skipAssets,
      );
      core.info('✅ Upload completed successfully.');
    } else if (operation === XWALK_OPERATIONS.GET_PAGE_PATHS) {
      // Validate the existence of the asset mapping file
      const assetMappingPath = path.join(zipContentsPath, 'asset-mapping.json');
      if (!fs.existsSync(assetMappingPath)
        || !fs.statSync(assetMappingPath).isFile()) {
        throw new Error(`Asset mapping file not found at Import zip content path: ${assetMappingPath}`);
      }

      await doExtractContentPaths(zipContentsPath);
    } else if (operation === XWALK_OPERATIONS.CONVERT_BOILERPLATE) {
      // First detect if this is a boilerplate package
      const result = await detectBoilerplate(zipContentsPath);

      // Set detection outputs
      core.setOutput('is_boilerplate', result.isBoilerplate.toString());
      core.setOutput('content_package_path', result.contentPackagePath);
      core.setOutput('page_paths', result.pagePaths);

      if (result.isBoilerplate) {
        core.info(`✅ Detected boilerplate package with ${result.pagePaths.length} paths: ${result.pagePaths.join(', ')}`);

        // Get repo name for conversion
        const repoName = getAndValidateInputs('repo_name');
        core.info('Package detected as boilerplate - starting conversion');

        // Convert the boilerplate content
        const convertedPackagePath = await modifyExtractedContentPackage(zipContentsPath, repoName);

        // Convert the page paths to repository-specific paths
        const convertedPagePaths = result.pagePaths.map((originalPath) => {
          // Convert ALL paths that contain 'sta-xwalk-boilerplate' to use the repo name
          if (originalPath.includes('sta-xwalk-boilerplate')) {
            return originalPath.replace(BOILERPLATE_PATTERN, repoName);
          }
          return originalPath; // Keep original if not a boilerplate path
        });

        // Set conversion outputs
        core.setOutput('converted_package_path', convertedPackagePath);
        core.setOutput('converted_page_paths', convertedPagePaths);
        core.info(`Boilerplate conversion completed. Converted package: ${convertedPackagePath}`);
        core.info(`Converted page paths: ${convertedPagePaths.join(', ')}`);
        core.info('Assets will be skipped during upload for boilerplate packages');
      } else {
        core.info(`✅ Not a boilerplate package. Found ${result.pagePaths.length} paths: ${result.pagePaths.join(', ')}`);
        core.info('Package is not a boilerplate - no conversion needed');
      }
    }
  } catch (error) {
    core.warning(`Error: XWalk operation ${operation} failed: ${error.message}`);
    core.setOutput('error_message', `XWalk operation ${operation} failed: ${error.message}`);
  }
}

await run();
