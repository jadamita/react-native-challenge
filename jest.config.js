/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest for TypeScript files instead of jest-expo
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
      },
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock React Native modules for unit tests
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    // Force notifications service to use mock
    '^@/lib/services/notifications$': '<rootDir>/lib/services/__mocks__/notifications.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(zustand)/)'
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    '!lib/**/__tests__/**',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
    '**/*.test.{ts,tsx}'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  clearMocks: true,
  // Don't reset mock implementations (resetMocks: true would clear our manual mocks)
  resetMocks: false,
  forceExit: true,
  testTimeout: 10000,
};
