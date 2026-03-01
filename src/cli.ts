import { program } from "commander";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { execFile } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { steps } from "./steps/index.ts";
import type { LookupResult } from "./data/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_CACHE = resolve(__dirname, "../data/audio");

function playFile(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", path], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function beep(): Promise<void> {
  return new Promise((resolve) => {
    execFile("ffplay", [
      "-f", "lavfi", "-i", "sine=frequency=600:duration=0.15",
      "-nodisp", "-autoexit", "-loglevel", "quiet",
    ], () => resolve());
  });
}

function audioCachePath(url: string): string {
  // Use the filename from the URL as the cache key
  const filename = decodeURIComponent(url.split("/").pop()!);
  return resolve(AUDIO_CACHE, filename);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchAudio(url: string): Promise<string | null> {
  const cached = audioCachePath(url);
  if (existsSync(cached)) {
    console.error(`[say] cache hit: ${cached}`);
    return cached;
  }
  console.error(`[say] cache miss: ${cached}`);

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      const wait = 2 ** attempt;
      console.error(`[say] rate limited, retrying in ${wait}s...`);
      await sleep(wait * 1000);
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "plora-mapper/0.0.0 (https://github.com/plora-mapper)" },
    });

    if (res.status === 429) continue;

    if (!res.ok) {
      console.error(`[say] HTTP ${res.status} for ${url}`);
      return null;
    }

    mkdirSync(AUDIO_CACHE, { recursive: true });
    writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
    return cached;
  }

  console.error(`[say] gave up after retries: ${url}`);
  return null;
}

async function sayResults(results: LookupResult[], accent?: string): Promise<void> {
  const ACCENT_ALIASES: Record<string, string[]> = {
    GA: ["GenAm", "US"], GenAm: ["GA", "US"], US: ["GA", "GenAm"],
    RP: ["UK"], UK: ["RP"],
  };
  const gaSet = new Set(["GA", "GenAm", "US"]);

  for (const result of results) {
    const allAudio = result.entries.flatMap((e) => e.audio);
    let audio;
    if (accent) {
      // Exact match first, then aliases, then GA fallback
      audio = allAudio.find((a) => a.accent === accent)
        ?? allAudio.find((a) => a.accent && ACCENT_ALIASES[accent]?.includes(a.accent))
        ?? allAudio.find((a) => a.accent && gaSet.has(a.accent));
    } else {
      audio = allAudio.find((a) => a.accent === "GA")
        ?? allAudio.find((a) => a.accent && gaSet.has(a.accent))
        ?? allAudio[0];
    }

    if (!audio) {
      await beep();
      console.error(`[say] no audio: ${result.token.text}`);
      continue;
    }

    const file = await fetchAudio(audio.url);
    if (!file) {
      await beep();
      console.error(`[say] fetch failed: ${audio.url}`);
      continue;
    }

    try {
      await playFile(file);
    } catch (err) {
      console.error(`[say] playback failed: ${(err as Error).message}`);
      console.error("[say] install ffmpeg (scoop install ffmpeg) for .ogg support");
      break;
    }
  }
}

interface CliOpts {
  input?: string;
  file?: string;
  verbose?: boolean;
  accent?: string;
  notation?: string;
  label?: string[];
  labelNot?: string[];
  say?: boolean;
}

program
  .name("plora-mapper")
  .description("Plora mapping pipeline CLI")
  .argument("<step>", "pipeline step to run")
  .option("--input <text>", "input text")
  .option("--file <path>", "input file path")
  .option("-v, --verbose", "verbose output")
  .option("--accent <accent>", "filter pronunciations by accent (e.g. GA, RP, US)")
  .option("--notation <type>", "filter by notation type (phonemic or phonetic)")
  .option("--label <label...>", "include definitions with any of these labels")
  .option("--label-not <label...>", "exclude definitions with any of these labels")
  .option("--say", "play audio pronunciation for each word")
  .action(async (step: string, opts: CliOpts) => {
    const input = opts.input ?? (opts.file ? readFileSync(opts.file, "utf-8") : null);

    if (!input) {
      console.error("Error: provide --input or --file");
      process.exit(1);
    }

    const fn = steps[step];
    if (!fn) {
      console.error(`Unknown step: ${step}`);
      console.error(`Available steps: ${Object.keys(steps).join(", ")}`);
      process.exit(1);
    }

    const notation = opts.notation as "phonemic" | "phonetic" | undefined;
    const result = await fn(input, { verbose: opts.verbose, accent: opts.accent, notation, label: opts.label, labelNot: opts.labelNot });
    console.log(JSON.stringify(result, null, 2));

    if (opts.say && step === "pronounce" && Array.isArray(result)) {
      await sayResults(result as LookupResult[], opts.accent);
    }
  });

program.parse();
