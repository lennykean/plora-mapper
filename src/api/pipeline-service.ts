import type {
  PipelineRequest,
  PipelineResponse,
  DisambiguateRequest,
  DisambiguateResponse,
} from "./api-types.ts";

export interface PipelineService {
  run(request: PipelineRequest): Promise<PipelineResponse>;
  redisambiguate(request: DisambiguateRequest): Promise<DisambiguateResponse>;
}

class WebPipelineService implements PipelineService {
  async run(request: PipelineRequest): Promise<PipelineResponse> {
    const res = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Pipeline failed: ${res.status}`);
    }
    return res.json();
  }

  async redisambiguate(request: DisambiguateRequest): Promise<DisambiguateResponse> {
    const res = await fetch("/api/disambiguate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Disambiguate failed: ${res.status}`);
    }
    return res.json();
  }
}

export const pipelineService: PipelineService = new WebPipelineService();
