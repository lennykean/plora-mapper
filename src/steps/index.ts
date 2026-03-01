import lookup from "./lookup.ts";
import tokenize from "./tokenize.ts";

export interface StepOptions {
  verbose?: boolean;
}

export const steps: Record<string, (input: string, options?: StepOptions) => unknown> = {
  lookup,
  tokenize,
};
