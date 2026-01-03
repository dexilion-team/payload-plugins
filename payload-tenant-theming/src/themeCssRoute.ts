import path from "path";
import { readFile, access } from "fs/promises";
import * as sass from "sass";
import config from "@/payload.config";
import { Theme } from "./types";
import { getTenantName } from "@dexilion/payload-multi-tenant";
import { getTheme } from "./getTheme";

type ResolvedStyle = {
  path: string;
  type: "css" | "scss";
};

const resolveStyle = (style: string): ResolvedStyle => {
  const inferredType = style.endsWith(".scss") ? "scss" : "css";
  return { path: style, type: inferredType };
};

const resolveFilePath = (stylePath: string) =>
  path.isAbsolute(stylePath) ? stylePath : path.join(process.cwd(), stylePath);

const fileExists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const findNearestNodeModules = async (startDir: string) => {
  let currentDir = startDir;
  const { root } = path.parse(currentDir);

  while (true) {
    const candidate = path.join(currentDir, "node_modules");
    try {
      await access(candidate);
      return candidate;
    } catch {}

    if (currentDir === root) {
      return null;
    }

    currentDir = path.dirname(currentDir);
  }
};

const buildModuleCandidates = (
  nodeModulesPath: string,
  url: string,
): string[] => {
  const cleanUrl = url.startsWith("~") ? url.slice(1) : url;
  const parts = cleanUrl.split("/");

  const moduleName = cleanUrl.startsWith("@")
    ? parts.slice(0, 2).join("/")
    : parts[0];
  const subPathParts = cleanUrl.startsWith("@")
    ? parts.slice(2)
    : parts.slice(1);
  const subPath = subPathParts.join("/");

  const base = path.join(nodeModulesPath, moduleName);
  const candidates: string[] = [];

  const addExtVariants = (candidateBase: string) => {
    if (candidateBase.endsWith(".scss") || candidateBase.endsWith(".css")) {
      candidates.push(candidateBase);
      return;
    }

    candidates.push(`${candidateBase}.scss`);
    candidates.push(`${candidateBase}.css`);
    const dir = path.dirname(candidateBase);
    const name = path.basename(candidateBase);
    candidates.push(path.join(dir, `_${name}.scss`));
    candidates.push(path.join(dir, `_${name}.css`));
  };

  if (subPath) {
    addExtVariants(path.join(base, subPath));
    return candidates;
  }

  addExtVariants(path.join(base, moduleName));
  addExtVariants(path.join(base, "index"));
  addExtVariants(path.join(base, "scss", moduleName));
  addExtVariants(path.join(base, "scss", "index"));
  addExtVariants(path.join(base, "sass", moduleName));
  addExtVariants(path.join(base, "sass", "index"));

  return candidates;
};

const resolveModuleImport = async (
  url: string,
  nodeModulesPath: string | null,
) => {
  if (!nodeModulesPath) return null;

  const candidates = buildModuleCandidates(nodeModulesPath, url);
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
};

const loadThemeStyles = async (theme: Theme) => {
  const styles = theme.styles ?? [];
  if (styles.length === 0) {
    throw new Error(
      `[@dexilion/payload-tenant-theming] Theme "${theme.name}" has no styles configured.`,
    );
  }

  const chunks = await Promise.all(
    styles.map(async (style) => {
      const resolved = resolveStyle(style);
      const filePath = resolveFilePath(resolved.path);
      const scssDir = path.dirname(filePath);
      const nearestNodeModules = await findNearestNodeModules(scssDir);

      if (resolved.type === "scss") {
        const result = await sass.compileAsync(filePath, {
          loadPaths: [
            scssDir,
            ...(nearestNodeModules ? [nearestNodeModules] : []),
          ],
          importers: [
            {
              async findFileUrl(url) {
                if (
                  url.startsWith(".") ||
                  url.startsWith("/") ||
                  url.startsWith("file:")
                ) {
                  return null;
                }

                const resolvedModule = await resolveModuleImport(
                  url,
                  nearestNodeModules,
                );
                if (!resolvedModule) return null;
                return new URL(`file://${resolvedModule}`);
              },
            },
          ],
          style: "expanded",
        });
        return result.css;
      }

      return readFile(filePath, "utf8");
    }),
  );

  return chunks.join("\n");
};

export async function GET(request: Request) {
  const tenantName = await getTenantName();
  if (!tenantName) {
    return new Response("Tenant name not found.", { status: 400 });
  }

  const theme = await getTheme({
    config: await config,
    tenantName,
  });
  if (!theme) {
    return new Response("Tenant name not found.", { status: 400 });
  }

  try {
    const css = await loadThemeStyles(theme);
    return new Response(css, {
      status: 200,
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.log(error);

    return new Response("Failed to load theme styles.", { status: 500 });
  }
}
