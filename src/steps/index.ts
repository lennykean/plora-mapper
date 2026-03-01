import lookup from "./lookup.ts";

export interface StepOptions {
  verbose?: boolean;
}

export const steps: Record<string, (input: string, options?: StepOptions) => unknown> = {
  lookup,
};
