import { createHash } from "crypto";
import type {
  WiktionaryEntry,
  Pronunciation,
  Definition,
  Audio,
} from "./types.ts";
import * as cache from "./definition-cache.ts";
import { cmuLookup } from "./cmu-dict.ts";

const API_BASE = "https://en.wiktionary.org/w/api.php";
const USER_AGENT = "plora-mapper/0.0.0 (https://github.com/plora-mapper)";
const COMMONS_BASE = "https://upload.wikimedia.org/wikipedia/commons";

function commonsUrl(filename: string): string {
  // Wikimedia normalizes: spaces → underscores, first char uppercased
  const normalized = filename
    .replace(/ /g, "_")
    .replace(/^./, (c) => c.toUpperCase());
  const hash = createHash("md5").update(normalized).digest("hex");
  return `${COMMONS_BASE}/${hash[0]}/${hash[0]}${hash[1]}/${encodeURIComponent(normalized)}`;
}

export function parseAudio(line: string): Audio[] {
  const results: Audio[] = [];
  const regex = /\{\{audio\|en\|([^|}]+)(?:\|([^}]*))?\}\}/g;
  let match;

  while ((match = regex.exec(line)) !== null) {
    const filename = match[1];
    const rest = match[2] ?? "";
    let accent: string | undefined;
    let ipa: string | undefined;

    for (const part of rest.split("|")) {
      if (part.startsWith("a=")) {
        // Strip inline IPA from accent: "California, [deː]" -> "California"
        accent =
          part
            .slice(2)
            .replace(/,?\s*[[\\/][^\]\\/]*[\]\\/]\s*$/, "")
            .trim() || undefined;
      } else if (part.startsWith("IPA=")) ipa = part.slice(4);
    }

    results.push({
      url: commonsUrl(filename),
      ...(accent ? { accent } : {}),
      ...(ipa ? { ipa } : {}),
    });
  }

  return results;
}

const KNOWN_ACCENTS = new Set([
  "RP",
  "GA",
  "GenAm",
  "UK",
  "US",
  "AU",
  "NZ",
  "CA",
  "SA",
  "Ireland",
  "IE",
  "Scotland",
  "India",
  "Northumbrian",
  "Desi",
  "Canada",
  "California",
  "Pacific Northwest",
  "Northern US",
  "Inland North",
  "HK",
  "SG",
  "Malaysia",
  "Philippines",
  "South Africa",
  "SSB",
  "Southern American English",
  "Ulster",
]);

const GRAMMATICAL_CLASSES = new Set([
  "transitive",
  "intransitive",
  "ambitransitive",
  "ditransitive",
  "ergative",
  "attributive",
  "predicative",
  "copulative",
  "countable",
  "uncountable",
  "comparable",
  "not comparable",
  "in the singular",
  "in the plural",
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let fetchQueue: Promise<void> = Promise.resolve();

async function fetchWikitext(word: string): Promise<string | null> {
  // Enqueue this request to ensure sequential execution with 200ms gaps.
  // This prevents concurrent Promise.all calls from defeating the throttle.
  return new Promise((resolve) => {
    fetchQueue = fetchQueue
      .then(async () => {
        await sleep(200);

        const url = `${API_BASE}?action=parse&page=${encodeURIComponent(word)}&prop=wikitext&format=json`;
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": USER_AGENT },
          });

          if (!res.ok) {
            resolve(null);
            return;
          }

          const json = (await res.json()) as {
            error?: unknown;
            parse?: { wikitext?: { "*"?: string } };
          };
          if (json.error) {
            resolve(null);
            return;
          }

          resolve(json.parse?.wikitext?.["*"] ?? null);
        } catch {
          resolve(null);
        }
      })
      .catch(() => {
        // Ensure chain continues even if previous link failed
        resolve(null);
      });
  });
}

