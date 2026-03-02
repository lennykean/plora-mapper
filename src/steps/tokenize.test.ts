import { describe, it, expect } from "vitest";
import tokenize from "./tokenize.ts";

describe("tokenize", () => {
  it("splits a basic sentence into tokens", () => {
    const result = tokenize("The cat sat.");
    expect(result).toEqual([
      {
        text: "The",
        position: 0,
        normalized: "the",
        punctuation: { leading: "", trailing: "" },
      },
      {
        text: "cat",
        position: 1,
        normalized: "cat",
        punctuation: { leading: "", trailing: "" },
      },
      {
        text: "sat",
        position: 2,
        normalized: "sat",
        punctuation: { leading: "", trailing: "." },
      },
    ]);
  });

  it("preserves contractions as single tokens", () => {
    const result = tokenize("don't I'm they're");
    expect(result).toHaveLength(3);
    expect(result[0].normalized).toBe("don't");
    expect(result[1].normalized).toBe("i'm");
    expect(result[2].normalized).toBe("they're");
  });

  it("strips leading and trailing punctuation", () => {
    const result = tokenize('"Hello,"');
    expect(result).toEqual([
      {
        text: "Hello",
        position: 0,
        normalized: "hello",
        punctuation: { leading: '"', trailing: ',"' },
      },
    ]);
  });

  it("handles multiple and irregular whitespace", () => {
    const result = tokenize("  word   another\tword  ");
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe("word");
    expect(result[1].text).toBe("another");
    expect(result[2].text).toBe("word");
  });

  it("returns empty array for empty input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });

  it("discards standalone punctuation", () => {
    const result = tokenize("hello — world");
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("hello");
    expect(result[1].text).toBe("world");
  });

  it("assigns sequential positions", () => {
    const result = tokenize("a b c");
    expect(result.map((t) => t.position)).toEqual([0, 1, 2]);
  });

  it("preserves contractions with curly apostrophe as single tokens", () => {
    const result = tokenize("don\u2019t I\u2019m they\u2019re");
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe("don\u2019t");
    expect(result[0].normalized).toBe("don't");
    expect(result[1].normalized).toBe("i'm");
    expect(result[2].normalized).toBe("they're");
  });

  it("normalizes curly apostrophe to straight in normalized field", () => {
    const result = tokenize("it\u2019s");
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("it\u2019s");
    expect(result[0].normalized).toBe("it's");
  });
});
