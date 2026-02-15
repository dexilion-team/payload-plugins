import path from "path";
import { pathToFileURL } from "url";
import { Command, CommanderError } from "commander";
import { config as loadDotenv } from "dotenv";
import { getPayload, type SanitizedConfig } from "payload";
import { syncRemotePayload } from "./sync";

type ValidatedCLIArgs = {
  collections: string[];
  endpointPath?: string;
  limit?: number;
  localConfigPath: string;
  remoteAPIKey: string;
  remoteAPIKeyCollection: string;
  remoteURL: string;
  priorityCollections?: string[];
};

loadDotenv({
  override: false,
  quiet: true,
  path: path.resolve(process.cwd(), ".env"),
});
loadDotenv({
  override: false,
  quiet: true,
  path: path.resolve(process.cwd(), ".env.local"),
});
loadDotenv({
  override: false,
  quiet: true,
  path: path.resolve(process.cwd(), ".env.development"),
});

const parseLimit = (value: string): number => {
  const limit = Number.parseInt(value, 10);
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error(`Invalid --limit value: ${value}`);
  }

  return limit;
};

const parseCollections = (value: string): string[] => {
  const collections = value
    .split(",")
    .map((collection) => collection.trim())
    .filter((collection) => collection.length > 0);

  if (collections.length === 0) {
    throw new Error(
      "Invalid --collections value: provide at least one collection slug.",
    );
  }

  return [...new Set(collections)];
};

const getValidatedArgs = (): ValidatedCLIArgs => {
  const program = new Command()
    .name("payload-sync")
    .description("Sync content from a remote Payload CMS instance.")
    .requiredOption("--url <url>", "Remote Payload API base URL")
    .requiredOption("--api-key <key>", "Remote API key")
    .requiredOption(
      "--api-key-collection <slug>",
      "Collection slug used to validate the API key",
    )
    .requiredOption(
      "--local-config <path>",
      "Path to local Payload config file",
    )
    .requiredOption(
      "--collections <collection,collection,...>",
      "Comma-separated list of collections to sync",
      parseCollections,
    )
    .option(
      "--limit <number>",
      "Maximum number of documents per request",
      parseLimit,
    )
    .option(
      "--priority-collections <collection,collection,...>",
      "Comma-separated list of collections to prioritize during sync",
    )
    .exitOverride();

  program.parse(process.argv);

  const options = program.opts<{
    endpointPath?: string;
    collections: string[];
    limit?: number;
    localConfig: string;
    apiKey: string;
    apiKeyCollection: string;
    url: string;
  }>();

  return {
    endpointPath: options.endpointPath,
    collections: options.collections,
    limit: options.limit,
    localConfigPath: options.localConfig,
    remoteAPIKey: options.apiKey,
    remoteAPIKeyCollection: options.apiKeyCollection,
    remoteURL: options.url,
  };
};

const resolveConfig = async (configPath: string): Promise<SanitizedConfig> => {
  const absolutePath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath);
  const moduleURL = pathToFileURL(absolutePath).href;
  const configModule = (await import(moduleURL)) as Record<string, unknown>;
  const configExport =
    configModule.default ?? configModule.config ?? configModule.payloadConfig;

  if (!configExport) {
    throw new Error(`No Payload config export found in ${absolutePath}`);
  }

  return configExport as SanitizedConfig;
};

const run = async () => {
  let validated: ValidatedCLIArgs;
  try {
    validated = getValidatedArgs();
  } catch (error) {
    if (
      error instanceof CommanderError &&
      error.code === "commander.helpDisplayed"
    ) {
      return;
    }

    throw error;
  }

  const config = await resolveConfig(validated.localConfigPath);
  const payload = await getPayload({ config });

  try {
    await syncRemotePayload(
      {
        collections: validated.collections,
        priorityCollections: validated.priorityCollections,
        limit: validated.limit,
        localPayload: payload,
        remote: {
          apiKey: validated.remoteAPIKey,
          apiKeyCollection: validated.remoteAPIKeyCollection,
          baseURL: validated.remoteURL,
        },
      },
      config,
    );
  } finally {
    if (typeof payload.destroy === "function") {
      await payload.destroy();
    }
  }
};

run()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[@dexilion/payload-sync] Sync failed: ${message}`, error);
    process.exitCode = 1;
  })
  .then(() => {
    process.exit();
  });
