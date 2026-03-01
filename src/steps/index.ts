import lookup from "./lookup.ts";
import tokenize from "./tokenize.ts";
import pronounceStep from "./pronounce.ts";
import disambiguateStep from "./disambiguate.ts";

export interface StepOptions {
  verbose?: boolean;
  accent?: string;
  notation?: "phonemic" | "phonetic";
  label?: string[];
  labelNot?: string[];
  preferQualifier?: string[];
  preferQualifierNot?: string[];
}

export const steps: Record<string, (input: string, options?: StepOptions) => unknown> = {
  lookup,
  tokenize,
  pronounce: pronounceStep,
  disambiguate: disambiguateStep,
};