export function parseIPA(line: string, parentAccent?: string): Pronunciation[] {
  const results: Pronunciation[] = [];
  const ipaRegex = /\{\{IPA\|en\|([^}]+)\}\}/g;
  let match;

  while ((match = ipaRegex.exec(line)) !== null) {
    const parts = match[1].split("|");
    let accent: string | undefined;
    let qualifier: string | undefined;
    const ipaValues: string[] = [];

    for (const part of parts) {
      if (part.startsWith("a=")) {
        // Strip wiki links from accent values: [[w:...|Display]] -> Display, [[word]] -> word
        accent = part.slice(2).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1");
      } else if (part.startsWith("q=")) qualifier = part.slice(2);
      else if (part.startsWith("/") || part.startsWith("["))
        ipaValues.push(part);
    }

    // Classify a= value: separate known dialect codes from form qualifiers
    if (accent) {
      const accentParts = accent.split(",").map((s) => s.trim());
      const knownParts: string[] = [];
      const qualifierParts: string[] = [];
      for (const part of accentParts) {
        if (KNOWN_ACCENTS.has(part)) knownParts.push(part);
        else qualifierParts.push(part);
      }
      accent = knownParts.length > 0 ? knownParts.join(",") : parentAccent;
      if (qualifierParts.length > 0) {
        const formQualifier = qualifierParts.join(", ");
        qualifier = qualifier
          ? `${formQualifier}; ${qualifier}`
          : formQualifier;
      }
    } else {
      accent = parentAccent;
    }

    for (const ipa of ipaValues) {
      const notation = ipa.startsWith("/") ? "phonemic" : "phonetic";
      results.push({
        ipa,
        notation,
        ...(accent ? { accent } : {}),
        ...(qualifier ? { qualifier } : {}),
      });
    }
  }

  return results;
}

export function parseLabels(raw: string): {
  grammaticalClass: string;
  labels: string[];
} {
  const parts = raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
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

export function parseDefinitions(
  lines: string[],
): Record<string, Definition[]> {
  const grouped: Record<string, Definition[]> = {};

  for (const line of lines) {
    const defMatch = line.match(/^(#{1,3}) (?![:*])/);
    if (defMatch) {
      let def = line.slice(defMatch[1].length + 1);

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
        // Non-gloss / n-g usage descriptions -> extract text
        .replace(/\{\{non-gloss\|([^}]*)\}\}/g, "$1")
        .replace(/\{\{n-g\|([^}]*)\}\}/g, "$1")
        .replace(/\{\{ellipsis of\|en\|([^|]*)[^}]*\}\}/g, "$1")
        .replace(/\{\{senseid\|[^}]*\}\}\s*/g, "")
        .replace(/\{\{taxfmt\|([^|]*)\|[^}]*\}\}/g, "$1")
        .replace(/\{\{taxlink\|([^|]*)\|[^}]*\}\}/g, "$1")
        .replace(/\{\{m\|en\|([^|}]*)[^}]*\}\}/g, "$1")
        .replace(/\{\{w\|([^|}]*)[^}]*\}\}/g, "$1")
        // Form-of templates -> human-readable text
        .replace(/\{\{plural of\|en\|([^|}]+)[^}]*\}\}/g, "plural of $1")
        .replace(/\{\{infl of\|en\|([^|}]+)\|[^}]*\}\}/g, "inflection of $1")
        .replace(
          /\{\{inflection of\|en\|([^|}]+)\|[^}]*\}\}/g,
          "inflection of $1",
        )
        .replace(
          /\{\{past participle of\|en\|([^|}]+)[^}]*\}\}/g,
          "past participle of $1",
        )
        .replace(
          /\{\{present participle of\|en\|([^|}]+)[^}]*\}\}/g,
          "present participle of $1",
        )
        .replace(/\{\{en-past of\|([^|}]+)[^}]*\}\}/g, "past tense of $1")
        .replace(
          /\{\{en-ing form of\|([^|}]+)[^}]*\}\}/g,
          "present participle of $1",
        )
        .replace(
          /\{\{comparative of\|en\|([^|}]+)[^}]*\}\}/g,
          "comparative of $1",
        )
        .replace(
          /\{\{superlative of\|en\|([^|}]+)[^}]*\}\}/g,
          "superlative of $1",
        )
        .replace(
          /\{\{third-person singular of\|en\|([^|}]+)[^}]*\}\}/g,
          "third-person singular of $1",
        )
        .replace(
          /\{\{alt form\|en\|([^|}]+)[^}]*\}\}/g,
          "alternative form of $1",
        )
        .replace(
          /\{\{contraction of\|en\|([^|}]+)[^}]*\}\}/g,
          "contraction of $1",
        )
        // Content templates -> extract text
        .replace(/\{\{U\|([^|}]*)[^}]*\}\}/g, "$1")
        .replace(
          /\{\{cap\|([^|}]+)\|([^}]*)\}\}/g,
          (_, word: string, suffix: string) =>
            word.charAt(0).toUpperCase() + word.slice(1) + suffix,
        )
        .replace(
          /\{\{cap\|([^}]+)\}\}/g,
          (_, word: string) => word.charAt(0).toUpperCase() + word.slice(1),
        )
        .replace(/\{\{gl\|([^}]*)\}\}/g, "$1")
        .replace(
          /\{\{(ux|syn|cot|hyper|hypo|ant|synonyms|hyponyms|quote-[^|]*)[^}]*\}\}/g,
          "",
        )
        .replace(/\{\{[^}]*\}\}/g, "")
        .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
        .replace(/'''([^']*)'''/g, "$1")
        .replace(/''([^']*)''/g, "$1")
        .replace(/\(\s*\)/g, "") // empty parens from stripped templates
        .replace(/\s{2,}/g, " ") // collapse double spaces
        .replace(/\s+([.,;:!?])/g, "$1") // space before punctuation
        .trim()
        .replace(/^[;:]\s*/, "") // leading semicolon/colon from stripped templates
        .replace(/:$/, ""); // trailing colon

      if (!def || /^[\s.,;:!?]+$/.test(def)) continue;

      const key = grammaticalClass;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ definition: def, labels });
    }
  }

  return grouped;
}

