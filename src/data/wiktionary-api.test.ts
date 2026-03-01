import { describe, it, expect } from "vitest";
import { parseIPA, parseLabels, parseDefinitions, parseWikitext } from "./wiktionary-api.ts";

describe("parseIPA", () => {
  it("extracts IPA values with accent markers", () => {
    const result = parseIPA("* {{IPA|en|a=GenAm|/ˈɹɛkɚd/|a=RP|/ˈɹɛkɔːd/}}");
    expect(result).toEqual([
      { ipa: "/ˈɹɛkɚd/", accent: "GenAm" },
      { ipa: "/ˈɹɛkɔːd/", accent: "RP" },
    ]);
  });

  it("returns empty array for line with no IPA template", () => {
    expect(parseIPA("* {{audio|en|foo.ogg}}")).toEqual([]);
    expect(parseIPA("just some text")).toEqual([]);
  });
});

describe("parseLabels", () => {
  it("extracts grammatical class", () => {
    const result = parseLabels("transitive");
    expect(result).toEqual({ grammaticalClass: "transitive", labels: [] });
  });

  it("extracts multiple labels", () => {
    const result = parseLabels("computing|informal");
    expect(result).toEqual({ grammaticalClass: "", labels: ["computing", "informal"] });
  });

  it("separates grammatical class from labels", () => {
    const result = parseLabels("transitive|legal");
    expect(result).toEqual({ grammaticalClass: "transitive", labels: ["legal"] });
  });

  it("combines multiple grammatical classes", () => {
    const result = parseLabels("countable|uncountable");
    expect(result).toEqual({ grammaticalClass: "countable uncountable", labels: [] });
  });

  it("skips connectors", () => {
    const result = parseLabels("transitive|_|or|_|intransitive");
    expect(result).toEqual({ grammaticalClass: "transitive intransitive", labels: [] });
  });

  it("handles empty input", () => {
    const result = parseLabels("");
    expect(result).toEqual({ grammaticalClass: "", labels: [] });
  });
});

describe("parseDefinitions", () => {
  it("extracts a basic definition", () => {
    const result = parseDefinitions(["# A domesticated animal."]);
    expect(result).toEqual({
      "": [{ definition: "A domesticated animal.", labels: [] }],
    });
  });

  it("ignores sub-definition lines", () => {
    const result = parseDefinitions([
      "# A thing.",
      "#: This is an example.",
      "#* A quotation.",
    ]);
    expect(result).toEqual({
      "": [{ definition: "A thing.", labels: [] }],
    });
  });

  it("extracts labels and grammatical class from {{lb}}", () => {
    const result = parseDefinitions([
      "# {{lb|en|transitive|legal}} To place on record.",
    ]);
    expect(result).toEqual({
      "transitive": [{ definition: "To place on record.", labels: ["legal"] }],
    });
  });

  it("strips wiki links", () => {
    const result = parseDefinitions(["# A [[dog]] or [[cat|feline]]."]);
    expect(result).toEqual({
      "": [{ definition: "A dog or feline.", labels: [] }],
    });
  });

  it("strips bold and italic markup", () => {
    const result = parseDefinitions(["# A '''strong''' and ''emphasized'' word."]);
    expect(result).toEqual({
      "": [{ definition: "A strong and emphasized word.", labels: [] }],
    });
  });

  it("strips miscellaneous templates", () => {
    const result = parseDefinitions([
      "# A thing. {{ux|en|example sentence}}",
    ]);
    expect(result).toEqual({
      "": [{ definition: "A thing.", labels: [] }],
    });
  });

  it("preserves ellipsis-of content", () => {
    const result = parseDefinitions([
      "# {{ellipsis of|en|something longer|nocap=1}}",
    ]);
    expect(result).toEqual({
      "": [{ definition: "something longer", labels: [] }],
    });
  });

  it("groups definitions by grammatical class", () => {
    const result = parseDefinitions([
      "# {{lb|en|transitive}} To write down.",
      "# {{lb|en|intransitive}} To be recorded.",
    ]);
    expect(result).toEqual({
      "transitive": [{ definition: "To write down.", labels: [] }],
      "intransitive": [{ definition: "To be recorded.", labels: [] }],
    });
  });

  it("skips definitions that are empty after stripping", () => {
    const result = parseDefinitions(["# {{syn|en|foo|bar}}"]);
    expect(result).toEqual({});
  });
});

