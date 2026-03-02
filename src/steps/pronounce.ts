import type { Token, WiktionaryEntry, LookupResult } from "../data/types.ts";
import { lookup } from "../data/wiktionary-api.ts";
import tokenize from "./tokenize.ts";
import type { StepOptions } from "../data/types.ts";

export function pronunciationKey(entry: WiktionaryEntry): string {
  return entry.pronunciations
    .map((p) => p.ipa)
    .sort()
    .join("|");
}

function classify(token: Token, entries: WiktionaryEntry[]): LookupResult {
  if (entries.length === 0) {
    return { status: "unknown", token, entries };
  }

  // Only entries with actual pronunciations count for ambiguity
  const withPron = entries.filter((e) => e.pronunciations.length > 0);
  if (withPron.length <= 1) {
    return { status: "resolved", token, entries };
  }

  // If all entries share at least one common IPA, it's not a true heteronym
  const ipaSets = withPron.map(
    (e) => new Set(e.pronunciations.map((p) => p.ipa)),
  );
  const shared = [...ipaSets[0]].some((ipa) =>
    ipaSets.every((s) => s.has(ipa)),
  );
  const status = shared ? "resolved" : "ambiguous";
  return { status, token, entries };
}

export async function pronounce(
  tokens: Token[],
  options?: StepOptions,
): Promise<LookupResult[]> {
  // Deduplicate lookups so duplicate words don't cause redundant API fetches
  const uniqueWords = [...new Set(tokens.map((t) => t.normalized))];
  const lookupEntries = await Promise.all(
    uniqueWords.map(async (word) => {
      const entries = await lookup(word, options);
      return [word, entries] as const;
    }),
  );
  const lookupMap = new Map<string, WiktionaryEntry[]>();
  for (const [word, entries] of lookupEntries) {
    lookupMap.set(word, entries);
  }
  return tokens.map((token) =>
    classify(token, lookupMap.get(token.normalized) ?? []),
  );
}

export default async function pronounceStep(
  input: string,
  options?: StepOptions,
) {
  const tokens = tokenize(input);
  return pronounce(tokens, options);
}