// Headers that are NOT part-of-speech sections (skip these, treat everything else as POS)
const NON_POS_HEADERS = new Set([
  "Pronunciation",
  "Etymology",
  "Usage notes",
  "Synonyms",
  "Antonyms",
  "Derived terms",
  "Related terms",
  "Translations",
  "See also",
  "References",
  "Further reading",
  "Anagrams",
  "Alternative forms",
  "Declension",
  "Conjugation",
  "Inflection",
  "Descendants",
  "Coordinate terms",
  "Hypernyms",
  "Hyponyms",
  "Meronyms",
  "Holonyms",
  "Troponyms",
  "Collocations",
  "Quotations",
  "Statistics",
  "Mutation",
  "Trivia",
  "Notes",
  "Gallery",
  "Production",
  "Compounds",
]);

export function parseWikitext(
  word: string,
  wikitext: string,
): WiktionaryEntry[] {
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

  const topLevelPronunciations: Pronunciation[] = [];
  let currentPronunciations: Pronunciation[] = [];
  const topLevelAudio: Audio[] = [];
  let currentAudio: Audio[] = [];
  let seenEtymology = false;
  let currentPos: string | null = null;
  let collectingDefs = false;
  let defLines: string[] = [];

  function flushEntry() {
    if (currentPos && defLines.length > 0) {
      const pronunciations =
        currentPronunciations.length > 0
          ? currentPronunciations
          : topLevelPronunciations;
      const audio = currentAudio.length > 0 ? currentAudio : topLevelAudio;
      entries.push({
        word: word.toLowerCase(),
        pos: currentPos.toLowerCase(),
        pronunciations: [...pronunciations],
        audio: [...audio],
        definitions: parseDefinitions(defLines),
      });
    }
    defLines = [];
    collectingDefs = false;
  }

  let currentParentAccent: string | undefined;

  for (const line of englishLines) {
    if (/^={3,4}\s*Pronunciation\s*={3,4}$/.test(line)) {
      currentParentAccent = undefined;
      continue;
    }

    // Track parent accent from {{a|en|...}} on depth-1 bullets
    const bulletMatch = line.match(/^(\*+)\s/);
    const bulletDepth = bulletMatch ? bulletMatch[1].length : 0;

    if (bulletDepth === 1) {
      const accentTemplate = line.match(/\{\{a\|(?:en\|)?([^}]+)\}\}/);
      if (accentTemplate && !line.includes("{{IPA|en|")) {
        currentParentAccent = accentTemplate[1];
        continue;
      }
      if (line.includes("{{IPA|en|")) {
        currentParentAccent = undefined; // Pattern A — no parent context
      }
    }

    if (line.includes("{{IPA|en|")) {
      const parentForLine = bulletDepth >= 2 ? currentParentAccent : undefined;
      const ipas = parseIPA(line, parentForLine);
      if (ipas.length > 0) {
        if (seenEtymology) {
          currentPronunciations.push(...ipas);
        } else {
          topLevelPronunciations.push(...ipas);
        }
      }
    }

    if (line.includes("{{audio|en|")) {
      const audios = parseAudio(line);
      if (audios.length > 0) {
        if (seenEtymology) {
          currentAudio.push(...audios);
        } else {
          topLevelAudio.push(...audios);
        }
      }
    }

    const posMatch = line.match(/^={3,4}([^=]+)={3,4}$/);
    if (posMatch) {
      const header = posMatch[1].trim();
      if (!NON_POS_HEADERS.has(header) && !header.startsWith("Etymology")) {
        flushEntry();
        currentPos = header;
        collectingDefs = true;
        continue;
      }
      if (collectingDefs) {
        flushEntry();
      }
    }

    if (/^===Etymology/.test(line)) {
      flushEntry();
      seenEtymology = true;
      currentPronunciations = [];
      currentAudio = [];
      currentParentAccent = undefined;
      currentPos = null;
    }

    if (collectingDefs && line.startsWith("#")) {
      defLines.push(line);
    }
  }

  flushEntry();

  // Merge entries with same POS and same pronunciation set
  const merged: WiktionaryEntry[] = [];
  for (const entry of entries) {
    if (Object.keys(entry.definitions).length === 0) continue;
    const pronKey = entry.pronunciations
      .map((p) => p.ipa)
      .sort()
      .join("|");
    const existing = merged.find(
      (e) =>
        e.pos === entry.pos &&
        e.pronunciations
          .map((p) => p.ipa)
          .sort()
          .join("|") === pronKey,
    );
    if (existing) {
      for (const [cls, defs] of Object.entries(entry.definitions)) {
        if (!existing.definitions[cls]) {
          existing.definitions[cls] = defs;
        } else {
          existing.definitions[cls].push(...defs);
        }
      }
    } else {
      merged.push(entry);
    }
  }
  return merged;
}

