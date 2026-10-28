module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/dist/'],
};
