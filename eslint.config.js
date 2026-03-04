// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    rules: {
      // No explicit any — forces proper typing throughout the codebase
      '@typescript-eslint/no-explicit-any': 'error',

      // No unused variables — keeps code clean
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Enforce type-only imports for interfaces and types
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],

      // No default exports in src/ — named exports only (expo-router app/ files are excluded below)
      'no-restricted-exports': ['error', { restrictDefaultExports: { direct: true } }],

      // Enforce no direct imports of infrastructure packages from domain or presentation layers
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['llama.rn'],
              message: 'Import llama.rn only in src/infrastructure/llm/. Use ILLMEngine interface instead.',
            },
            {
              group: ['whisper.rn'],
              message: 'Import whisper.rn only in src/infrastructure/whisper/. Use IWhisperEngine interface instead.',
            },
            {
              group: ['expo-sqlite'],
              message: 'Import expo-sqlite only in src/infrastructure/storage/sqliteDriver.ts.',
            },
            {
              group: ['@react-native-async-storage/async-storage'],
              message: 'Import AsyncStorage only in src/infrastructure/storage/asyncStorageDriver.ts.',
            },
            {
              group: ['expo-blur'],
              message: 'Import expo-blur only in src/design-system/components/GlassSurface.tsx.',
            },
            {
              group: ['expo-glass-effect'],
              message: 'Import expo-glass-effect only in src/design-system/components/GlassSurface.tsx.',
            },
          ],
        },
      ],

      // Prefer const over let where variable is never reassigned
      'prefer-const': 'error',

      // No console statements in production code
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // expo-router requires default exports in app/ — override the restriction there
    files: ['app/**/*.tsx', 'app/**/*.ts'],
    rules: {
      'no-restricted-exports': 'off',
    },
  },
  {
    // Infrastructure files are allowed to import their respective packages
    files: ['src/infrastructure/llm/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['src/infrastructure/whisper/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['src/infrastructure/storage/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['src/design-system/components/GlassSurface.tsx'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
]);
