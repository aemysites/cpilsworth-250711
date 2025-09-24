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

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

/**
 * Makes a request to the Microsoft Graph API.
 * @param {string} token - The OAuth access token for authentication.
 * @param {string} endpoint - The Graph API endpoint (relative to base).
 * @param {object} [options={}] - Additional fetch options (method, body, etc).
 * @returns {Promise<object>} The parsed JSON response from the API.
 * @throws Will throw an error if the response is not ok.
 */
async function graphFetch(token, endpoint, options = {}) {
  const res = await fetch(`${GRAPH_API}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) {
    const errorText = await res.text();
    core.warning(`Graph API error ${res.status}: ${errorText}`);
    throw new Error(`Graph API error ${res.status}: ${errorText}`);
  }
  return res.json();
}

/**
 * Lists the items in a specified folder in a drive.
 * @param {string} token - The OAuth access token.
 * @param {string} driveId - The ID of the drive.
 * @param {string} folderId - The ID of the folder to list items from.
 * @returns {Promise<Array<object>>} An array of item objects in the folder.
 */
async function listFolderItems(token, driveId, folderId) {
  const data = await graphFetch(token, `/drives/${driveId}/items/${folderId}/children`);
  return data.value || [];
}

/**
 * Creates a backup folder in the specified parent folder, with a timestamped name.
 * @param {string} token - The OAuth access token.
 * @param {string} driveId - The ID of the drive.
 * @param {string} parentFolderId - The ID of the parent folder
 * where the backup folder will be created.
 * @returns {Promise<{id: string, name: string}>} The ID and name of the created backup folder.
 */

async function createBackupFolder(token, driveId, parentFolderId) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `backup-${timestamp}`;
  const body = JSON.stringify({ name: backupName, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' });
  const data = await graphFetch(token, `/drives/${driveId}/items/${parentFolderId}/children`, { method: 'POST', body });
  return { id: data.id, name: backupName };
}

/**
 * Moves an item to a destination folder within the same drive.
 * @param {string} token - The OAuth access token.
 * @param {string} driveId - The ID of the drive.
 * @param {string} itemId - The ID of the item to move.
 * @param {string} destFolderId - The ID of the destination folder.
 * @returns {Promise<void>} Resolves when the move is complete.
 */
async function moveItem(token, driveId, itemId, destFolderId) {
  const body = JSON.stringify({ parentReference: { id: destFolderId } });
  await graphFetch(token, `/drives/${driveId}/items/${itemId}`, { method: 'PATCH', body });
}

/**
 * Main function to run the backup and move operation for SharePoint content.
 * Gets site and drive info, creates a backup folder, and moves items except certain folders.
 * Sets the backup folder name as an output.
 * @returns {Promise<void>}
 */
export async function run() {
  try {
    const token = core.getInput('token');
    const host = core.getInput('host');
    const sitePath = core.getInput('site_path');
    const folderPath = core.getInput('folder_path');
    // 1. Get site ID
    // eslint-disable-next-line max-len
    const siteEndpoint = `/sites/${host}:/sites/${sitePath}`;
    const site = await graphFetch(
      token,
      siteEndpoint,
    );
    const siteId = site.id;
    // 2. Get drive ID
    const drives = await graphFetch(token, `/sites/${siteId}/drives`);
    const rootDrive = folderPath.split('/').shift();
    let driveId = drives.value.find((dr) => dr.name === rootDrive)?.id;
    if (!driveId && drives.value.length === 1) driveId = drives.value[0].id;
    if (!driveId) throw new Error('Drive ID not found');
    // 3. Get folder ID
    let folderId = 'root';
    if (folderPath && folderPath !== rootDrive) {
      const segments = folderPath.split('/').filter(Boolean);
      let currentId = 'root';
      for (let i = 1; i < segments.length; i += 1) {
        const seg = segments[i];
        const folder = await graphFetch(token, `/drives/${driveId}/items/${currentId}/children`);
        const found = folder.value.find((item) => item.name === seg && item.folder);
        if (!found) throw new Error(`Folder segment not found: ${seg}`);
        currentId = found.id;
      }
      folderId = currentId;
    }
    // 4. List items in folder
    const items = await listFolderItems(token, driveId, folderId);
    // 5. Create backup folder
    const backup = await createBackupFolder(token, driveId, folderId);
    // 6. Move items except 'tools' and 'block-collection'
    for (const item of items) {
      if (!['tools', 'block-collection'].includes(item.name)) {
        try {
          await moveItem(token, driveId, item.id, backup.id);
          core.info(`Moved ${item.name} to ${backup.name}`);
        } catch (err) {
          core.warning(`Failed to move ${item.name} to ${backup.name}: ${err.message}`);
        }
      }
    }
    core.setOutput('backup_folder_name', backup.name);
  } catch (error) {
    core.setFailed(error.message);
  }
}

await run();
