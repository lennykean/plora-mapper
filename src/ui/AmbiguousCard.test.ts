import { describe, it, expect } from "vitest";
import { groupByIpa } from "./AmbiguousCard.tsx";
import type { WiktionaryEntry } from "../data/types.ts";

function makeEntry(pos: string, ipa: string, audioUrl?: string): WiktionaryEntry {
  return {
    word: "test",
    pos,
    pronunciations: [{ ipa, notation: "phonemic" as const }],
    audio: audioUrl ? [{ url: audioUrl }] : [],
    definitions: { [pos]: [{ definition: `a ${pos}`, labels: [] }] },
  };
}

describe("groupByIpa", () => {
  it("groups entries sharing the same IPA into one group", () => {
    const entries = [
      makeEntry("verb", "/dəʊnt/"),
      makeEntry("interjection", "/dəʊnt/"),
      makeEntry("noun", "/dəʊnt/"),
      makeEntry("noun", "/dʌnt/"),
    ];
    const groups = groupByIpa(entries);
    expect(groups).toHaveLength(2);
    expect(groups[0].ipa).toBe("/dəʊnt/");
    expect(groups[0].entries).toHaveLength(3);
    expect(groups[0].firstIndex).toBe(0);
    expect(groups[1].ipa).toBe("/dʌnt/");
    expect(groups[1].entries).toHaveLength(1);
    expect(groups[1].firstIndex).toBe(3);
  });

  it("keeps each unique IPA as a separate group", () => {
    const entries = [
      makeEntry("noun", "/ˈɹɛkɔːd/"),
      makeEntry("verb", "/ɹɪˈkɔːd/"),
    ];
    const groups = groupByIpa(entries);
    expect(groups).toHaveLength(2);
    expect(groups[0].ipa).toBe("/ˈɹɛkɔːd/");
    expect(groups[0].entries[0].pos).toBe("noun");
    expect(groups[1].ipa).toBe("/ɹɪˈkɔːd/");
    expect(groups[1].entries[0].pos).toBe("verb");
  });

  it("picks audio from the first entry in the group that has it", () => {
    const entries = [
      makeEntry("verb", "/dəʊnt/"),
      makeEntry("noun", "/dəʊnt/", "https://example.com/audio.ogg"),
    ];
    const groups = groupByIpa(entries);
    expect(groups[0].audio?.url).toBe("https://example.com/audio.ogg");
  });

  it("uses '???' for entries with no pronunciation", () => {
    const entry: WiktionaryEntry = {
      word: "test",
      pos: "noun",
      pronunciations: [],
      audio: [],
      definitions: {},
    };
    const groups = groupByIpa([entry]);
    expect(groups[0].ipa).toBe("???");
  });
});
