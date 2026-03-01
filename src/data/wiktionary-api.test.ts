import { describe, it, expect } from "vitest";
import type { WiktionaryEntry } from "./types.ts";
import { parseIPA, parseAudio, parseLabels, parseDefinitions, parseWikitext, filterPronunciations, filterDefinitions } from "./wiktionary-api.ts";

describe("parseIPA", () => {
  it("extracts IPA values with accent markers from separate templates", () => {
    const result = parseIPA("* {{IPA|en|/ˈɹɛkɚd/|a=GenAm}} {{IPA|en|/ˈɹɛkɔːd/|a=RP}}");
    expect(result).toEqual([
      { ipa: "/ˈɹɛkɚd/", notation: "phonemic", accent: "GenAm" },
      { ipa: "/ˈɹɛkɔːd/", notation: "phonemic", accent: "RP" },
    ]);
  });

  it("captures accent when it appears after IPA values", () => {
    const result = parseIPA("* {{IPA|en|[tʰu̟(ː)]|a=US}}");
    expect(result).toEqual([
      { ipa: "[tʰu̟(ː)]", notation: "phonetic", accent: "US" },
    ]);
  });

  it("captures qualifier", () => {
    const result = parseIPA("* {{IPA|en|q=before a consonant|/tə/|/tʊ/}}");
    expect(result).toEqual([
      { ipa: "/tə/", notation: "phonemic", qualifier: "before a consonant" },
      { ipa: "/tʊ/", notation: "phonemic", qualifier: "before a consonant" },
    ]);
  });

  it("captures both accent and qualifier", () => {
    const result = parseIPA("* {{IPA|en|[ɾə]|a=US|q=after a vowel}}");
    expect(result).toEqual([
      { ipa: "[ɾə]", notation: "phonetic", accent: "US", qualifier: "after a vowel" },
    ]);
  });

  it("returns empty array for line with no IPA template", () => {
    expect(parseIPA("* {{audio|en|foo.ogg}}")).toEqual([]);
    expect(parseIPA("just some text")).toEqual([]);
  });

  it("inherits parent accent when no a= in child", () => {
    const result = parseIPA("** {{IPA|en|/ðə/}}", "RP");
    expect(result).toEqual([
      { ipa: "/ðə/", notation: "phonemic", accent: "RP" },
    ]);
  });

  it("moves form-descriptor a= to qualifier when parent accent exists", () => {
    const result = parseIPA("** {{IPA|en|/ðə/|a=weak form before consonants}}", "RP");
    expect(result).toEqual([
      { ipa: "/ðə/", notation: "phonemic", accent: "RP", qualifier: "weak form before consonants" },
    ]);
  });

  it("lets known-accent a= override parent accent", () => {
    const result = parseIPA("** {{IPA|en|/hæd/|a=Northumbrian}}", "UK");
    expect(result).toEqual([
      { ipa: "/hæd/", notation: "phonemic", accent: "Northumbrian" },
    ]);
  });

  it("combines existing q= with form-descriptor a= when parent accent exists", () => {
    const result = parseIPA("** {{IPA|en|/ðə/|a=weak form|q=before a consonant}}", "GA");
    expect(result).toEqual([
      { ipa: "/ðə/", notation: "phonemic", accent: "GA", qualifier: "weak form; before a consonant" },
    ]);
  });

  it("moves non-accent a= to qualifier when no parent accent (Pattern A)", () => {
    const result = parseIPA("* {{IPA|en|/ən/|a=weak form}}");
    expect(result).toEqual([
      { ipa: "/ən/", notation: "phonemic", qualifier: "weak form" },
    ]);
  });

  it("splits mixed a= into accent and qualifier parts", () => {
    const result = parseIPA("* {{IPA|en|/ɘn/|a=NZ,weak form}}");
    expect(result).toEqual([
      { ipa: "/ɘn/", notation: "phonemic", accent: "NZ", qualifier: "weak form" },
    ]);
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

  it("ignores example and quotation lines", () => {
    const result = parseDefinitions([
      "# A thing.",
      "#: This is an example.",
      "#* A quotation.",
    ]);
    expect(result).toEqual({
      "": [{ definition: "A thing.", labels: [] }],
    });
  });

  it("captures sub-definitions on ## lines", () => {
    const result = parseDefinitions([
      "## A domesticated feline.",
      "## A wild feline.",
    ]);
    expect(result).toEqual({
      "": [
        { definition: "A domesticated feline.", labels: [] },
        { definition: "A wild feline.", labels: [] },
      ],
    });
  });

  it("extracts text from {{non-gloss}} templates", () => {
    const result = parseDefinitions([
      "# {{non-gloss|Terms relating to animals.}}",
    ]);
    expect(result).toEqual({
      "": [{ definition: "Terms relating to animals.", labels: [] }],
    });
  });

  it("extracts text from {{n-g}} templates", () => {
    const result = parseDefinitions([
      "# {{n-g|Used before a noun phrase, including a simple noun}}",
    ]);
    expect(result).toEqual({
      "": [{ definition: "Used before a noun phrase, including a simple noun", labels: [] }],
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

  it("extracts content from {{w}} Wikipedia links", () => {
    const result = parseDefinitions(["# Made by {{w|Caterpillar Inc.}}."]);
    expect(result).toEqual({
      "": [{ definition: "Made by Caterpillar Inc..", labels: [] }],
    });
  });

  it("extracts content from {{m|en}} mentions", () => {
    const result = parseDefinitions(["# Related to {{m|en|foo}}."]);
    expect(result).toEqual({
      "": [{ definition: "Related to foo.", labels: [] }],
    });
  });

  it("extracts content from taxonomy templates", () => {
    const result = parseDefinitions(["# Of the genus {{taxfmt|Felis|genus}}."]);
    expect(result).toEqual({
      "": [{ definition: "Of the genus Felis.", labels: [] }],
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

  it("skips punctuation-only definitions", () => {
    const result = parseDefinitions(["# ."]);
    expect(result).toEqual({});
  });

  it("extracts 'plural of' from form-of template", () => {
    const result = parseDefinitions(["# {{plural of|en|cat}}"]);
    expect(result).toEqual({
      "": [{ definition: "plural of cat", labels: [] }],
    });
  });

  it("extracts 'inflection of' from infl of template", () => {
    const result = parseDefinitions(["# {{infl of|en|hold||s-verb-form}}"]);
    expect(result).toEqual({
      "": [{ definition: "inflection of hold", labels: [] }],
    });
  });

  it("extracts 'past tense of' from en-past of template", () => {
    const result = parseDefinitions(["# {{en-past of|walk}}"]);
    expect(result).toEqual({
      "": [{ definition: "past tense of walk", labels: [] }],
    });
  });

  it("extracts 'present participle of' template", () => {
    const result = parseDefinitions(["# {{present participle of|en|run}}"]);
    expect(result).toEqual({
      "": [{ definition: "present participle of run", labels: [] }],
    });
  });

  it("extracts 'alternative form of' from alt form template", () => {
    const result = parseDefinitions(["# {{alt form|en|colour}}"]);
    expect(result).toEqual({
      "": [{ definition: "alternative form of colour", labels: [] }],
    });
  });

  it("extracts text from {{U}} template", () => {
    const result = parseDefinitions(["# {{U|thick}}; [[large]]."]);
    expect(result).toEqual({
      "": [{ definition: "thick; large.", labels: [] }],
    });
  });

  it("extracts text from {{cap}} template with suffix", () => {
    const result = parseDefinitions(["# {{cap|carry|ing}} more fat than usual."]);
    expect(result).toEqual({
      "": [{ definition: "Carrying more fat than usual.", labels: [] }],
    });
  });

  it("strips leading semicolons left by stripped templates", () => {
    const result = parseDefinitions(["# ; large."]);
    expect(result).toEqual({
      "": [{ definition: "large.", labels: [] }],
    });
  });

  it("extracts text from {{gl}} gloss template", () => {
    const result = parseDefinitions(["# A vessel {{gl|for water or wine}}."]);
    expect(result).toEqual({
      "": [{ definition: "A vessel for water or wine.", labels: [] }],
    });
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
    expect(result[0].pronunciations).toEqual([{ ipa: "/kæt/", notation: "phonemic" }]);
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
    expect(result[0].pronunciations).toEqual([{ ipa: "/liːd/", notation: "phonemic" }]);
    expect(result[0].pos).toBe("verb");
    expect(result[1].pronunciations).toEqual([{ ipa: "/lɛd/", notation: "phonemic" }]);
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

  it("inherits top-level pronunciation into etymology entries", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{IPA|en|/kæt/}}",
      "===Etymology 1===",
      "====Noun====",
      "# A feline.",
      "===Etymology 2===",
      "====Verb====",
      "# To vomit.",
    ].join("\n");

    const result = parseWikitext("cat", wikitext);
    expect(result).toHaveLength(2);
    expect(result[0].pronunciations).toEqual([{ ipa: "/kæt/", notation: "phonemic" }]);
    expect(result[1].pronunciations).toEqual([{ ipa: "/kæt/", notation: "phonemic" }]);
  });

  it("uses etymology pronunciation over top-level when both exist", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{IPA|en|/tɒp/}}",
      "===Etymology 1===",
      "====Pronunciation====",
      "* {{IPA|en|/liːd/}}",
      "====Verb====",
      "# To guide.",
      "===Etymology 2===",
      "====Noun====",
      "# A thing.",
    ].join("\n");

    const result = parseWikitext("lead", wikitext);
    expect(result).toHaveLength(2);
    expect(result[0].pronunciations).toEqual([{ ipa: "/liːd/", notation: "phonemic" }]);
    expect(result[1].pronunciations).toEqual([{ ipa: "/tɒp/", notation: "phonemic" }]);
  });

  it("handles POS with no definitions", () => {
    const wikitext = [
      "==English==",
      "===Noun===",
      "===Verb===",
      "# To act.",
    ].join("\n");

    const result = parseWikitext("test", wikitext);
    expect(result).toHaveLength(1);
    expect(result[0].pos).toBe("verb");
  });

  it("merges entries with same POS and same pronunciations", () => {
    const wikitext = [
      "==English==",
      "===Etymology 1===",
      "====Pronunciation====",
      "* {{IPA|en|/kæt/}}",
      "====Noun====",
      "# A feline.",
      "===Etymology 2===",
      "====Pronunciation====",
      "* {{IPA|en|/kæt/}}",
      "====Noun====",
      "# A catfish.",
    ].join("\n");

    const result = parseWikitext("cat", wikitext);
    expect(result).toHaveLength(1);
    expect(result[0].pos).toBe("noun");
    expect(result[0].definitions[""]).toEqual([
      { definition: "A feline.", labels: [] },
      { definition: "A catfish.", labels: [] },
    ]);
  });

  it("parses nested accent pattern with {{a|en|...}} on parent bullets", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{a|en|RP}}",
      "** {{IPA|en|/ðə/|a=weak form before consonants}}",
      "** {{IPA|en|/ðiː/|a=strong form}}",
      "* {{a|en|GA}}",
      "** {{IPA|en|/ðə/|a=weak form before consonants}}",
      "** {{IPA|en|/ði/|a=strong form}}",
      "===Article===",
      "# The definite article.",
    ].join("\n");

    const result = parseWikitext("the", wikitext);
    expect(result).toHaveLength(1);
    const prons = result[0].pronunciations;
    expect(prons).toHaveLength(4);
    expect(prons[0]).toEqual({ ipa: "/ðə/", notation: "phonemic", accent: "RP", qualifier: "weak form before consonants" });
    expect(prons[1]).toEqual({ ipa: "/ðiː/", notation: "phonemic", accent: "RP", qualifier: "strong form" });
    expect(prons[2]).toEqual({ ipa: "/ðə/", notation: "phonemic", accent: "GA", qualifier: "weak form before consonants" });
    expect(prons[3]).toEqual({ ipa: "/ði/", notation: "phonemic", accent: "GA", qualifier: "strong form" });
  });

  it("does not bleed parent accent into Pattern A lines", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{IPA|en|/hæt/|a=UK,US}}",
      "===Noun===",
      "# A hat.",
    ].join("\n");

    const result = parseWikitext("hat", wikitext);
    expect(result[0].pronunciations).toEqual([
      { ipa: "/hæt/", notation: "phonemic", accent: "UK,US" },
    ]);
  });

  it("inherits parent accent when child IPA has no a=", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{a|en|UK}}",
      "** {{IPA|en|/həʊld/|[həʊɫd]}}",
      "===Verb===",
      "# To grasp.",
    ].join("\n");

    const result = parseWikitext("hold", wikitext);
    const prons = result[0].pronunciations;
    expect(prons).toHaveLength(2);
    expect(prons[0]).toEqual({ ipa: "/həʊld/", notation: "phonemic", accent: "UK" });
    expect(prons[1]).toEqual({ ipa: "[həʊɫd]", notation: "phonetic", accent: "UK" });
  });
});

