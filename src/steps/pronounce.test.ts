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

  it("treats entries with no pronunciations as resolved, not ambiguous", async () => {
    const verbWithPron: WiktionaryEntry = {
      word: "is",
      pos: "verb",
      pronunciations: [{ ipa: "/ɪz/", notation: "phonemic" }],
      audio: [],
      definitions: {
        "": [{ definition: "Third person singular of be.", labels: [] }],
      },
    };
    const nounNoPron: WiktionaryEntry = {
      word: "is",
      pos: "noun",
      pronunciations: [],
      audio: [],
      definitions: { "": [{ definition: "Plural of i.", labels: [] }] },
    };
    mockLookup.mockResolvedValueOnce([verbWithPron, nounNoPron]);
    const results = await pronounce([makeToken("is")]);
    expect(results[0].status).toBe("resolved");
    expect(results[0].entries).toHaveLength(2);
  });

  it("resolves when entries share a common IPA despite different variant counts", async () => {
    // "just": adjective has many dialect variants, noun has only the base — same word
    const adjEntry: WiktionaryEntry = {
      word: "just",
      pos: "adjective",
      pronunciations: [
        { ipa: "/d͡ʒʌst/", notation: "phonemic" },
        { ipa: "/d͡ʒʊst/", notation: "phonemic" },
        { ipa: "/d͡ʒɛst/", notation: "phonemic" },
      ],
      audio: [],
      definitions: { "": [{ definition: "Fair.", labels: [] }] },
    };
    const nounEntry2: WiktionaryEntry = {
      word: "just",
      pos: "noun",
      pronunciations: [{ ipa: "/d͡ʒʌst/", notation: "phonemic" }],
      audio: [],
      definitions: { "": [{ definition: "A joust.", labels: [] }] },
    };
    mockLookup.mockResolvedValueOnce([adjEntry, nounEntry2]);
    const results = await pronounce([makeToken("just")]);
    expect(results[0].status).toBe("resolved");
    expect(results[0].entries).toHaveLength(2);
  });

  it("stays ambiguous when entries share no common IPA at all", async () => {
    const entry1: WiktionaryEntry = {
      word: "lead",
      pos: "noun",
      pronunciations: [{ ipa: "/lɛd/", notation: "phonemic" }],
      audio: [],
      definitions: { "": [{ definition: "A metal.", labels: [] }] },
    };
    const entry2: WiktionaryEntry = {
      word: "lead",
      pos: "verb",
      pronunciations: [{ ipa: "/liːd/", notation: "phonemic" }],
      audio: [],
      definitions: { "": [{ definition: "To guide.", labels: [] }] },
    };
    mockLookup.mockResolvedValueOnce([entry1, entry2]);
    const results = await pronounce([makeToken("lead")]);
    expect(results[0].status).toBe("ambiguous");
  });

  it("resolves when one entry has a superset of another's pronunciations", async () => {
    const broad: WiktionaryEntry = {
      word: "test",
      pos: "noun",
      pronunciations: [
        { ipa: "/tɛst/", notation: "phonemic" },
        { ipa: "/tɛːst/", notation: "phonemic" },
      ],
      audio: [],
      definitions: { "": [{ definition: "An examination.", labels: [] }] },
    };
    const narrow: WiktionaryEntry = {
      word: "test",
      pos: "verb",
      pronunciations: [{ ipa: "/tɛst/", notation: "phonemic" }],
      audio: [],
      definitions: { "": [{ definition: "To examine.", labels: [] }] },
    };
    mockLookup.mockResolvedValueOnce([broad, narrow]);
    const results = await pronounce([makeToken("test")]);
    expect(results[0].status).toBe("resolved");
  });

  it("processes multiple tokens", async () => {
    mockLookup
      .mockResolvedValueOnce([catNoun])
      .mockResolvedValueOnce([nounEntry, verbEntry])
      .mockResolvedValueOnce([]);

    const tokens = [
      makeToken("cat", 0),
      makeToken("record", 1),
      makeToken("xyzzy", 2),
    ];
    const results = await pronounce(tokens);

    expect(results.map((r) => r.status)).toEqual([
      "resolved",
      "ambiguous",
      "unknown",
    ]);
  });
});
