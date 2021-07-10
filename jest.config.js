module.exports = {
  detectOpenHandles: true,
  testEnvironment: 'node',
  roots: ['./test'],
  testMatch: ['**/*.spec.+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
}
