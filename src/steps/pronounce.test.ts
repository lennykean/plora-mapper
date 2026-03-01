import { describe, it, expect, vi } from "vitest";
import { pronounce } from "./pronounce.ts";
import type { Token, WiktionaryEntry } from "../data/types.ts";

vi.mock("../data/wiktionary-api.ts", () => ({
  lookup: vi.fn(),
}));

import { lookup } from "../data/wiktionary-api.ts";
const mockLookup = vi.mocked(lookup);

function makeToken(word: string, position = 0): Token {
  return {
    text: word,
    position,
    normalized: word.toLowerCase(),
    punctuation: { leading: "", trailing: "" },
  };
}

const nounEntry: WiktionaryEntry = {
  word: "record",
  pos: "noun",
  pronunciations: [{ ipa: "/ˈɹɛk.ɔːd/", notation: "phonemic" }],
  audio: [],
  definitions: { "": [{ definition: "A thing recorded.", labels: [] }] },
};

const verbEntry: WiktionaryEntry = {
  word: "record",
  pos: "verb",
  pronunciations: [{ ipa: "/ɹɪˈkɔːd/", notation: "phonemic" }],
  audio: [],
  definitions: { "": [{ definition: "To make a record.", labels: [] }] },
};

const catNoun: WiktionaryEntry = {
  word: "cat",
  pos: "noun",
  pronunciations: [{ ipa: "/kæt/", notation: "phonemic" }],
  audio: [],
  definitions: { "": [{ definition: "A feline.", labels: [] }] },
};

const catVerb: WiktionaryEntry = {
  word: "cat",
  pos: "verb",
  pronunciations: [{ ipa: "/kæt/", notation: "phonemic" }],
  audio: [],
  definitions: { "": [{ definition: "To hoist an anchor.", labels: [] }] },
};

describe("pronounce", () => {
  it("marks unknown words", async () => {
    mockLookup.mockResolvedValueOnce([]);
    const results = await pronounce([makeToken("xyzzy")]);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("unknown");
    expect(results[0].entries).toEqual([]);
  });

  it("marks resolved when all entries share the same pronunciation", async () => {
    mockLookup.mockResolvedValueOnce([catNoun, catVerb]);
    const results = await pronounce([makeToken("cat")]);
    expect(results[0].status).toBe("resolved");
  });

  it("marks ambiguous when entries have different pronunciations", async () => {
    mockLookup.mockResolvedValueOnce([nounEntry, verbEntry]);
    const results = await pronounce([makeToken("record")]);
    expect(results[0].status).toBe("ambiguous");
    expect(results[0].entries).toHaveLength(2);
  });

  it("processes multiple tokens", async () => {
    mockLookup
      .mockResolvedValueOnce([catNoun])
      .mockResolvedValueOnce([nounEntry, verbEntry])
      .mockResolvedValueOnce([]);

    const tokens = [makeToken("cat", 0), makeToken("record", 1), makeToken("xyzzy", 2)];
    const results = await pronounce(tokens);

    expect(results.map((r) => r.status)).toEqual(["resolved", "ambiguous", "unknown"]);
  });
});