describe("filterPronunciations", () => {
  const entries: WiktionaryEntry[] = [
    {
      word: "cat",
      pos: "noun",
      pronunciations: [
        { ipa: "/kæt/", notation: "phonemic" as const, accent: "RP,GA" },
        { ipa: "[kʰæt]", notation: "phonetic" as const, accent: "RP,GA" },
      ],
      audio: [],
      definitions: { "": [{ definition: "A feline.", labels: [] }] },
    },
  ];

  it("filters by accent", () => {
    const result = filterPronunciations(entries, "GA");
    expect(result).toHaveLength(1);
    expect(result[0].pronunciations).toHaveLength(2);
  });

  it("drops entries when accent matches nothing", () => {
    const result = filterPronunciations(entries, "AU");
    expect(result).toHaveLength(0);
  });

  it("filters by notation", () => {
    const result = filterPronunciations(entries, undefined, "phonemic");
    expect(result).toHaveLength(1);
    expect(result[0].pronunciations).toHaveLength(1);
    expect(result[0].pronunciations[0].notation).toBe("phonemic");
  });

  it("combines accent and notation filters", () => {
    const result = filterPronunciations(entries, "GA", "phonetic");
    expect(result).toHaveLength(1);
    expect(result[0].pronunciations).toEqual([
      { ipa: "[kʰæt]", notation: "phonetic", accent: "RP,GA" },
    ]);
  });

  it("drops entries when combined filters match nothing", () => {
    const result = filterPronunciations(entries, "AU", "phonemic");
    expect(result).toHaveLength(0);
  });

  it("matches accent aliases (GA matches US and GenAm)", () => {
    const usEntries: WiktionaryEntry[] = [{
      word: "hog",
      pos: "noun",
      pronunciations: [
        { ipa: "/hɑɡ/", notation: "phonemic" as const, accent: "US" },
      ],
      audio: [],
      definitions: { "": [{ definition: "A pig.", labels: [] }] },
    }];
    const result = filterPronunciations(usEntries, "GA");
    expect(result).toHaveLength(1);
    expect(result[0].pronunciations).toHaveLength(1);
  });

  it("matches accent aliases (US matches GA)", () => {
    const gaEntries: WiktionaryEntry[] = [{
      word: "hold",
      pos: "verb",
      pronunciations: [
        { ipa: "/hoʊldz/", notation: "phonemic" as const, accent: "GenAm" },
      ],
      audio: [],
      definitions: { "": [{ definition: "To grasp.", labels: [] }] },
    }];
    const result = filterPronunciations(gaEntries, "US");
    expect(result).toHaveLength(1);
  });
});

