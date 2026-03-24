import { Config } from "payload";

export const cronJobOrgPlugin =
  (pluginOptions: {}) =>
  (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }; // Clone config to avoid mutating the original

    return config;
  };
