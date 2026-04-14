require('dotenv').config({ path: '.env' });

const iosBundle = (process.env.IOS_BUNDLE_IDENTIFIER || '').trim();
const androidPkg = (process.env.ANDROID_PACKAGE || '').trim();
const appEnv = (process.env.APP_ENV || '').trim();
const easBuildProfile = (process.env.EAS_BUILD_PROFILE || '').trim();
const isReleaseLikeBuild = appEnv === 'production' || easBuildProfile === 'production';
if (!iosBundle || !androidPkg) {
  const message =
    '[app.config] IOS_BUNDLE_IDENTIFIER and ANDROID_PACKAGE are required and cannot be empty.';
  if (isReleaseLikeBuild) {
    throw new Error(`${message} Refusing to continue for production/release build.`);
  }
  console.warn(`${message} Native release builds will fail until both are set.`);
}

module.exports = ({ config }: { config: any }) => {
  const existingPlugins: unknown[] = Array.isArray(config.plugins) ? config.plugins : [];
  const pluginsWithoutDevClient = existingPlugins.filter(
    (plugin) => !(typeof plugin === 'string' && plugin === 'expo-dev-client'),
  );
  const plugins =
    appEnv !== 'production'
      ? ['expo-dev-client', ...pluginsWithoutDevClient]
      : pluginsWithoutDevClient;

  return {
    ...config,
    plugins,
    owner: process.env.APP_OWNER || '',
    ios: {
      ...(config.ios || {}),
      bundleIdentifier: iosBundle,
    },
    android: {
      ...(config.android || {}),
      package: androidPkg,
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
