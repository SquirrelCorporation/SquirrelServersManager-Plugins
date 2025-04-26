// jest.setup.js
// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Polyfill for structuredClone for jsdom environment (React 18+)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
// import "@testing-library/jest-dom"; // Use require for commonjs compatibility in setup file
require("@testing-library/jest-dom"); 