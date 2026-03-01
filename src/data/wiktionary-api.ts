import type { WiktionaryEntry, Pronunciation, Definition } from "./types.ts";
import * as cache from "./definition-cache.ts";

const API_BASE = "https://en.wiktionary.org/w/api.php";
const USER_AGENT = "plora-mapper/0.0.0 (https://github.com/plora-mapper)";

const GRAMMATICAL_CLASSES = new Set([
  "transitive", "intransitive", "ambitransitive", "ditransitive",
  "ergative", "attributive", "predicative", "copulative",
  "countable", "uncountable", "comparable", "not comparable",
  "in the singular", "in the plural",
]);

async function fetchWikitext(word: string): Promise<string | null> {
  const url = `${API_BASE}?action=parse&page=${encodeURIComponent(word)}&prop=wikitext&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) return null;

  const json = await res.json();
  if (json.error) return null;

  return json.parse?.wikitext?.["*"] ?? null;
}

export function parseIPA(line: string): Pronunciation[] {
  const results: Pronunciation[] = [];
  const ipaRegex = /\{\{IPA\|en\|([^}]+)\}\}/g;
  let match;

  while ((match = ipaRegex.exec(line)) !== null) {
    const parts = match[1].split("|");
    let accent: string | undefined;

    for (const part of parts) {
      if (part.startsWith("a=")) {
        accent = part.slice(2);
      } else if (part.startsWith("/") || part.startsWith("[")) {
        results.push({
          ipa: part,
          ...(accent ? { accent } : {}),
        });
      }
    }
  }

  return results;
}

export function parseLabels(raw: string): { grammaticalClass: string; labels: string[] } {
  const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
  const labels: string[] = [];
  let grammaticalClass = "";

  for (const part of parts) {
    // Skip connectors like "_" or "or" that Wiktionary uses between labels
    if (part === "_" || part === "or") continue;

    if (GRAMMATICAL_CLASSES.has(part)) {
      grammaticalClass = grammaticalClass
        ? `${grammaticalClass} ${part}`
        : part;
    } else {
      labels.push(part);
    }
  }

  return { grammaticalClass, labels };
}

export function parseDefinitions(lines: string[]): Record<string, Definition[]> {
  const grouped: Record<string, Definition[]> = {};

  for (const line of lines) {
    if (/^# (?![:*])/.test(line)) {
      let def = line.slice(2);

      // Extract labels from {{lb|en|...}}
      let grammaticalClass = "";
      let labels: string[] = [];
      const lbMatch = def.match(/\{\{lb\|en\|([^}]*)\}\}/);
      if (lbMatch) {
        const parsed = parseLabels(lbMatch[1]);
        grammaticalClass = parsed.grammaticalClass;
        labels = parsed.labels;
      }

      // Strip wiki markup
      def = def
        .replace(/\{\{lb\|en\|[^}]*\}\}\s*/g, "")
        .replace(/\{\{ellipsis of\|en\|([^|]*)[^}]*\}\}/g, "$1")
        .replace(/\{\{(ux|syn|cot|hyper|hypo|ant|quote-[^|]*)[^}]*\}\}/g, "")
        .replace(/\{\{[^}]*\}\}/g, "")
        .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
        .replace(/'''([^']*)'''/g, "$1")
        .replace(/''([^']*)''/g, "$1")
        .trim();

      if (!def) continue;

      const key = grammaticalClass;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ definition: def, labels });
    }
  }

  return grouped;
}

const POS_HEADERS = new Set([
  "Noun", "Verb", "Adjective", "Adverb", "Pronoun",
  "Preposition", "Conjunction", "Interjection", "Determiner",
  "Participle", "Proper noun",
]);

export function parseWikitext(word: string, wikitext: string): WiktionaryEntry[] {
  const entries: WiktionaryEntry[] = [];
  const lines = wikitext.split("\n");

  const englishStart = lines.findIndex((l) => l === "==English==");
  if (englishStart === -1) return [];

  let englishEnd = lines.length;
  for (let i = englishStart + 1; i < lines.length; i++) {
    if (/^==[^=]/.test(lines[i]) && lines[i] !== "==English==") {
      englishEnd = i;
      break;
    }
  }

  const englishLines = lines.slice(englishStart, englishEnd);

  let currentPronunciations: Pronunciation[] = [];
  let currentPos: string | null = null;
  let collectingDefs = false;
  let defLines: string[] = [];

  function flushEntry() {
    if (currentPos && defLines.length > 0) {
      entries.push({
        word: word.toLowerCase(),
        pos: currentPos.toLowerCase(),
        pronunciations: [...currentPronunciations],
        definitions: parseDefinitions(defLines),
      });
    }
    defLines = [];
    collectingDefs = false;
  }

  for (const line of englishLines) {
    if (/^={3,4}Pronunciation={3,4}$/.test(line)) {
      continue;
    }

    if (line.includes("{{IPA|en|")) {
      const ipas = parseIPA(line);
      if (ipas.length > 0) {
        currentPronunciations.push(...ipas);
      }
    }

    const posMatch = line.match(/^={3,4}([^=]+)={3,4}$/);
    if (posMatch) {
      const header = posMatch[1].trim();
      if (POS_HEADERS.has(header)) {
        flushEntry();
        currentPos = header;
        collectingDefs = true;
        continue;
      }
      if (collectingDefs && !header.startsWith("Etymology")) {
        flushEntry();
      }
    }

    if (/^===Etymology/.test(line)) {
      flushEntry();
      currentPronunciations = [];
      currentPos = null;
    }

    if (collectingDefs && line.startsWith("#")) {
      defLines.push(line);
    }
  }

  flushEntry();
  return entries;
}

export interface LookupOptions {
  verbose?: boolean;
}

export async function lookup(word: string, options?: LookupOptions): Promise<WiktionaryEntry[]> {
  const verbose = options?.verbose ?? false;
  const normalized = word.toLowerCase();

  const cached = cache.get(normalized);
  if (cached) {
    if (verbose) console.error(`[cache hit] ${normalized}`);
    return cached;
  }

  if (verbose) console.error(`[cache miss] ${normalized} — fetching from Wiktionary`);

  const wikitext = await fetchWikitext(normalized);
  if (!wikitext) return [];

  const entries = parseWikitext(normalized, wikitext);
  cache.set(normalized, entries);
  return entries;
}
