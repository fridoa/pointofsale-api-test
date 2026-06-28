import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";
import { Status } from "allure-js-commons";

dotenv.config();

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["line"],
    [
      "allure-playwright",
      {
        resultsDir: "allure-results",
        detail: true,
        suiteTitle: true,
        links: {
          jira: {
            urlTemplate: (v: string) =>
              `https://fridoafriyanto3.atlassian.net/browse/${v}`,
          },
        },
        categories: [
          {
            name: "Product Defect: Assertion Failed",
            messageRegex: ".*Expected.*|.*Received.*",
            matchedStatuses: [Status.FAILED],
          },
          {
            name: "Test Defect: API Timeout",
            messageRegex: ".*Timeout.*|.*timeout.*",
            matchedStatuses: [Status.BROKEN],
          },
          {
            name: "Test Defect: Network/Connection Issue",
            messageRegex: ".*ECONNREFUSED.*|.*fetch failed.*",
            matchedStatuses: [Status.BROKEN],
          },
          {
            name: "Test Defect: TypeError / Script Error",
            messageRegex: ".*TypeError.*|.*ReferenceError.*",
            matchedStatuses: [Status.BROKEN],
          },
        ],
      },
    ],
  ],

  timeout: 30_000,

  use: {
    baseURL: process.env.BASE_URL,
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },

    trace: "on-first-retry",
  },
});
