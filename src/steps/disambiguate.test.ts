import { describe, it, expect } from "vitest";
import { disambiguate } from "./disambiguate.ts";
import type { WiktionaryEntry, LookupResult } from "../data/types.ts";

// ── Helpers ───────────────────────────────────────────────────────

function makeEntry(word: string, pos: string, ipa: string): WiktionaryEntry {
  return {
    word,
    pos,
    pronunciations: [{ ipa, notation: "phonemic" as const }],
    audio: [],
    definitions: { "": [{ definition: `${pos} sense`, labels: [] }] },
  };
}

function makeResult(
  word: string,
  position: number,
  entries: WiktionaryEntry[],
): LookupResult {
  if (entries.length === 0) {
    return {
      status: "unknown",
      token: {
        text: word,
        position,
        normalized: word.toLowerCase(),
        punctuation: { leading: "", trailing: "" },
      },
      entries,
    };
  }
  const keys = new Set(
    entries.map((e) =>
      e.pronunciations
        .map((p) => p.ipa)
        .sort()
        .join("|"),
    ),
  );
  return {
    status: keys.size <= 1 ? "resolved" : "ambiguous",
    token: {
      text: word,
      position,
      normalized: word.toLowerCase(),
      punctuation: { leading: "", trailing: "" },
    },
    entries,
  };
}

// ── Heteronym fixtures ────────────────────────────────────────────

const recordNoun = makeEntry("record", "noun", "/ˈɹɛk.ɔːd/");
const recordVerb = makeEntry("record", "verb", "/ɹɪˈkɔːd/");
const presentNoun = makeEntry("present", "noun", "/ˈpɹɛz.ənt/");
const presentVerb = makeEntry("present", "verb", "/pɹɪˈzɛnt/");
const produceNoun = makeEntry("produce", "noun", "/ˈpɹɒd.juːs/");
const produceVerb = makeEntry("produce", "verb", "/pɹəˈdjuːs/");
const objectNoun = makeEntry("object", "noun", "/ˈɒb.dʒɛkt/");
const objectVerb = makeEntry("object", "verb", "/əbˈdʒɛkt/");
const conductNoun = makeEntry("conduct", "noun", "/ˈkɒn.dʌkt/");
const conductVerb = makeEntry("conduct", "verb", "/kənˈdʌkt/");
const leadNoun = makeEntry("lead", "noun", "/lɛd/");
const leadVerb = makeEntry("lead", "verb", "/liːd/");
const readPast = makeEntry("read", "verb", "/ɹɛd/");
const readPresent = makeEntry("read", "verb", "/ɹiːd/");

// ── Tests ─────────────────────────────────────────────────────────

