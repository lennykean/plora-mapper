import { describe, it, expect } from "vitest";
import { arpabetToIPA, cmuLookup } from "./cmu-dict.ts";

describe("arpabetToIPA", () => {
  it("converts simple consonants", () => {
    expect(arpabetToIPA("K AE1 T")).toBe("/kˈæt/");
  });

  it("converts diphthongs", () => {
    expect(arpabetToIPA("B AY1 T")).toBe("/bˈaɪt/");
  });

  it("handles primary stress marker", () => {
    const result = arpabetToIPA("R EH1 K ER0 D");
    expect(result).toBe("/ɹˈɛkɚd/");
  });

  it("handles secondary stress marker", () => {
    const result = arpabetToIPA("N AA1 K D AW2 N");
    expect(result).toBe("/nˈɑkdˌaʊn/");
  });

  it("reduces unstressed AH0 to schwa", () => {
    const result = arpabetToIPA("AH0 B AW1 T");
    expect(result).toBe("/əbˈaʊt/");
  });

  it("reduces unstressed ER0 to ɚ", () => {
    const result = arpabetToIPA("R IH0 K AO1 R D ER0");
    expect(result).toBe("/ɹɪkˈɔɹdɚ/");
  });

  it("handles word with no stress (single consonant cluster)", () => {
    expect(arpabetToIPA("S")).toBe("/s/");
  });

  it("handles all vowel types", () => {
    // Just verify no crashes on all vowel phonemes
    const vowels = ["AA1", "AE1", "AH1", "AO1", "AW1", "AY1", "EH1", "ER1", "EY1", "IH1", "IY1", "OW1", "OY1", "UH1", "UW1"];
    for (const v of vowels) {
      const result = arpabetToIPA(v);
      expect(result).toMatch(/^\/.*\/$/);
    }
  });
});

describe("cmuLookup", () => {
  it("returns entries for a known word", () => {
    const entries = cmuLookup("cat");
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].word).toBe("cat");
    expect(entries[0].pos).toBe("unknown");
    expect(entries[0].pronunciations[0].notation).toBe("phonemic");
    expect(entries[0].pronunciations[0].accent).toBe("GA");
    expect(entries[0].pronunciations[0].ipa).toBe("/kˈæt/");
  });

  it("returns empty for unknown word", () => {
    expect(cmuLookup("xyzzyplugh")).toEqual([]);
  });

  it("returns multiple variants for words with alternate pronunciations", () => {
    const entries = cmuLookup("record");
    expect(entries.length).toBeGreaterThanOrEqual(2);
    // Each variant should have a different IPA
    const ipas = entries.map((e) => e.pronunciations[0].ipa);
    expect(new Set(ipas).size).toBe(ipas.length);
  });

  it("includes CMU label in definitions", () => {
    const entries = cmuLookup("hello");
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].definitions[""]).toEqual([
      { definition: "(CMU Pronouncing Dictionary)", labels: ["cmu"] },
    ]);
  });

  it("is case-insensitive", () => {
    const lower = cmuLookup("hello");
    const upper = cmuLookup("HELLO");
    expect(lower).toEqual(upper);
  });
});
