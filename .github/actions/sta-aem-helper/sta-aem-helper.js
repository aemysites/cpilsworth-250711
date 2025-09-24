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
import jwt from 'jsonwebtoken';
import { getAccessTokenWithFallback } from './ims-token-helper.js';
import { AEM_HELPER_OPERATIONS } from './sta-aem-helper-constants.js';
import { doPreviewPublish, deletePreviewPublish } from './aem-preview-publish.js';

/**
 * Fetches an Adobe IMS access token using JWT authentication.
 * Credit to @adobe/jwt-auth.
 *
 * @param {Object} config - The configuration object.
 * @param {string} config.clientId - The client ID for the integration.
 * @param {string} config.technicalAccountId - The technical account ID.
 * @param {string} config.orgId - The Adobe organization ID.
 * @param {string} config.clientSecret - The client secret for the integration.
 * @param {string} config.privateKey - The private key for signing the JWT.
 * @param {string} [config.passphrase] - The passphrase for the private key (optional).
 * @param {Array<string>|string} config.metaScopes - The meta scopes for the JWT.
 * @param {string} [config.ims] - The IMS endpoint URL (optional).
 * @returns {Promise<Object>} The JSON response containing the access token or error details.
 * @throws {Error} If required parameters are missing or token exchange fails.
 */
async function fetchJWTAuthAccessToken(config) {
  const {
    clientId,
    technicalAccountId,
    orgId,
    clientSecret,
    privateKey,
    passphrase = '',
    metaScopes,
    ims = 'https://ims-na1.adobelogin.com',
  } = config;

  const errors = [];
  if (!clientId) {
    errors.push('clientId');
  }
  if (!technicalAccountId) {
    errors.push('technicalAccountId');
  }
  if (!orgId) {
    errors.push('orgId');
  }
  if (!clientSecret) {
    errors.push('clientSecret');
  }
  if (!privateKey) {
    errors.push('privateKey');
  }
  if (!metaScopes || metaScopes.length === 0) {
    errors.push('metaScopes');
  }
  if (errors.length > 0) {
    throw new Error(
      `Missing required authorization parameter(s): ${errors.join(', ')}. Please check your configuration.`,
    );
  }

  let validatedMetaScopes = metaScopes;
  if (!Array.isArray(validatedMetaScopes)) {
    validatedMetaScopes = validatedMetaScopes.split(',');
  }

  const jwtPayload = {
    exp: Math.round(300 + Date.now() / 1000),
    iss: orgId,
    sub: technicalAccountId,
    aud: `${ims}/c/${clientId}`,
  };

  for (let i = 0; i < validatedMetaScopes.length; i += 1) {
    if (validatedMetaScopes[i].includes('https')) {
      jwtPayload[validatedMetaScopes[i]] = true;
    } else {
      jwtPayload[`${ims}/s/${validatedMetaScopes[i]}`] = true;
    }
  }
  let token;
  try {
    token = jwt.sign(
      jwtPayload,
      { key: privateKey, passphrase },
      { algorithm: 'RS256' },
    );
  } catch (tokenError) {
    throw new Error(`Failed to sign JWT token: ${tokenError.message || tokenError}`);
  }

  const form = new FormData();
  form.append('client_id', clientId);
  form.append('client_secret', clientSecret);
  form.append('jwt_token', token);

  const postOptions = {
    method: 'POST',
    body: form,
  };

  return fetch(`${ims}/ims/exchange/jwt/`, postOptions)
    .catch((e) => {
      throw new Error(`Unexpected response received while swapping the jwt token. ${e.message || e}`);
    })
    .then((res) => res.json().then((data) => ({
      ok: res.ok,
      json: data,
    })))
    .then(({ ok, json }) => {
      const { access_token: accessToken, error, error_description: errorDescription } = json;
      if (ok && accessToken) {
        return accessToken;
      }

      if (error && errorDescription) {
        core.warning(`❌ JWT token exchange failed: ${errorDescription} (Error: ${error})`);
        throw new Error(`JWT token exchange failed: ${errorDescription} (Error: ${error})`);
      } else {
        core.warning(`❌ Unexpected response received while swapping the jwt token: ${JSON.stringify(json)}`);
        throw new Error('Unexpected response received while swapping the jwt token.');
      }
    });
}

