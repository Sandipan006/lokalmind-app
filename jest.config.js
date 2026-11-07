module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    // tsconfig paths point at the .d.ts build for typecheck; Jest needs the runtime entry.
    '^expo-file-system/legacy$': '<rootDir>/node_modules/expo-file-system/legacy.ts',
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/dist/'],
};
