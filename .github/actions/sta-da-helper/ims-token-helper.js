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

// Adobe IMS token endpoint for OAuth 2.0 authorization access token exchange
const IMS_TOKEN_ENDPOINT = 'https://ims-na1.adobelogin.com/ims/token/v3';

/**
 * Exchange DA IMSS client credentials for an access token using OAuth 2.0 authorization code flow
 * @param {string} clientId - DA IMSS client ID from the service account
 * @param {string} clientSecret - DA IMSS client secret from the service account
 * @param {string} serviceToken - DA IMSS authorization code (obtained from service account)
 * @returns {Promise<string>} Access token for DA Admin API authentication
 */
export async function getAccessToken(clientId, clientSecret, serviceToken) {
  core.info('Exchanging IMSS credentials for access token...');

  // Prepare form-encoded data (matching the working curl request)
  const formParams = new URLSearchParams();
  formParams.append('grant_type', 'authorization_code');
  formParams.append('client_id', clientId);
  formParams.append('client_secret', clientSecret);
  formParams.append('code', serviceToken);

  const response = await fetch(IMS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    core.warning(`IMS token exchange failed ${response.status}: ${errorText}`);
    throw new Error(`Failed to exchange IMS credentials: ${response.status} ${errorText}`);
  }

  const tokenData = await response.json();

  if (!tokenData.access_token) {
    throw new Error('No access token received from IMS');
  }

  core.info('✅ Successfully obtained access token from IMS');
  return tokenData.access_token;
}

/**
 * Get access token with fallback logic for DA operations
 * @returns {Promise<string|null>} Access token or null if no credentials available
 */
export async function getAccessTokenWithFallback() {
  // Prefer pre-issued IMS token when provided via repo secrets
  const imsToken = process.env.IMS_TOKEN;
  // DA IMS credentials for token exchange (fallback)
  let clientId = process.env.DA_CLIENT_ID;
  let clientSecret = process.env.DA_CLIENT_SECRET;
  let serviceToken = process.env.DA_SERVICE_TOKEN;

  let accessToken = null;
  // 1) Use IMS token secret if provided
  if (imsToken && imsToken.trim().length > 0) {
    accessToken = imsToken.trim();
    core.info('Using IMS token from repository secrets.');
  } else if (clientId && clientSecret && serviceToken) {
    // 2) Fallback: exchange DA_* secrets for access token
    clientId = clientId.trim();
    clientSecret = clientSecret.trim();
    serviceToken = serviceToken.trim();
    core.info('IMS token not found. Using IMSS client credentials as fallback.');
    accessToken = await getAccessToken(clientId, clientSecret, serviceToken);
  } else {
    // 3) Final fallback: proceed without token
    core.warning('No IMS token, or DA IMS client credentials found. Proceeding without token.');
  }

  return accessToken;
}