/**
 * Fetches an Adobe IMS access token using credentials from a file.
 *
 * @param {string} credentialsPath - The path to the JSON credentials file.
 * @returns {Promise<Object>} The JSON response containing the access token or error details.
 * @throws {Error} If the credentials file cannot be read or parsed, or if token exchange fails.
 */
async function fetchAccessToken(credentialsPath) {
  // Read and parse the credentials
  const fileContent = fs.readFileSync(credentialsPath, 'utf8');
  const rawCredentials = JSON.parse(fileContent);
  const integration = rawCredentials.integration || {};
  const technicalAccount = integration.technicalAccount || {};

  const config = {
    clientId: technicalAccount.clientId,
    clientSecret: technicalAccount.clientSecret,
    technicalAccountId: String(integration.id),
    orgId: integration.org,
    passphrase: '',
    privateKey: integration.privateKey,
    metaScopes: integration.metascopes,
    ims: `https://${integration.imsEndpoint}`,
  };

  return fetchJWTAuthAccessToken(config);
}

/**
 * Performs the fetch access token operation.
 *
 * @param {string} credentialsPath - The path to the JSON credentials file.
 * @returns {Promise<void>} - Resolves when the operation is complete.
 * @throws {Error} - If the operation fails.
 */
async function doFetchAccessToken(credentialsPath) {
  const accessToken = await fetchAccessToken(credentialsPath);
  if (accessToken) {
    core.setOutput('access_token', accessToken);
    core.info(`Access token fetched successfully: ${accessToken?.substring(0, 10)}...`);
  } else {
    throw new Error('Failed to fetch access token');
  }
}

/**
* Main function for the GitHub Action.
*
* Depending on the provided operation, different outputs are set:
* All operations can set the error_message output.
*
* |--------------------------------------------------------------------------|
* | operation               | output                                         |
* |--------------------------------------------------------------------------|
* | fetch-access-token      | access_token                                   |
* |--------------------------------------------------------------------------|
* | preview                 | successes - number of successful operations    |
* |                         | failures - number of failures                  |
* |--------------------------------------------------------------------------|
* | previewAndPublish       | successes - number of successful operations    |
* |                         | failures - number of failures                  |
* |--------------------------------------------------------------------------|
* | deletePreviewAndPublish | successes - number of successful operations    |
* |                         | failures - number of failures                  |
* |--------------------------------------------------------------------------|
* |  *                      | error_message - string describing the error    |
* |--------------------------------------------------------------------------|
*
* If the operation is unknown, an error is thrown.
* @returns {Promise<void>}
*/
async function run() {
  try {
    const operation = core.getInput('operation');

    if (operation === AEM_HELPER_OPERATIONS.FETCH_ACCESS_TOKEN) {
      const credentialsPath = core.getInput('credentials_path');
      doFetchAccessToken(credentialsPath);
    } else if (
      operation === AEM_HELPER_OPERATIONS.PREVIEW_PAGES
      || operation === AEM_HELPER_OPERATIONS.PREVIEW_AND_PUBLISH
      || operation === AEM_HELPER_OPERATIONS.DELETE_PREVIEW_AND_PUBLISH
    ) {
      const pagesInput = core.getInput('pages');
      const context = core.getInput('context');
      const pages = JSON.parse(pagesInput);

      // Get access token with fallback logic
      const accessToken = await getAccessTokenWithFallback();

      if (operation === AEM_HELPER_OPERATIONS.DELETE_PREVIEW_AND_PUBLISH) {
        await deletePreviewPublish(pages, context, accessToken);
      } else {
        await doPreviewPublish(pages, operation, context, accessToken);
      }
    } else {
      throw new Error(`Unknown AEM helper operation: ${operation}`);
    }
  } catch (error) {
    core.warning(`❌ Error: ${error.message}`);
    core.setOutput('error_message', `❌ Error: ${error.message}`);
  }
}

await run();
