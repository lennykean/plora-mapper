import { build } from "esbuild";

const shared = {
  bundle: true,
  target: "node20",
  format: "esm" as const,
  outdir: "dist-electron",
  external: ["electron", "better-sqlite3"],
  sourcemap: true,
};

await Promise.all([
  // Main process — full Node environment, needs ESM shims for __dirname etc.
  build({
    ...shared,
    platform: "node" as const,
    entryPoints: ["src/electron/main.ts"],
    banner: {
      js: [
        'import { createRequire as _createRequire } from "module";',
        'import { fileURLToPath as _fileURLToPath } from "url";',
        'import { dirname as _dirname } from "path";',
        "const require = _createRequire(import.meta.url);",
        "const __filename = _fileURLToPath(import.meta.url);",
        "const __dirname = _dirname(__filename);",
      ].join("\n"),
    },
  }),
  // Preload — runs in Electron's sandboxed renderer context, not full Node.
  // Must be CJS: Electron's sandboxed preload does not support ESM.
  build({
    ...shared,
    format: "cjs" as const,
    platform: "browser" as const,
    entryPoints: ["src/electron/preload.ts"],
  }),
]);

console.log("Electron main + preload built to dist-electron/");
