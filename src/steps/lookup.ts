import { lookup as wiktionaryLookup, type LookupOptions } from "../data/wiktionary-api.ts";

export default async function lookup(input: string, options?: LookupOptions) {
  const word = input.trim();
  return {
    word,
    entries: await wiktionaryLookup(word, options),
  };
}