export interface LookupOptions {
  verbose?: boolean;
  accent?: string;
  notation?: "phonemic" | "phonetic";
  label?: string[];
  labelNot?: string[];
}

const ACCENT_ALIASES: Record<string, string[]> = {
  GA: ["GenAm", "US"],
  GenAm: ["GA", "US"],
  US: ["GA", "GenAm"],
  RP: ["UK"],
  UK: ["RP"],
};

export function filterPronunciations(
  entries: WiktionaryEntry[],
  accent?: string,
  notation?: "phonemic" | "phonetic",
): WiktionaryEntry[] {
  const accentSet = accent
    ? new Set([accent, ...(ACCENT_ALIASES[accent] ?? [])])
    : undefined;

  return entries
    .map((entry) => ({
      ...entry,
      pronunciations: entry.pronunciations.filter((p) => {
        if (accentSet) {
          if (
            !p.accent ||
            !p.accent.split(",").some((a) => accentSet.has(a.trim()))
          )
            return false;
        }
        if (notation && p.notation !== notation) return false;
        return true;
      }),
    }))
    .filter((entry) => entry.pronunciations.length > 0);
}

export function filterDefinitions(
  entries: WiktionaryEntry[],
  label?: string[],
  labelNot?: string[],
): WiktionaryEntry[] {
  return entries
    .map((entry) => {
      const filtered: Record<string, Definition[]> = {};
      for (const [cls, defs] of Object.entries(entry.definitions)) {
        const kept = defs.filter((d) => {
          if (labelNot && labelNot.some((l) => d.labels.includes(l)))
            return false;
          if (label && !label.some((l) => d.labels.includes(l))) return false;
          return true;
        });
        if (kept.length > 0) filtered[cls] = kept;
      }
      return { ...entry, definitions: filtered };
    })
    .filter((entry) => Object.keys(entry.definitions).length > 0);
}

