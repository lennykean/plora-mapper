import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDataDir = resolve(__dirname, "../../data");

let dataDir = defaultDataDir;
let cacheDir = defaultDataDir;

/** Configure data paths (called by Electron main process at startup). */
export function configurePaths(opts: {
  dataDir: string;
  cacheDir: string;
}): void {
  dataDir = opts.dataDir;
  cacheDir = opts.cacheDir;
}

/** Read-only data directory (cmudict.dict, etc.) */
export function getDataDir(): string {
  return dataDir;
}

/** Writable cache directory (definition_cache.db, audio cache) */
export function getCacheDir(): string {
  return cacheDir;
}
