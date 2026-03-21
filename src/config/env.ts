/**
 * Environment Configuration
 * 
 * Runtime access to environment variables via expo-constants
 * All env vars are loaded from .env at build time via app.config.ts
 */

import Constants from 'expo-constants';

function getEnvVar(key: string, fallback: string = ''): string {
  const value = Constants.expoConfig?.extra?.[key];
  return value || fallback;
}

export const env = {
  hetzner: {
    baseUrl: getEnvVar('HETZNER_BASE_URL', ''),
    webdavUrl: getEnvVar('HETZNER_WEBDAV_URL', ''),
    username: getEnvVar('HETZNER_WEBDAV_USERNAME', ''),
    password: getEnvVar('HETZNER_WEBDAV_PASSWORD', ''),
  },
  models: {
    metadataPath: getEnvVar('MODEL_METADATA_PATH', 'models/metadata.json'),
    contextSizeDefault: parseInt(getEnvVar('CTX_SIZE_DEFAULT', '2048'), 10),
    chatMaxTokens: parseInt(getEnvVar('CHAT_MAX_TOKENS', '512'), 10),
  },
  download: {
    chunkSize: parseInt(getEnvVar('DOWNLOAD_CHUNK_SIZE', '8388608'), 10),
    concurrency: parseInt(getEnvVar('DOWNLOAD_CONCURRENCY', '3'), 10),
    timeoutMs: 30000,
    retryAttempts: 3,
  },
  support: {
    paypalUrl: getEnvVar('SUPPORT_PAYPAL_URL', ''),
    otherPaymentUrl: getEnvVar('SUPPORT_OTHER_PAYMENT_URL', ''),
  },
  app: {
    githubRepoUrl: getEnvVar('GITHUB_REPO_URL', ''),
    developerContactEmail: getEnvVar('DEVELOPER_CONTACT_EMAIL', ''),
  },
  storage: {
    modelsDir: 'models',
    tempDir: 'temp',
    metadataDb: 'models_metadata.db',
  },
} as const;