function applyFilters(
  entries: WiktionaryEntry[],
  options?: LookupOptions,
): WiktionaryEntry[] {
  let result = entries;
  if (options?.accent || options?.notation) {
    result = filterPronunciations(result, options.accent, options.notation);
  }
  if (options?.label || options?.labelNot) {
    result = filterDefinitions(result, options.label, options.labelNot);
  }
  return result;
}

export async function lookup(
  word: string,
  options?: LookupOptions,
): Promise<WiktionaryEntry[]> {
  const verbose = options?.verbose ?? false;
  const normalized = word.toLowerCase();

  let entries: WiktionaryEntry[];

  const cached = cache.get(normalized);
  if (cached) {
    if (verbose) console.error(`[cache hit] ${normalized}`);
    entries = cached;
  } else {
    if (verbose)
      console.error(`[cache miss] ${normalized} — fetching from Wiktionary`);

    const wikitext = await fetchWikitext(normalized);
    entries = wikitext ? parseWikitext(normalized, wikitext) : [];

    // Fallback: try capitalized form when lowercase yields nothing
    // Handles "i'm" -> "I'm", "i" -> "I", proper nouns, etc.
    if (entries.length === 0) {
      const capitalized =
        normalized.charAt(0).toUpperCase() + normalized.slice(1);
      if (capitalized !== normalized) {
        if (verbose)
          console.error(`[fallback] trying capitalized: ${capitalized}`);
        const capWikitext = await fetchWikitext(capitalized);
        if (capWikitext) {
          entries = parseWikitext(normalized, capWikitext);
        }
      }
    }

    // Cache Wiktionary results (even empty — avoids re-fetching)
    cache.set(normalized, entries);
  }

  // CMU fallback — when Wiktionary has no pronunciations (e.g. inflection-only pages)
  const hasPronunciations = entries.some((e) => e.pronunciations.length > 0);
  if (!hasPronunciations) {
    const cmuEntries = cmuLookup(normalized);
    if (cmuEntries.length > 0) {
      if (entries.length > 0) {
        entries = entries.map((e) => ({
          ...e,
          pronunciations: cmuEntries[0].pronunciations,
        }));
      } else {
        entries = cmuEntries;
      }
      if (verbose) console.error(`[cmu fallback] ${normalized}`);
    }
  }

  let filtered = applyFilters(entries, options);

  // Post-filter CMU fallback — accent filter may have stripped all pronunciations
  if (filtered.length === 0 && entries.length > 0) {
    const cmuEntries = cmuLookup(normalized);
    if (cmuEntries.length > 0) {
      entries = entries.map((e) => ({
        ...e,
        pronunciations: cmuEntries[0].pronunciations,
      }));
      filtered = applyFilters(entries, options);
      if (verbose) console.error(`[cmu post-filter fallback] ${normalized}`);
    }
  }

  return filtered;
}
