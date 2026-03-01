/**
 * Turbopack/webpack loader: theme-css-loader
 *
 * Intercepts every .tsx/.jsx file that lives under src/themes/ and:
 *
 *   1. Rewrites the current source file:
 *      - CSS Module imports (.module.scss / .module.css):
 *          Replaced with an inline Proxy declaration that maps class names to
 *          deterministically scoped names (e.g. `.PostTile` → `.PostTile-a3f9c`).
 *      - Plain scss/css imports (side-effect only):
 *          Replaced with a no-op comment of the same byte length to preserve
 *          source map positions.
 *
 *   2. Maintains a complete, correct public/themes/<themeName>/theme.generated.css
 *      bundle using the following strategy:
 *
 *      Cold start (no prior rebuild recorded for this theme):
 *        Scans all .tsx/.jsx files under src/themes/<themeName>/, compiles every
 *        CSS/SCSS import, writes the full bundle, and records a rebuild timestamp.
 *        All compiled results are stored in a module-level compilation cache.
 *        Every subsequent request processed during the same server session finds
 *        its CSS already compiled — O(1) cache lookup instead of O(N) recompile.
 *
 *      Warm start — staleness check (per invocation):
 *        Compares the mtime of the current .tsx resource and each of its CSS
 *        imports against the recorded rebuild timestamp.
 *          • All older  → cache hit; no rebuild, no disk write.
 *          • Any newer  → full cache bust for the theme, full rebuild, new timestamp.
 *        The .tsx mtime check handles the "new file importing existing .scss" edge
 *        case — the .scss is old, but the .tsx is new, so the rebuild picks up the
 *        previously missing CSS.
 *
 *      Deletions are safe: a full rebuild scans only existing files, so deleted
 *      imports are automatically absent from the new bundle.
 *
 *      In production (NODE_ENV=production):
 *        - The Sass compiler uses style:"compressed" to minify the output.
 *        - Source maps are NOT generated (no .map file written).
 *      In development:
 *        - Output uses style:"expanded" for readability.
 *        - A merged source map (theme.generated.css.map) is written alongside
 *          the bundle, mapping every output line back to its origin .scss file.
 *          The bundle's final line carries a sourceMappingURL comment so
 *          DevTools can locate the map automatically.
 *        - Source map generation forces buffered mode internally (line counts
 *          per chunk are needed before either file can be written), regardless
 *          of the bufferedWrite option.
 *
 * Why intercept .tsx (not .scss):
 *   Turbopack's built-in Sass loader takes priority over user rules for .scss
 *   files. Intercepting .tsx avoids this conflict entirely.
 */

import path from "node:path";
import fs from "node:fs";
import { createHash } from "node:crypto";
import * as sass from "sass";

// ---------------------------------------------------------------------------

/** Options that can be passed to the theme CSS loader in next.config.ts. */
interface ThemeCssLoaderOptions {
  /** Directory containing theme source files. Default: `"src/themes"`. */
  themesDir?: string;
  /** Directory where the generated CSS bundles are written. Default: `"public/themes"`. */
  outputDir?: string;
  /** Accumulate CSS in memory before writing in a single call. Default: `true`. */
  bufferedWrite?: boolean;
  /** Discard cached data for all themes other than the current one. Default: `false`. */
  evictOtherThemes?: boolean;
  /**
   * Subdirectory (relative to each theme's output directory) where referenced
   * assets (fonts, images, SVGs) are copied. Default: `"assets"`.
   *
   * Example: with outputDir="public/themes" and assetsSubdir="assets", a
   * font-awesome font ends up at
   *   public/themes/ci/assets/vendor/font-awesome/fonts/fontawesome-webfont.woff2
   * and the URL in the generated CSS becomes
   *   /themes/ci/assets/vendor/font-awesome/fonts/fontawesome-webfont.woff2
   */
  assetsSubdir?: string;
}

/** Minimal webpack/Turbopack loader `this` context. */
interface LoaderContext {
  /** Absolute path to the file currently being transformed. */
  resourcePath: string;
  /** Returns the loader options as defined in next.config.ts. */
  getOptions(): ThemeCssLoaderOptions | undefined;
  /** Finalises the loader and hands the result back to the bundler. */
  callback(
    err: Error | null,
    result?: string,
    sourceMap?: object | string | null,
  ): void;
}