describe("filterDefinitions", () => {
  const entries: WiktionaryEntry[] = [
    {
      word: "cat",
      pos: "noun",
      pronunciations: [{ ipa: "/kæt/", notation: "phonemic" as const }],
      audio: [],
      definitions: {
        "": [
          { definition: "A feline.", labels: [] },
          { definition: "A jazz musician.", labels: ["slang", "jazz"] },
          { definition: "A spiteful woman.", labels: ["derogatory", "offensive"] },
          { definition: "A catfish.", labels: ["informal"] },
        ],
      },
    },
  ];

  it("includes definitions matching any label (OR)", () => {
    const result = filterDefinitions(entries, ["slang", "informal"]);
    expect(result).toHaveLength(1);
    const defs = result[0].definitions[""];
    expect(defs).toHaveLength(2);
    expect(defs[0].definition).toBe("A jazz musician.");
    expect(defs[1].definition).toBe("A catfish.");
  });

  it("excludes definitions matching any label-not (OR)", () => {
    const result = filterDefinitions(entries, undefined, ["derogatory", "slang"]);
    expect(result).toHaveLength(1);
    const defs = result[0].definitions[""];
    expect(defs).toHaveLength(2);
    expect(defs[0].definition).toBe("A feline.");
    expect(defs[1].definition).toBe("A catfish.");
  });

  it("applies both label and label-not together", () => {
    const result = filterDefinitions(entries, ["slang"], ["jazz"]);
    expect(result).toHaveLength(0);
  });

  it("drops entries with no remaining definitions", () => {
    const result = filterDefinitions(entries, ["archaic"]);
    expect(result).toHaveLength(0);
  });

  it("keeps entries across grammatical classes", () => {
    const multi: WiktionaryEntry[] = [{
      word: "record",
      pos: "verb",
      pronunciations: [{ ipa: "/ɹɪˈkɔːd/", notation: "phonemic" as const }],
      audio: [],
      definitions: {
        "transitive": [
          { definition: "To write down.", labels: ["legal"] },
          { definition: "To capture audio.", labels: [] },
        ],
        "intransitive": [
          { definition: "To make a recording.", labels: [] },
        ],
      },
    }];
    const result = filterDefinitions(multi, ["legal"]);
    expect(result).toHaveLength(1);
    expect(Object.keys(result[0].definitions)).toEqual(["transitive"]);
    expect(result[0].definitions["transitive"]).toHaveLength(1);
  });
});

