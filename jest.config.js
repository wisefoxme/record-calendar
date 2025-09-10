const { jestConfig } = require("@salesforce/sfdx-lwc-jest/config");

module.exports = {
  ...jestConfig,
  modulePathIgnorePatterns: [
    "<rootDir>/.localdevserver",
    "<rootDir>/node_modules",
    "<rootDir>/force-app/wisefoxme"
  ],
  moduleNameMapper: {
    "^c/(.*)$": "<rootDir>/force-app/main/default/lwc/$1/$1"
  }
};
