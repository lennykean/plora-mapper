import type { Token, WiktionaryEntry, LookupResult } from "../data/types.ts";
import { lookup } from "../data/wiktionary-api.ts";
import tokenize from "./tokenize.ts";
import type { StepOptions } from "./index.ts";

function pronunciationKey(entry: WiktionaryEntry): string {
  return entry.pronunciations.map((p) => p.ipa).sort().join("|");
}

function classify(token: Token, entries: WiktionaryEntry[]): LookupResult {
  if (entries.length === 0) {
    return { status: "unknown", token, entries };
  }

  const keys = new Set(entries.map(pronunciationKey));
  const status = keys.size <= 1 ? "resolved" : "ambiguous";
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