describe("disambiguate", () => {
  // Rule 1: to + word -> verb
  it("resolves 'to record' as verb", () => {
    const results = [
      makeResult("to", 0, [makeEntry("to", "particle", "/tuː/")]),
      makeResult("record", 1, [recordNoun, recordVerb]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries).toHaveLength(1);
    expect(out[1].entries[0].pos).toBe("verb");
    expect(out[1].disambiguatedBy).toBe("to + word -> verb");
  });

  // Rule 2: determiner + word -> noun
  it("resolves 'the record' as noun", () => {
    const results = [
      makeResult("the", 0, [makeEntry("the", "article", "/ðə/")]),
      makeResult("record", 1, [recordNoun, recordVerb]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries[0].pos).toBe("noun");
    expect(out[1].disambiguatedBy).toBe("determiner + word -> noun");
  });

  it("resolves 'my record' as noun", () => {
    const results = [
      makeResult("my", 0, [makeEntry("my", "determiner", "/maɪ/")]),
      makeResult("record", 1, [recordNoun, recordVerb]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries[0].pos).toBe("noun");
  });

  // Rule 3: determiner + adjective + word -> noun
  it("resolves 'the broken record' as noun", () => {
    const results = [
      makeResult("the", 0, [makeEntry("the", "article", "/ðə/")]),
      makeResult("broken", 1, [
        makeEntry("broken", "adjective", "/ˈbɹoʊ.kən/"),
      ]),
      makeResult("record", 2, [recordNoun, recordVerb]),
    ];
    const out = disambiguate(results);
    expect(out[2].status).toBe("resolved");
    expect(out[2].entries[0].pos).toBe("noun");
    expect(out[2].disambiguatedBy).toBe(
      "determiner + adjective + word -> noun",
    );
  });

  // Rule 4: subject pronoun + word -> verb
  it("resolves 'I record' as verb", () => {
    const results = [
      makeResult("I", 0, [makeEntry("i", "pronoun", "/aɪ/")]),
      makeResult("record", 1, [recordNoun, recordVerb]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries[0].pos).toBe("verb");
    expect(out[1].disambiguatedBy).toBe("subject pronoun + word -> verb");
  });

  it("resolves 'they produce' as verb", () => {
    const results = [
      makeResult("they", 0, [makeEntry("they", "pronoun", "/ðeɪ/")]),
      makeResult("produce", 1, [produceNoun, produceVerb]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries[0].pos).toBe("verb");
  });

  // Rule 5: subject pronoun + adverb + word -> verb
  it("resolves 'I always record' as verb", () => {
    const results = [
      makeResult("I", 0, [makeEntry("i", "pronoun", "/aɪ/")]),
      makeResult("always", 1, [makeEntry("always", "adverb", "/ˈɔːl.weɪz/")]),
      makeResult("record", 2, [recordNoun, recordVerb]),
    ];
    const out = disambiguate(results);
    expect(out[2].status).toBe("resolved");
    expect(out[2].entries[0].pos).toBe("verb");
    expect(out[2].disambiguatedBy).toBe(
      "subject pronoun + adverb + word -> verb",
    );
  });

  // Rule 6: modal/auxiliary + word -> verb
  it("resolves 'will record' as verb", () => {
    const results = [
      makeResult("will", 0, [makeEntry("will", "verb", "/wɪl/")]),
      makeResult("record", 1, [recordNoun, recordVerb]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries[0].pos).toBe("verb");
    expect(out[1].disambiguatedBy).toBe("modal/auxiliary + word -> verb");
  });

  it("resolves 'can produce' as verb", () => {
    const results = [
      makeResult("can", 0, [makeEntry("can", "verb", "/kæn/")]),
      makeResult("produce", 1, [produceNoun, produceVerb]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries[0].pos).toBe("verb");
  });

  // Rule 7: modal/auxiliary + adverb + word -> verb
  it("resolves 'will not record' as verb", () => {
    const results = [
      makeResult("will", 0, [makeEntry("will", "verb", "/wɪl/")]),
      makeResult("not", 1, [makeEntry("not", "adverb", "/nɒt/")]),
      makeResult("record", 2, [recordNoun, recordVerb]),
    ];
    const out = disambiguate(results);
    expect(out[2].status).toBe("resolved");
    expect(out[2].entries[0].pos).toBe("verb");
    expect(out[2].disambiguatedBy).toBe(
      "modal/auxiliary + adverb + word -> verb",
    );
  });

  // Rule 8: word + determiner -> verb
  it("resolves 'record the data' as verb", () => {
    const results = [
      makeResult("record", 0, [recordNoun, recordVerb]),
      makeResult("the", 1, [makeEntry("the", "article", "/ðə/")]),
      makeResult("data", 2, [makeEntry("data", "noun", "/ˈdeɪ.tə/")]),
    ];
    const out = disambiguate(results);
    expect(out[0].status).toBe("resolved");
    expect(out[0].entries[0].pos).toBe("verb");
    expect(out[0].disambiguatedBy).toBe("word + determiner -> verb");
  });

  // Rule 9: word + object pronoun -> verb
  it("resolves 'present him' as verb", () => {
    const results = [
      makeResult("present", 0, [presentNoun, presentVerb]),
      makeResult("him", 1, [makeEntry("him", "pronoun", "/hɪm/")]),
    ];
    const out = disambiguate(results);
    expect(out[0].status).toBe("resolved");
    expect(out[0].entries[0].pos).toBe("verb");
    expect(out[0].disambiguatedBy).toBe("word + object pronoun -> verb");
  });

  // Rule 10: noun-only word + word -> verb
  it("resolves 'fascists are' as verb (noun-only predecessor)", () => {
    const areVerb = makeEntry("are", "verb", "/ɑː/");
    const areNoun = makeEntry("are", "noun", "/ɛə/");
    const results = [
      makeResult("fascists", 0, [makeEntry("fascists", "noun", "/ˈfæʃ.ɪsts/")]),
      makeResult("are", 1, [areVerb, areNoun]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries[0].pos).toBe("verb");
    expect(out[1].disambiguatedBy).toBe("noun-only word + word -> verb");
  });

  it("resolves 'cats produce' as verb (noun-only predecessor)", () => {
    const results = [
      makeResult("cats", 0, [makeEntry("cats", "noun", "/kæts/")]),
      makeResult("produce", 1, [produceNoun, produceVerb]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries[0].pos).toBe("verb");
    expect(out[1].disambiguatedBy).toBe("noun-only word + word -> verb");
  });

  it("does NOT fire noun-only rule when predecessor also has verb POS", () => {
    const results = [
      makeResult("record", 0, [recordNoun, recordVerb]),
      makeResult("produce", 1, [produceNoun, produceVerb]),
    ];
    const out = disambiguate(results);
    // "record" has both noun and verb POS, so the rule should not fire for "produce"
    expect(out[1].disambiguatedBy).not.toBe("noun-only word + word -> verb");
  });

  // Passthrough: resolved tokens unchanged
  it("does not modify resolved tokens", () => {
    const results = [makeResult("cat", 0, [makeEntry("cat", "noun", "/kæt/")])];
    const out = disambiguate(results);
    expect(out[0].status).toBe("resolved");
    expect(out[0].disambiguatedBy).toBeUndefined();
  });

  // Passthrough: unknown tokens unchanged
  it("does not modify unknown tokens", () => {
    const results = [makeResult("xyzzy", 0, [])];
    const out = disambiguate(results);
    expect(out[0].status).toBe("unknown");
  });

  // No context: stays ambiguous
  it("leaves ambiguous when no rule matches", () => {
    const results = [makeResult("record", 0, [recordNoun, recordVerb])];
    const out = disambiguate(results);
    expect(out[0].status).toBe("ambiguous");
    expect(out[0].entries).toHaveLength(2);
    expect(out[0].disambiguatedBy).toBeUndefined();
  });

  // "read" edge case: both verb, POS narrows but pronunciation still ambiguous
  it("narrows 'I read' but keeps ambiguous (both verb pronunciations)", () => {
    const results = [
      makeResult("I", 0, [makeEntry("i", "pronoun", "/aɪ/")]),
      makeResult("read", 1, [readPast, readPresent]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("ambiguous");
    expect(out[1].entries).toHaveLength(2);
    expect(out[1].disambiguatedBy).toBe(
      "subject pronoun + word -> verb (narrowed)",
    );
  });

  // Multiple heteronyms in one sentence
  it("resolves multiple heteronyms: 'I will present the object'", () => {
    const results = [
      makeResult("I", 0, [makeEntry("i", "pronoun", "/aɪ/")]),
      makeResult("will", 1, [makeEntry("will", "verb", "/wɪl/")]),
      makeResult("present", 2, [presentNoun, presentVerb]),
      makeResult("the", 3, [makeEntry("the", "article", "/ðə/")]),
      makeResult("object", 4, [objectNoun, objectVerb]),
    ];
    const out = disambiguate(results);
    expect(out[2].status).toBe("resolved");
    expect(out[2].entries[0].pos).toBe("verb");
    expect(out[4].status).toBe("resolved");
    expect(out[4].entries[0].pos).toBe("noun");
  });

  // conduct
  it("resolves 'conduct the orchestra' as verb", () => {
    const results = [
      makeResult("conduct", 0, [conductNoun, conductVerb]),
      makeResult("the", 1, [makeEntry("the", "article", "/ðə/")]),
      makeResult("orchestra", 2, [
        makeEntry("orchestra", "noun", "/ˈɔːr.kɪ.strə/"),
      ]),
    ];
    const out = disambiguate(results);
    expect(out[0].status).toBe("resolved");
    expect(out[0].entries[0].pos).toBe("verb");
  });

  it("resolves 'his conduct' as noun", () => {
    const results = [
      makeResult("his", 0, [makeEntry("his", "determiner", "/hɪz/")]),
      makeResult("conduct", 1, [conductNoun, conductVerb]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries[0].pos).toBe("noun");
  });

  // lead
  it("resolves 'the lead' as noun", () => {
    const results = [
      makeResult("the", 0, [makeEntry("the", "article", "/ðə/")]),
      makeResult("lead", 1, [leadNoun, leadVerb]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries[0].pos).toBe("noun");
  });

  it("resolves 'I lead' as verb", () => {
    const results = [
      makeResult("I", 0, [makeEntry("i", "pronoun", "/aɪ/")]),
      makeResult("lead", 1, [leadNoun, leadVerb]),
    ];
    const out = disambiguate(results);
    expect(out[1].status).toBe("resolved");
    expect(out[1].entries[0].pos).toBe("verb");
  });

  // ── Qualifier preference tests ──────────────────────────────────

  describe("qualifier preference", () => {
    function makeEntryWithQualifiers(
      word: string,
      pos: string,
      prons: { ipa: string; qualifier?: string }[],
    ): WiktionaryEntry {
      return {
        word,
        pos,
        pronunciations: prons.map((p) => ({
          ipa: p.ipa,
          notation: "phonemic" as const,
          qualifier: p.qualifier,
        })),
        audio: [],
        definitions: { "": [{ definition: `${pos} sense`, labels: [] }] },
      };
    }

    it("resolves ambiguity when preferQualifier narrows to shared IPA", () => {
      // "a" has stressed /eɪ/ and unstressed /ə/ in article, but only /ʌ/ in pronoun
      const article = makeEntryWithQualifiers("a", "article", [
        { ipa: "/eɪ/", qualifier: "stressed" },
        { ipa: "/ə/", qualifier: "unstressed" },
      ]);
      const pronoun = makeEntryWithQualifiers("a", "pronoun", [
        { ipa: "/ə/", qualifier: "unstressed" },
      ]);
      const results = makeResult("a", 0, [article, pronoun]);
      results.status = "ambiguous"; // force ambiguous

      const out = disambiguate([results], { preferQualifier: ["unstressed"] });
      expect(out[0].status).toBe("resolved");
      expect(out[0].disambiguatedBy).toBe("qualifier preference");
      // Both entries should now only have /ə/
      expect(out[0].entries[0].pronunciations).toHaveLength(1);
      expect(out[0].entries[0].pronunciations[0].ipa).toBe("/ə/");
    });

    it("resolves ambiguity when preferQualifierNot eliminates stressed forms", () => {
      const article = makeEntryWithQualifiers("a", "article", [
        { ipa: "/eɪ/", qualifier: "stressed" },
        { ipa: "/ə/" },
      ]);
      const pronoun = makeEntryWithQualifiers("a", "pronoun", [{ ipa: "/ə/" }]);
      const results = makeResult("a", 0, [article, pronoun]);
      results.status = "ambiguous";

      const out = disambiguate([results], { preferQualifierNot: ["stressed"] });
      expect(out[0].status).toBe("resolved");
      expect(out[0].entries[0].pronunciations).toHaveLength(1);
      expect(out[0].entries[0].pronunciations[0].ipa).toBe("/ə/");
    });

    it("does not remove all pronunciations from an entry (non-destructive)", () => {
      // Entry where ALL pronunciations have the unwanted qualifier
      const entry = makeEntryWithQualifiers("test", "noun", [
        { ipa: "/tɛst/", qualifier: "stressed" },
      ]);
      const results = makeResult("test", 0, [entry]);
      results.status = "ambiguous";

      const out = disambiguate([results], { preferQualifierNot: ["stressed"] });
      // Should keep all pronunciations since filtering would remove everything
      expect(out[0].entries[0].pronunciations).toHaveLength(1);
    });

    it("leaves resolved tokens unchanged", () => {
      const results = [
        makeResult("cat", 0, [makeEntry("cat", "noun", "/kæt/")]),
      ];
      const out = disambiguate(results, { preferQualifier: ["unstressed"] });
      expect(out[0].status).toBe("resolved");
      expect(out[0].disambiguatedBy).toBeUndefined();
    });

    it("narrows but stays ambiguous when qualifier doesn't fully resolve", () => {
      const entry1 = makeEntryWithQualifiers("test", "noun", [
        { ipa: "/a/", qualifier: "weak form" },
        { ipa: "/b/", qualifier: "strong form" },
      ]);
      const entry2 = makeEntryWithQualifiers("test", "verb", [
        { ipa: "/c/", qualifier: "weak form" },
      ]);
      const results = makeResult("test", 0, [entry1, entry2]);
      results.status = "ambiguous";

      const out = disambiguate([results], { preferQualifier: ["weak form"] });
      expect(out[0].status).toBe("ambiguous");
      expect(out[0].disambiguatedBy).toBe("qualifier preference (narrowed)");
      // entry1 should be narrowed to just /a/
      expect(out[0].entries[0].pronunciations).toHaveLength(1);
      expect(out[0].entries[0].pronunciations[0].ipa).toBe("/a/");
    });

    it("applies qualifier preference after grammar rules", () => {
      // "I read" - grammar says verb, but read has two verb pronunciations
      // Qualifier can break the tie
      const readPastQ = makeEntryWithQualifiers("read", "verb", [
        { ipa: "/ɹɛd/", qualifier: "past tense" },
      ]);
      const readPresentQ = makeEntryWithQualifiers("read", "verb", [
        { ipa: "/ɹiːd/", qualifier: "present tense" },
      ]);
      const results = [
        makeResult("I", 0, [makeEntry("i", "pronoun", "/aɪ/")]),
        makeResult("read", 1, [readPastQ, readPresentQ]),
      ];

      // Without qualifier preference: grammar narrows to verb but still ambiguous
      const out1 = disambiguate(results);
      expect(out1[1].status).toBe("ambiguous");

      // With qualifier preference: resolves to present tense
      const out2 = disambiguate(results, {
        preferQualifier: ["present tense"],
      });
      expect(out2[1].status).toBe("resolved");
      expect(out2[1].entries).toHaveLength(1);
      expect(out2[1].entries[0].pronunciations[0].ipa).toBe("/ɹiːd/");
    });

    it("is case-insensitive for qualifier matching", () => {
      const entry1 = makeEntryWithQualifiers("a", "article", [
        { ipa: "/eɪ/", qualifier: "Stressed" },
        { ipa: "/ə/", qualifier: "Weak Form" },
      ]);
      const entry2 = makeEntryWithQualifiers("a", "pronoun", [
        { ipa: "/ə/", qualifier: "weak form" },
      ]);
      const results = makeResult("a", 0, [entry1, entry2]);
      results.status = "ambiguous";

      const out = disambiguate([results], { preferQualifier: ["weak form"] });
      expect(out[0].status).toBe("resolved");
    });
  });
});