describe("parseWikitext", () => {
  it("returns empty array for non-English word", () => {
    const wikitext = "==French==\n===Noun===\n# A thing.";
    expect(parseWikitext("chose", wikitext)).toEqual([]);
  });

  it("parses a simple word with one POS", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{IPA|en|/kæt/}}",
      "===Noun===",
      "# A domesticated feline.",
    ].join("\n");

    const result = parseWikitext("cat", wikitext);
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("cat");
    expect(result[0].pos).toBe("noun");
    expect(result[0].pronunciations).toEqual([{ ipa: "/kæt/" }]);
    expect(result[0].definitions[""]).toEqual([
      { definition: "A domesticated feline.", labels: [] },
    ]);
  });

  it("parses multiple POS under one etymology", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{IPA|en|/ɹʌn/}}",
      "===Verb===",
      "# To move quickly.",
      "===Noun===",
      "# An act of running.",
    ].join("\n");

    const result = parseWikitext("run", wikitext);
    expect(result).toHaveLength(2);
    expect(result[0].pos).toBe("verb");
    expect(result[1].pos).toBe("noun");
    // Both share the same pronunciation
    expect(result[0].pronunciations).toEqual(result[1].pronunciations);
  });

  it("handles multiple etymologies with different pronunciations", () => {
    const wikitext = [
      "==English==",
      "===Etymology 1===",
      "====Pronunciation====",
      "* {{IPA|en|/liːd/}}",
      "====Verb====",
      "# To guide.",
      "===Etymology 2===",
      "====Pronunciation====",
      "* {{IPA|en|/lɛd/}}",
      "====Noun====",
      "# A metallic element.",
    ].join("\n");

    const result = parseWikitext("lead", wikitext);
    expect(result).toHaveLength(2);
    expect(result[0].pronunciations).toEqual([{ ipa: "/liːd/" }]);
    expect(result[0].pos).toBe("verb");
    expect(result[1].pronunciations).toEqual([{ ipa: "/lɛd/" }]);
    expect(result[1].pos).toBe("noun");
  });

  it("accumulates multiple IPA lines in a pronunciation section", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{IPA|en|/wɪnd/}}",
      "* {{IPA|en|/wɪːnd/}}",
      "===Noun===",
      "# Moving air.",
    ].join("\n");

    const result = parseWikitext("wind", wikitext);
    expect(result[0].pronunciations).toHaveLength(2);
    expect(result[0].pronunciations[0].ipa).toBe("/wɪnd/");
    expect(result[0].pronunciations[1].ipa).toBe("/wɪːnd/");
  });

  it("stops at the next language section", () => {
    const wikitext = [
      "==English==",
      "===Noun===",
      "# English thing.",
      "==French==",
      "===Noun===",
      "# French thing.",
    ].join("\n");

    const result = parseWikitext("pain", wikitext);
    expect(result).toHaveLength(1);
    expect(result[0].definitions[""]).toEqual([
      { definition: "English thing.", labels: [] },
    ]);
  });

  it("handles POS with no definitions", () => {
    const wikitext = [
      "==English==",
      "===Noun===",
      "===Verb===",
      "# To act.",
    ].join("\n");

    const result = parseWikitext("test", wikitext);
    // Noun has no definitions so shouldn't produce an entry
    expect(result).toHaveLength(1);
    expect(result[0].pos).toBe("verb");
  });
});
