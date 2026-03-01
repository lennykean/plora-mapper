import lookup from "./lookup.ts";
import tokenize from "./tokenize.ts";
import pronounceStep from "./pronounce.ts";

export interface StepOptions {
  verbose?: boolean;
  accent?: string;
  notation?: "phonemic" | "phonetic";
  label?: string[];
  labelNot?: string[];
}

export const steps: Record<string, (input: string, options?: StepOptions) => unknown> = {
  lookup,
  tokenize,
  pronounce: pronounceStep,
};