/** Compiled CSS entry stored in the per-theme compilation cache. */
interface ThemeCacheEntry {
  /** Present only during a full rebuild; deleted after writing to disk. */
  finalCss?: string;
  /** Present only during a full rebuild; deleted after writing to disk. */
  finalMap?: SassSourceMap | null;
  /** Maps original class names to scoped names; kept for source rewriting. */
  classMap: Record<string, string>;
}

/** Source-map object as produced by the Sass compiler (subset of Source Map v3). */
interface SassSourceMap {
  version: number;
  file?: string;
  sourceRoot?: string;
  sources: string[];
  sourcesContent?: string[];
  names: string[];
  mappings: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------

const CWD = process.cwd();
const NODE_MODULES = path.join(CWD, "node_modules");
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// Module-level persistent state — survives HMR cycles, reset on server restart
// ---------------------------------------------------------------------------

/**
 * themeName → Map<absPath, { classMap: Record<string, string> }>
 *
 * Per-theme compilation cache. Populated during a full rebuild. Entries are
 * reused on subsequent warm requests when no CSS file has been modified.
 * Cleared (per theme) on a cache bust before the next full rebuild.
 *
 * NOTE: finalCss is intentionally absent here. It is only needed transiently
 * during rebuildTheme to write the bundle to disk. Once the bundle is written
 * it is stripped from every entry so that compiled CSS strings do not occupy
 * memory for the lifetime of the server process.
 */
const compilationCache = new Map<string, Map<string, ThemeCacheEntry>>();

/**
 * themeName → number (Date.now() at the time of the last full rebuild)
 *
 * Absent key signals a cold start for that theme.
 */
const themeLastRebuild = new Map<string, number>();

/**
 * absPath → mtime (ms) at the time the asset was last copied.
 *
 * Persists across HMR cycles. An asset is only re-copied when its mtime
 * has advanced beyond the recorded value, avoiding redundant disk I/O on
 * warm rebuilds where only SCSS/TSX files changed.
 */
const assetMtimeCache = new Map<string, number>();

// ---------------------------------------------------------------------------
// Source map helpers
// ---------------------------------------------------------------------------

const VLQ_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const VLQ_DECODE = new Uint8Array(128);
for (let i = 0; i < 64; i++) VLQ_DECODE[VLQ_CHARS.charCodeAt(i)] = i;

function vlqEncode(n: number): string {
  let v = n < 0 ? (-n << 1) | 1 : n << 1;
  let out = "";
  do {
    const digit = v & 31;
    v >>>= 5;
    out += VLQ_CHARS[v ? digit | 32 : digit];
  } while (v);
  return out;
}

function vlqDecodeSegment(seg: string): number[] {
  const vals: number[] = [];
  let i = 0;
  while (i < seg.length) {
    let v = 0,
      shift = 0;
    let d: number;
    do {
      d = VLQ_DECODE[seg.charCodeAt(i++)] ?? 0;
      v |= (d & 31) << shift;
      shift += 5;
    } while (d & 32);
    vals.push(v & 1 ? -(v >> 1) : v >> 1);
  }
  return vals;
}

/**
 * Builds a mapping from 1-based output CSS line number to the absolute path of
 * the first source .scss file that contributed to that line, according to the
 * Sass source map.
 *
 * This is used by rewriteAndCopyAssets to resolve relative url() paths in the
 * compiled CSS back to the .scss file that originally contained them — which
 * may be a deep vendor file (e.g. node_modules/font-awesome/scss/_path.scss)
 * rather than the top-level entry point.
 *
 * @param map  The SassSourceMap returned by compileSass.
 * @returns    Map from 1-based line number → absolute source file path.
 *             Lines with no source mapping are absent from the map.
 */
function buildLineSourceMap(map: SassSourceMap): Map<number, string> {
  // Resolve each source entry to an absolute path.
  const sources = (map.sources ?? []).map((src) => {
    if (src.startsWith("file://")) return new URL(src).pathname;
    if (path.isAbsolute(src)) return src;
    // Sass may emit paths relative to the .scss file's directory; resolve from
    // CWD as a safe fallback (the caller falls back gracefully when absent).
    return path.resolve(CWD, src);
  });

  const result = new Map<number, string>();
  let lineNo = 1; // 1-based output line counter

  // Delta state carried across ALL segments across ALL lines.
  // genCol resets to 0 at each new line; srcIdx/srcLine/srcCol carry over.
  let srcIdx = 0,
    srcLine = 0,
    srcCol = 0;

  for (const lineStr of (map.mappings ?? "").split(";")) {
    let firstOriginThisLine: string | undefined;

    for (const seg of lineStr.split(",")) {
      if (!seg) continue;
      const v = vlqDecodeSegment(seg);
      // v[0] = genCol delta (always present); v[1..3] = src index/line/col deltas
      if (v.length >= 4) {
        srcIdx += v[1]!;
        srcLine += v[2]!;
        srcCol += v[3]!;
        // Only record the FIRST source origin encountered on this output line.
        if (firstOriginThisLine === undefined) {
          const absOrigin = sources[srcIdx];
          if (absOrigin) firstOriginThisLine = absOrigin;
        }
      }
    }

    if (firstOriginThisLine !== undefined) {
      result.set(lineNo, firstOriginThisLine);
    }
    lineNo++;
  }

  return result;
}

/**
 * Rewrites relative url() references in a compiled CSS string so that assets
 * are served from their copied location under the theme's public output
 * directory, and copies those assets to disk.
 *
 * - Absolute or protocol-relative URLs (/..., https://, data:, etc.) are left
 *   unchanged.
 * - Relative URLs are resolved against the origin .scss file (from the source
 *   map), copied to
 *     <absOutputDir>/<themeName>/<assetsSubdir>/vendor/<rel-from-node_modules>
 *   or
 *     <absOutputDir>/<themeName>/<assetsSubdir>/src/<rel-from-cwd>
 *   and rewritten to the corresponding absolute web path:
 *     /<outputDirBasename>/<themeName>/<assetsSubdir>/vendor/...
 *
 * Assets whose mtime has not changed since the last copy are skipped (the
 * existing copy on disk is still valid). The assetMtimeCache map is mutated
 * in place.
 *
 * @param css             Compiled CSS string for one SCSS file.
 * @param map             Source map produced by compileSass for that file.
 * @param absOutputDir    Absolute path to the themes output root.
 * @param outputDirBase   Basename of absOutputDir (e.g. "public"), used as the
 *                        first segment of the rewritten web URL so that the
 *                        path is rooted in the URL space correctly. Actually
 *                        we use the *relative* URL from the webroot which is
 *                        determined by which directory Next.js serves static
 *                        files from — for public/ that is «/».
 * @param themeName       Current theme name, used in destination paths.
 * @param assetsSubdir    Subdirectory name under the theme output dir.
 * @param localAssetMtimeCache  Persistent mtime cache (mutated).
 * @returns               CSS string with url() values rewritten.
 */
function rewriteAndCopyAssets(
  css: string,
  map: SassSourceMap,
  absOutputDir: string,
  themeName: string,
  assetsSubdir: string,
  localAssetMtimeCache: Map<string, number>,
): string {
  const lineSourceMap = buildLineSourceMap(map);
  const themeOutDir = path.join(absOutputDir, themeName);

  // The web path prefix for rewritten URLs.
  // public/themes/ci/assets/... → /themes/ci/assets/...
  // We derive this by taking the path of themeOutDir relative to CWD/public
  // i.e., strip the leading "public" segment and prepend "/".
  const publicDir = path.join(CWD, "public");
  const themeWebBase =
    "/" + path.relative(publicDir, themeOutDir).split(path.sep).join("/");

  // Regex that matches url(...) with any quoting style.
  // Groups: [1] single-quoted value | [2] double-quoted value | [3] unquoted value
  const URL_RE = /url\(\s*(?:'([^']*)'|"([^"]*)"|([^'"\s)]+))\s*\)/g;

  let lineNo = 1;
  let pos = 0; // current character index in `css`
  let result = "";
  let lastReplace = 0; // end of the last replacement in css

  for (const m of css.matchAll(URL_RE)) {
    const fullMatch = m[0]!;
    const matchIndex = m.index!;

    // Advance lineNo to the line that contains this match.
    while (pos <= matchIndex) {
      if (css[pos] === "\n") lineNo++;
      pos++;
    }

    const rawUrl = (m[1] ?? m[2] ?? m[3] ?? "").trim();

    // Skip data URIs, protocol-relative, absolute web paths, and empty.
    if (
      !rawUrl ||
      rawUrl.startsWith("data:") ||
      rawUrl.startsWith("//") ||
      rawUrl.startsWith("/") ||
      /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(rawUrl)
    ) {
      continue;
    }

    // Strip query string and fragment for file resolution; preserve them for
    // the rewritten URL.
    const qIdx = rawUrl.indexOf("?");
    const hIdx = rawUrl.indexOf("#");
    const splitIdx =
      qIdx !== -1 && (hIdx === -1 || qIdx < hIdx)
        ? qIdx
        : hIdx !== -1
          ? hIdx
          : rawUrl.length;
    const filePart = rawUrl.slice(0, splitIdx);
    const suffix = rawUrl.slice(splitIdx); // "?v=4.7.0" or "#anchor" or ""

    if (!filePart) continue;

    // Find the origin .scss file for this CSS line.
    const originScss = lineSourceMap.get(lineNo);
    if (!originScss) continue;

    // Resolve the asset path relative to the origin .scss file's directory.
    const absAsset = path.resolve(path.dirname(originScss), filePart);

    // Check the file exists before doing anything.
    let mtime: number;
    try {
      mtime = fs.statSync(absAsset).mtimeMs;
    } catch {
      continue; // File not found — leave URL unchanged.
    }

    // Determine destination relative path.
    let destRel: string;
    if (absAsset.startsWith(NODE_MODULES + path.sep)) {
      destRel = path.join(
        assetsSubdir,
        "vendor",
        path.relative(NODE_MODULES, absAsset),
      );
    } else {
      destRel = path.join(assetsSubdir, "src", path.relative(CWD, absAsset));
    }

    const fullDest = path.join(themeOutDir, destRel);

    // Copy only when mtime changed.
    if (localAssetMtimeCache.get(absAsset) !== mtime) {
      try {
        fs.mkdirSync(path.dirname(fullDest), { recursive: true });
        fs.copyFileSync(absAsset, fullDest);
        localAssetMtimeCache.set(absAsset, mtime);
      } catch {
        continue; // Copy failed — leave URL unchanged.
      }
    }

    // Build the rewritten URL: absolute web path.
    const webPath =
      themeWebBase + "/" + destRel.split(path.sep).join("/") + suffix;

    // Splice the rewritten url() into the result.
    result += css.slice(lastReplace, matchIndex) + `url('${webPath}')`;
    lastReplace = matchIndex + fullMatch.length;
  }

  result += css.slice(lastReplace);
  return result;
}

/**
 * Merges source maps from multiple CSS chunks into one source map that covers
 * the entire concatenated bundle.
 *
 * Each chunk's source indices are offset by the number of sources contributed
 * by earlier chunks so that all segments point into the single merged sources
 * array.  Segments are re-delta-encoded across the whole merged file.
 *
 * @param {Array<{ css: string, map: object|null }>} chunks
 * @param {string} outFile  Absolute path of the output CSS file.
 * @returns {object}  Merged source map as a plain JSON-serialisable object.
 */
function mergeSourceMaps(
  chunks: Array<{ css: string; map: SassSourceMap | null }>,
  outFile: string,
): SassSourceMap {
  const mapDir = path.dirname(outFile);
  const mergedSources = [];
  const mergedSourcesContent = [];
  const mergedNames = [];
  // One array of segments per output CSS line.
  const mergedLineGroups = [];

  for (const { css, map } of chunks) {
    const chunkLineCount = (css.match(/\n/g) ?? []).length + 1;
    const startGroup = mergedLineGroups.length;

    if (!map) {
      for (let i = 0; i < chunkLineCount; i++) mergedLineGroups.push([]);
      continue;
    }

    const sourceOffset = mergedSources.length;
    const nameOffset = mergedNames.length;

    // Normalise source paths to be relative from the .map file's directory.
    for (const src of map.sources ?? []) {
      // Sass may return file:// URLs or absolute paths.
      const abs = src.startsWith("file://")
        ? new URL(src).pathname
        : path.resolve(src);
      mergedSources.push(path.relative(mapDir, abs).split(path.sep).join("/"));
    }
    if (map.sourcesContent) mergedSourcesContent.push(...map.sourcesContent);
    if (map.names) mergedNames.push(...map.names);

    // Decode chunk mappings to absolute-position tuples, applying source offset.
    let absGenCol = 0,
      absSrcIdx = 0,
      absSrcLine = 0,
      absSrcCol = 0,
      absName = 0;
    for (const lineStr of (map.mappings ?? "").split(";")) {
      absGenCol = 0;
      const lineSegs = [];
      for (const seg of lineStr.split(",")) {
        if (!seg) continue;
        const v = vlqDecodeSegment(seg);
        absGenCol += v[0]!;
        const fields = [absGenCol];
        if (v.length >= 4) {
          absSrcIdx += v[1]!;
          absSrcLine += v[2]!;
          absSrcCol += v[3]!;
          fields.push(absSrcIdx + sourceOffset, absSrcLine, absSrcCol);
          if (v.length >= 5) {
            absName += v[4]!;
            fields.push(absName + nameOffset);
          }
        }
        lineSegs.push(fields);
      }
      mergedLineGroups.push(lineSegs);
    }
    // Pad to the actual CSS line count if the Sass map has fewer groups.
    while (mergedLineGroups.length - startGroup < chunkLineCount)
      mergedLineGroups.push([]);
  }

  // Re-encode all line groups with correct cross-chunk deltas.
  let prevGenCol = 0,
    prevSrcIdx = 0,
    prevSrcLine = 0,
    prevSrcCol = 0,
    prevName = 0;
  const mappingLines = mergedLineGroups.map((segs) => {
    prevGenCol = 0;
    return segs
      .map((fields) => {
        let s = vlqEncode(fields[0]! - prevGenCol);
        prevGenCol = fields[0]!;
        if (fields.length >= 4) {
          s += vlqEncode(fields[1]! - prevSrcIdx);
          prevSrcIdx = fields[1]!;
          s += vlqEncode(fields[2]! - prevSrcLine);
          prevSrcLine = fields[2]!;
          s += vlqEncode(fields[3]! - prevSrcCol);
          prevSrcCol = fields[3]!;
          if (fields.length >= 5) {
            s += vlqEncode(fields[4]! - prevName);
            prevName = fields[4]!;
          }
        }
        return s;
      })
      .join(",");
  });

  return {
    version: 3,
    file: path.basename(outFile),
    sourceRoot: "",
    sources: mergedSources,
    ...(mergedSourcesContent.length
      ? { sourcesContent: mergedSourcesContent }
      : {}),
    names: mergedNames,
    mappings: mappingLines.join(";"),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractThemeName(
  resourcePath: string,
  absThemesDir: string,
): string | null {
  const rel = path.relative(absThemesDir, resourcePath);
  // If resourcePath is not under absThemesDir the relative path starts with ".."
  if (rel.startsWith("..")) return null;
  const segments = rel.split(path.sep);
  // Need at least two segments: <themeName>/<file>
  if (segments.length < 2) return null;
  return segments[0]!;
}

function generateSuffix(absPath: string): string {
  return createHash("md5")
    .update(path.relative(CWD, absPath))
    .digest("hex")
    .slice(0, 5);
}

function compileSass(absPath: string): {
  css: string;
  map: SassSourceMap | null;
} {
  const result = sass.compile(absPath, {
    loadPaths: [path.dirname(absPath), NODE_MODULES],
    // Use compressed output in production to minify the generated CSS bundle.
    style: IS_PRODUCTION ? "compressed" : "expanded",
    // Source maps are always generated so that rewriteAndCopyAssets can
    // resolve relative url() paths back to their origin .scss file regardless
    // of environment.  In production, sourcesContent is omitted to keep the
    // map small; it is used transiently for URL resolution and never written
    // to disk in production.
    sourceMap: true,
    sourceMapIncludeSources: !IS_PRODUCTION,
    logger: sass.Logger.silent,
    silenceDeprecations: [
      "legacy-js-api",
      "import",
      "global-builtin",
      "color-functions",
      "if-function",
      "slash-div",
    ],
  });
  return {
    css: result.css,
    map: (result.sourceMap as SassSourceMap | undefined) ?? null,
  };
}

function buildClassMap(rawCss: string, suffix: string): Record<string, string> {
  const classMap: Record<string, string> = {};
  const re =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|url\([^)]*\))|\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
  for (const [, skip, name] of rawCss.matchAll(re)) {
    if (skip !== undefined) continue;
    if (name && !(name in classMap)) classMap[name] = `${name}-${suffix}`;
  }
  return classMap;
}

function applyClassMap(
  rawCss: string,
  classMap: Record<string, string>,
): string {
  return rawCss.replace(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|url\([^)]*\))|\.([a-zA-Z_][a-zA-Z0-9_-]*)/g,
    (_match: string, skip: string | undefined, cls: string | undefined) =>
      skip !== undefined ? skip : `.${classMap[cls ?? ""] ?? cls ?? ""}`,
  );
}
/**
 * Strips CSS Modules `:global(...)` and `:local(...)` wrappers from compiled
 * CSS, replacing them with their inner selector content.
 *
 * Sass compiles `.Foo { :global(footer) & { … } }` into
 * `:global(footer) .Foo { … }` — passing the pseudo-class through verbatim
 * because Sass has no knowledge of CSS Modules semantics.  Browsers see
 * `:global(footer)` as an unknown pseudo-class that never matches, so the
 * rule is silently ignored.
 *
 * This function resolves that by unwrapping:
 *   `:global(footer .Bar)` → `footer .Bar`
 *   `:local(.Baz)`         → `.Baz`
 *
 * Nested parentheses inside the wrapper (e.g. `:global(li:nth-child(2))`)
 * are handled correctly via depth tracking.
 */
