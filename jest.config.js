module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|scss|sass|less)$': 'identity-obj-proxy',
    '^nr1$': '<rootDir>/__mocks__/nr1.js',
    '^@newrelic/nr-labs-components$':
      '<rootDir>/__mocks__/@newrelic/nr-labs-components.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/nerdlets/**/__tests__/**/*.test.js',
    '<rootDir>/src/**/__tests__/**/*.test.js',
  ],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
};
