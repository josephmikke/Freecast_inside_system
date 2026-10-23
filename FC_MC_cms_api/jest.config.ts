/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 * This is test
 */

export default {
  setupFiles: ['<rootDir>/utils/jest-setup-env.ts'],
  setupFilesAfterEnv: ['jest-extended/all'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 90000,
  coverageDirectory: './coverage',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  // tsconfig resolves bare 'routes/...' imports via baseUrl; give Jest the same root so
  // those modules resolve at runtime too.
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    '/opt/nodejs/powertools/(.*)': '<rootDir>/layers/powertools/nodejs/$1',
    '@aws-lambda-powertools/(.*)': '<rootDir>/layers/powertools/nodejs/node_modules/@aws-lambda-powertools/$1',
    '@middy/(.*)': '<rootDir>/layers/powertools/nodejs/node_modules/@middy/$1',
    'aws-lambda': '<rootDir>/layers/powertools/nodejs/node_modules/@types/aws-lambda',
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
};