function unwrapCssModuleGlobals(css: string): string {
  // Matches the start of :global( or :local( — the inner content and closing
  // paren are then found via depth-tracking in the replacement loop.
  const RE = /:(?:global|local)\(/g;
  let result = "";
  let lastIndex = 0;

  for (const m of css.matchAll(RE)) {
    const wrapperStart = m.index!;
    const innerStart = wrapperStart + m[0].length; // first char after "("

    // Walk forward to find the matching closing paren.
    let depth = 1;
    let j = innerStart;
    while (j < css.length && depth > 0) {
      const ch = css[j];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      j++;
    }
    // j now points one past the closing ")"
    // Inner content: css.slice(innerStart, j - 1)

    result += css.slice(lastIndex, wrapperStart) + css.slice(innerStart, j - 1);
    lastIndex = j;
  }

  result += css.slice(lastIndex);
  return result;
}
// ---------------------------------------------------------------------------
// Regex for CSS/SCSS imports in .tsx/.jsx
// Captures:
//   [1] full statement (without trailing newline)
//   [2] local identifier (undefined for side-effect imports)
//   [3] import path string
//   [4] trailing newline
// ---------------------------------------------------------------------------
const IMPORT_RE =
  /^(import\s+(?:(\w+)\s+from\s+)?["']([^"']+\.(?:scss|css))["'];?)(\r?\n?)/gm;

/**
 * Compiles all CSS/SCSS imports found in a single .tsx/.jsx file, storing
 * results into themeCache.  Already-cached entries are skipped (deduplication).
 *
 * @param {string} tsxPath  Absolute path to the source file.
 * @param {Map}    themeCache  The per-theme compilation cache to read from and
 *                             write to.  Mutated in place.
 */
function collectCssFromFile(
  tsxPath: string,
  themeCache: Map<string, ThemeCacheEntry>,
): void {
  let src;
  try {
    src = fs.readFileSync(tsxPath, "utf8");
  } catch {
    return;
  }

  const importRe = new RegExp(IMPORT_RE.source, IMPORT_RE.flags);
  for (const [, , , importPath] of src.matchAll(importRe)) {
    if (!importPath) continue;
    const absPath = path.resolve(path.dirname(tsxPath), importPath);

    // Skip if the file doesn't exist or was already compiled by another .tsx.
    if (!fs.existsSync(absPath) || themeCache.has(absPath)) continue;

    try {
      const { css: rawCss, map } = compileSass(absPath);
      const isModule = /\.module\.(scss|css)$/.test(importPath);
      let finalCss, classMap;
      if (isModule) {
        const suffix = generateSuffix(absPath);
        classMap = buildClassMap(rawCss, suffix);
        finalCss = applyClassMap(rawCss, classMap);
      } else {
        classMap = {};
        finalCss = rawCss;
      }
      // Unwrap CSS Modules :global(...) / :local(...) pseudo-classes that Sass
      // passes through verbatim — browsers don't understand them.
      finalCss = unwrapCssModuleGlobals(finalCss);
      themeCache.set(absPath, { finalCss, finalMap: map, classMap });
    } catch (error) {
      console.error(
        `[@dexilion/payload-tenant-theming] Failed to compile ${absPath} imported from ${tsxPath}. ${error}`,
      );
      continue;
    }
  }
}

/**
 * Performs a full rebuild of the CSS bundle for the given theme:
 *   1. Scans all .tsx/.jsx files under src/themes/<themeName>/.
 *   2. Compiles every CSS/SCSS import, writing results into themeCache.
 *   3. Writes the complete bundle to public/themes/<themeName>/theme.generated.css.
 *
 * @param {string}  themeName
 * @param {Map}     themeCache     Fresh (empty) cache map to populate.
 * @param {string}  absThemesDir   Absolute path to the themes root directory.
 * @param {string}  absOutputDir   Absolute path to the output root directory.
 * @param {boolean} bufferedWrite  When true, accumulate all CSS in a single
 *                                 string and write it in one call instead of
 *                                 many sequential fd writes.  Faster on slow
 *                                 storage at the cost of ~1× bundle size in
 *                                 peak memory during the write.
 */
function rebuildTheme(
  themeName: string,
  themeCache: Map<string, ThemeCacheEntry>,
  absThemesDir: string,
  absOutputDir: string,
  bufferedWrite = false,
  assetsSubdir = "assets",
): void {
  const themeDir = path.join(absThemesDir, themeName);
  if (!fs.existsSync(themeDir)) return;

  // Recursively collect every .tsx/.jsx under the theme directory.
  const queue = [themeDir];
  const tsxFiles = [];
  while (queue.length) {
    const dir = queue.pop()!;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        queue.push(full);
      } else if (/\.(tsx|jsx)$/.test(entry.name)) {
        tsxFiles.push(full);
      }
    }
  }

  for (const tsxPath of tsxFiles) {
    collectCssFromFile(tsxPath, themeCache);
  }

  // ── Asset rewriting pass ──────────────────────────────────────────────────
  // Now that all chunks are compiled (and source maps are available), resolve
  // relative url() paths, copy referenced assets, and rewrite URLs to their
  // public web paths.  This must happen before the write pass below, which
  // consumes finalCss and strips it from the cache entries.
  for (const entry of themeCache.values()) {
    if (!entry.finalCss || !entry.finalMap) continue;
    entry.finalCss = rewriteAndCopyAssets(
      entry.finalCss,
      entry.finalMap,
      absOutputDir,
      themeName,
      assetsSubdir,
      assetMtimeCache,
    );
    // In production the map is only needed for URL resolution — discard it
    // now to avoid inflating the buffered write or the source-map merge.
    if (IS_PRODUCTION) entry.finalMap = null;
  }

  const outDir = path.join(absOutputDir, themeName);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "theme.generated.css");
  const mapFile = path.join(outDir, "theme.generated.css.map");
  const sourceMappingComment = IS_PRODUCTION
    ? ""
    : "\n/*# sourceMappingURL=theme.generated.css.map */";

  // Source map generation requires knowing every chunk's CSS before writing
  // either file, so it always uses the buffered path regardless of the
  // bufferedWrite option.
  if (!IS_PRODUCTION || bufferedWrite) {
    // ── Buffered write ───────────────────────────────────────────────────────
    // Concatenate everything into one string then write it with a single
    // writeFileSync call.  One syscall instead of N — much faster on slow HDDs
    // or network storage.  Peak memory cost: ~1× bundle size during join.
    const chunks: Array<{ css: string; map: SassSourceMap | null }> = [];
    for (const entry of themeCache.values()) {
      chunks.push({ css: entry.finalCss ?? "", map: entry.finalMap ?? null });
      delete entry.finalCss;
      delete entry.finalMap;
    }
    fs.writeFileSync(
      outFile,
      chunks.map((c) => c.css).join("\n") + sourceMappingComment,
      "utf8",
    );
    if (!IS_PRODUCTION) {
      fs.writeFileSync(
        mapFile,
        JSON.stringify(mergeSourceMaps(chunks, outFile)),
        "utf8",
      );
    }
  } else {
    // ── Sequential write (production, bufferedWrite:false) ───────────────────
    // Write each chunk via a file descriptor so peak memory stays at one
    // finalCss string at a time.  No source map in production.
    const fd = fs.openSync(outFile, "w");
    try {
      let first = true;
      for (const entry of themeCache.values()) {
        if (!first) fs.writeSync(fd, "\n");
        fs.writeSync(fd, entry.finalCss ?? "");
        first = false;
        // Strip finalCss/finalMap now that they have been written to disk.
        // classMap is all that is needed for subsequent warm-start source rewrites.
        delete entry.finalCss;
        delete entry.finalMap;
      }
    } finally {
      fs.closeSync(fd);
    }
  }
}

