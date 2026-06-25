// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  ...storybook.configs["flat/recommended"],
  {
    files: ["app/**/*.ts", "app/**/*.tsx"],
    rules: {
      "no-magic-numbers": ["warn", {
        ignore: [0, 1, 2, 3, 5, 8, -1, 100, 1000, 1024, 60, 24, 7, 12, 200, 201, 204, 301, 302, 400, 401, 403, 404, 429, 500, 502, 503],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
      }],
    },
  },
]);

export default eslintConfig;