describe("parseAudio", () => {
  it("parses a basic audio template", () => {
    const result = parseAudio("* {{audio|en|En-us-cat.ogg}}");
    expect(result).toHaveLength(1);
    expect(result[0].url).toContain("En-us-cat.ogg");
    expect(result[0].accent).toBeUndefined();
    expect(result[0].ipa).toBeUndefined();
  });

  it("parses accent parameter", () => {
    const result = parseAudio("* {{audio|en|En-us-record.ogg|a=US}}");
    expect(result).toHaveLength(1);
    expect(result[0].accent).toBe("US");
  });

  it("parses IPA annotation", () => {
    const result = parseAudio("* {{audio|en|En-uk-record.ogg|a=UK|IPA=/ˈɹɛkɔːd/}}");
    expect(result).toHaveLength(1);
    expect(result[0].accent).toBe("UK");
    expect(result[0].ipa).toBe("/ˈɹɛkɔːd/");
  });

  it("parses multiple audio templates on one line", () => {
    const result = parseAudio("* {{audio|en|En-us-cat.ogg|a=US}} {{audio|en|En-uk-cat.ogg|a=UK}}");
    expect(result).toHaveLength(2);
    expect(result[0].accent).toBe("US");
    expect(result[1].accent).toBe("UK");
  });

  it("returns empty for non-English audio", () => {
    const result = parseAudio("* {{audio|fr|Fr-chat.ogg}}");
    expect(result).toEqual([]);
  });

  it("returns empty for line with no audio template", () => {
    expect(parseAudio("* {{IPA|en|/kæt/}}")).toEqual([]);
    expect(parseAudio("just text")).toEqual([]);
  });

  it("constructs valid Wikimedia Commons URL with MD5 path", () => {
    const result = parseAudio("* {{audio|en|En-us-cat.ogg}}");
    expect(result[0].url).toMatch(
      /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[0-9a-f]\/[0-9a-f]{2}\//,
    );
  });
});

