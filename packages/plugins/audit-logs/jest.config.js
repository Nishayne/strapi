module.exports = {
  displayName: 'audit-logs',
  preset: '../../../jest-preset.unit.js',
  testEnvironment: 'node',
  collectCoverageFrom: ['server/src/**/*.{js,ts}', '!server/src/**/*.d.ts', '!server/src/index.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  testMatch: ['**/server/src/**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
};