// ---------------------------------------------------------------------------
// Loader entry point
// ---------------------------------------------------------------------------

export default function themeCssLoader(
  this: LoaderContext,
  originalSource: string,
  originalMap: object | string | null,
): void {
  const resourcePath = this.resourcePath;
  const {
    themesDir = "src/themes",
    outputDir = "public/themes",
    bufferedWrite = true,
    evictOtherThemes = false,
    assetsSubdir = "assets",
  } = this.getOptions() ?? {};
  const absThemesDir = path.resolve(CWD, themesDir);
  const absOutputDir = path.resolve(CWD, outputDir);
  const themeName = extractThemeName(resourcePath, absThemesDir);

  // Files outside src/themes/ should not reach this loader, but handle it
  // defensively just in case.
  if (!themeName) {
    this.callback(null, originalSource, originalMap);
    return;
  }

  let themeCache: Map<string, ThemeCacheEntry>;

  if (!themeLastRebuild.has(themeName)) {
    // ── Cold start ────────────────────────────────────────────────────────────
    // First request for this theme since server start.  Rebuild the full bundle
    // so that theme.generated.css is complete before any response is served.
    themeCache = new Map();
    compilationCache.set(themeName, themeCache);
    rebuildTheme(
      themeName,
      themeCache,
      absThemesDir,
      absOutputDir,
      bufferedWrite,
      assetsSubdir,
    );
    themeLastRebuild.set(themeName, Date.now());
  } else {
    // ── Warm start — staleness check ──────────────────────────────────────────
    const lastRebuild = themeLastRebuild.get(themeName)!;
    themeCache = compilationCache.get(themeName)!;

    let needsRebuild = false;

    // 1. Check the .tsx resource itself — catches "new file importing old .scss".
    try {
      if (fs.statSync(resourcePath).mtimeMs > lastRebuild) needsRebuild = true;
    } catch {
      needsRebuild = true;
    }

    // 2. Check each CSS import's mtime — catches edited .scss files.
    if (!needsRebuild) {
      const importRe = new RegExp(IMPORT_RE.source, IMPORT_RE.flags);
      for (const [, , , importPath] of originalSource.matchAll(importRe)) {
        if (!importPath) continue;
        const absPath = path.resolve(path.dirname(resourcePath), importPath);
        try {
          if (fs.statSync(absPath).mtimeMs > lastRebuild) {
            needsRebuild = true;
            break;
          }
        } catch {
          needsRebuild = true;
          break;
        }
      }
    }

    if (needsRebuild) {
      // Full cache bust for this theme: discard all compiled CSS and rebuild.
      themeCache = new Map();
      compilationCache.set(themeName, themeCache);
      rebuildTheme(
        themeName,
        themeCache,
        absThemesDir,
        absOutputDir,
        bufferedWrite,
        assetsSubdir,
      );
      themeLastRebuild.set(themeName, Date.now());
    }
    // else: cache hit — themeCache is already populated, no rebuild needed.
  }

  // ── Other-theme eviction ───────────────────────────────────────────────────
  // When evictOtherThemes is enabled, discard every other theme's cached data
  // immediately after the current theme's cache is guaranteed to be warm.
  // This bounds peak memory to (at most) two themes simultaneously: the one
  // just evicted that is awaiting GC and the current one.
  if (evictOtherThemes) {
    for (const cachedTheme of compilationCache.keys()) {
      if (cachedTheme !== themeName) {
        compilationCache.delete(cachedTheme);
        themeLastRebuild.delete(cachedTheme);
      }
    }
  }

  // ── Source rewriting ───────────────────────────────────────────────────────
  // Replace CSS imports with Proxy declarations (modules) or no-op comments
  // (plain imports).  classMaps are read from themeCache populated above.
  const matches = [...originalSource.matchAll(IMPORT_RE)];
  if (matches.length === 0) {
    this.callback(null, originalSource, originalMap);
    return;
  }

  let source = originalSource;

  for (const [, statement, localName, importPath, lineEnding] of matches) {
    if (!statement || !importPath || lineEnding === undefined) continue;
    const absPath = path.resolve(path.dirname(resourcePath), importPath);
    if (!fs.existsSync(absPath)) continue;

    const isModule = /\.module\.(scss|css)$/.test(importPath);

    // IMPORTANT: replacement is done at the SAME POSITION as the import so
    // that variables are declared before any subsequent code that uses them.
    // (Appending at the end would cause TDZ errors.)
    let replacement;
    if (localName && isModule) {
      const classMap = themeCache.get(absPath)?.classMap ?? {};
      const mapJson = JSON.stringify(classMap);
      replacement = `const ${localName} = new Proxy(${mapJson}, { get: (m, k) => (typeof k === "string" ? (m[k] ?? k) : m[k]) });`;
    } else {
      // Just comment out the import to preserve the line numbers
      replacement = "/*" + statement + "*/";
    }
    source = source.replace(statement + lineEnding, replacement + lineEnding);
  }

  this.callback(null, source, originalMap);
}