describe("parseDefinitions (contraction of)", () => {
  it("extracts 'contraction of' from template", () => {
    const result = parseDefinitions(["# {{contraction of|en|I am}}"]);
    expect(result).toEqual({
      "": [{ definition: "contraction of I am", labels: [] }],
    });
  });
});

describe("parseWikitext (skip list / unknown headers)", () => {
  it("treats unknown headers as POS sections", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{IPA|en|/ˈnʌm.bɚ/}}",
      "===Numeral===",
      "# The cardinal number seven.",
    ].join("\n");

    const result = parseWikitext("seven", wikitext);
    expect(result).toHaveLength(1);
    expect(result[0].pos).toBe("numeral");
    expect(result[0].definitions[""]).toEqual([
      { definition: "The cardinal number seven.", labels: [] },
    ]);
  });

  it("treats Contraction as a POS section", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{IPA|en|/aɪm/}}",
      "===Contraction===",
      "# {{contraction of|en|I am}}",
    ].join("\n");

    const result = parseWikitext("i'm", wikitext);
    expect(result).toHaveLength(1);
    expect(result[0].pos).toBe("contraction");
  });

  it("skips NON_POS headers like Usage notes", () => {
    const wikitext = [
      "==English==",
      "===Noun===",
      "# A thing.",
      "===Usage notes===",
      "This is commonly misused.",
      "===Synonyms===",
      "* [[stuff]]",
    ].join("\n");

    const result = parseWikitext("thing", wikitext);
    expect(result).toHaveLength(1);
    expect(result[0].pos).toBe("noun");
  });
});

