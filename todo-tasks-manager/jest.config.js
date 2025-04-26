// jest.config.js
module.exports = {
  testEnvironment: "jest-environment-jsdom", // Use jsdom to simulate browser environment
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"], // Optional: Run setup code before tests
  // Explicitly tell Jest to look for tests only in the src directory
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}",
    "<rootDir>/src/**/*.{spec,test}.{ts,tsx}"
  ],
  transform: {
    // Only use ts-jest for ts/tsx files
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json", // Explicitly point to tsconfig
      },
    ],
    // Remove babel-jest transform for now
    // "^.+\\.jsx?$": "babel-jest", 
  },
  moduleNameMapper: {
    // Force module uuid to resolve with the CJS entry point, because Jest does not support package.json.exports. See https://github.com/uuidjs/uuid/issues/451
    // uuid: require.resolve('uuid'), // Example if uuid caused issues
    // Handle CSS Modules or other non-JS imports
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    // Explicitly map React to the project's version to avoid duplicates
    '^react$': '<rootDir>/node_modules/react',
  },
  // Explicitly set the default ignore pattern with corrected escaping
  transformIgnorePatterns: [
    "/node_modules/",
    "\\\\.pnp\\\\.[^\\\\]+$" // Correctly escaped backslashes
  ],
  // Collect coverage from src directory, excluding types and constants
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types.ts",
    "!src/constants.ts",
    "!src/client/main.ts", // Exclude entry point if it has no testable logic
    "!src/server.ts", // Exclude server setup if tested separately
  ],
  // Add other Jest options as needed
}; 