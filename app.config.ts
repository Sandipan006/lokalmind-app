require('dotenv').config({ path: '.env' });

module.exports = ({ config }: { config: any }) => {
  return {
    ...config,
    owner: process.env.APP_OWNER || '',
    ios: {
      ...(config.ios || {}),
      bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || '',
    },
    android: {
      ...(config.android || {}),
      package: process.env.ANDROID_PACKAGE || '',
    },
    extra: {
      router: {},
      eas: {
        projectId: process.env.EAS_PROJECT_ID || '',
      },
      HETZNER_BASE_URL: process.env.HETZNER_BASE_URL || '',
      HETZNER_WEBDAV_URL: process.env.HETZNER_WEBDAV_URL || '',
      MODEL_METADATA_PATH: process.env.MODEL_METADATA_PATH || '',
      CTX_SIZE_DEFAULT: process.env.CTX_SIZE_DEFAULT || '2048',
      CHAT_MAX_TOKENS: process.env.CHAT_MAX_TOKENS || '512',
      DOWNLOAD_CHUNK_SIZE: process.env.DOWNLOAD_CHUNK_SIZE || '8388608',
      DOWNLOAD_CONCURRENCY: process.env.DOWNLOAD_CONCURRENCY || '3',
      SUPPORT_PAYPAL_URL: process.env.SUPPORT_PAYPAL_URL || '',
      SUPPORT_OTHER_PAYMENT_URL: process.env.SUPPORT_OTHER_PAYMENT_URL || '',
      GITHUB_REPO_URL: process.env.GITHUB_REPO_URL || '',
      DEVELOPER_CONTACT_EMAIL: process.env.DEVELOPER_CONTACT_EMAIL || '',
    },
  };
};