describe("parseWikitext (audio)", () => {
  it("includes audio data on entries", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{IPA|en|/kæt/}}",
      "* {{audio|en|En-us-cat.ogg|a=US}}",
      "===Noun===",
      "# A feline.",
    ].join("\n");

    const result = parseWikitext("cat", wikitext);
    expect(result).toHaveLength(1);
    expect(result[0].audio).toHaveLength(1);
    expect(result[0].audio[0].accent).toBe("US");
    expect(result[0].audio[0].url).toContain("En-us-cat.ogg");
  });

  it("inherits top-level audio into etymology entries", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{audio|en|En-us-cat.ogg|a=US}}",
      "===Etymology 1===",
      "====Noun====",
      "# A feline.",
      "===Etymology 2===",
      "====Verb====",
      "# To vomit.",
    ].join("\n");

    const result = parseWikitext("cat", wikitext);
    expect(result).toHaveLength(2);
    expect(result[0].audio).toHaveLength(1);
    expect(result[1].audio).toHaveLength(1);
    expect(result[0].audio[0].url).toBe(result[1].audio[0].url);
  });

  it("uses etymology audio over top-level when both exist", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{audio|en|En-top.ogg}}",
      "===Etymology 1===",
      "====Pronunciation====",
      "* {{audio|en|En-etym1.ogg|a=US}}",
      "====Verb====",
      "# To guide.",
      "===Etymology 2===",
      "====Noun====",
      "# A thing.",
    ].join("\n");

    const result = parseWikitext("lead", wikitext);
    expect(result).toHaveLength(2);
    expect(result[0].audio).toHaveLength(1);
    expect(result[0].audio[0].url).toContain("En-etym1.ogg");
    // Etymology 2 has no audio, falls back to top-level
    expect(result[1].audio).toHaveLength(1);
    expect(result[1].audio[0].url).toContain("En-top.ogg");
  });

  it("returns empty audio array when no audio templates exist", () => {
    const wikitext = [
      "==English==",
      "===Pronunciation===",
      "* {{IPA|en|/kæt/}}",
      "===Noun===",
      "# A feline.",
    ].join("\n");

    const result = parseWikitext("cat", wikitext);
    expect(result[0].audio).toEqual([]);
  });
});
