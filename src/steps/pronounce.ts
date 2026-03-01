import type { Token, WiktionaryEntry, LookupResult } from "../data/types.ts";
import { lookup } from "../data/wiktionary-api.ts";
import tokenize from "./tokenize.ts";
import type { StepOptions } from "./index.ts";

export function pronunciationKey(entry: WiktionaryEntry): string {
  return entry.pronunciations.map((p) => p.ipa).sort().join("|");
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
  const ipaSets = withPron.map((e) => new Set(e.pronunciations.map((p) => p.ipa)));
  const shared = [...ipaSets[0]].some((ipa) => ipaSets.every((s) => s.has(ipa)));
  const status = shared ? "resolved" : "ambiguous";
  return { status, token, entries };
}

export async function pronounce(tokens: Token[], options?: StepOptions): Promise<LookupResult[]> {
  const results: LookupResult[] = [];

  for (const token of tokens) {
    const entries = await lookup(token.text, options);
    results.push(classify(token, entries));
  }

  return results;
}

export default async function pronounceStep(input: string, options?: StepOptions) {
  const tokens = tokenize(input);
  return pronounce(tokens, options);
}
