import type { LookupResult, StepOptions } from "../data/types.ts";

export interface PipelineRequest {
  text: string;
  options?: StepOptions;
}

export interface PipelineResponse {
  pronounceResults: LookupResult[];
  results: LookupResult[];
}

export interface DisambiguateRequest {
  results: LookupResult[];
  options?: StepOptions;
}

export interface DisambiguateResponse {
  results: LookupResult[];
}
