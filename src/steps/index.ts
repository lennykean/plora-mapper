import lookup from "./lookup.ts";
import tokenize from "./tokenize.ts";
import pronounceStep from "./pronounce.ts";
import disambiguateStep from "./disambiguate.ts";
import type { StepOptions } from "../data/types.ts";
export type { StepOptions } from "../data/types.ts";

export const steps: Record<string, (input: string, options?: StepOptions) => unknown> = {
  lookup,
  tokenize,
  pronounce: pronounceStep,
  disambiguate: disambiguateStep,
};
