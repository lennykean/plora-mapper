import { describe, it, expect } from "vitest";
import { get, set } from "./definition-cache.ts";
import type { WiktionaryEntry } from "./types.ts";

const testEntry: WiktionaryEntry = {
  word: "test",
  pos: "noun",
  pronunciations: [{ ipa: "tɛst" }],
  definitions: {
    "": [{ definition: "A test entry.", labels: ["testing"] }],
  },
};

describe("definition cache", () => {
  it("returns null for uncached word", () => {
    expect(get("__nonexistent_word_xyz__")).toBeNull();
  });

  it("round-trips set/get correctly", () => {
    const key = "__vitest_roundtrip__";
    set(key, [testEntry]);
    expect(get(key)).toEqual([testEntry]);
  });

  it("normalizes to lowercase", () => {
    const key = "__vitest_case__";
    set(key, [testEntry]);
    expect(get(key.toUpperCase())).toEqual([testEntry]);
  });

  it("overwrites on re-set", () => {
    const key = "__vitest_overwrite__";
    set(key, [testEntry]);
    const updated = { ...testEntry, pos: "verb" };
    set(key, [updated]);
    expect(get(key)).toEqual([updated]);
  });
});
