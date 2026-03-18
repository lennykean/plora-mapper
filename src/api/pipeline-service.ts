import type {
  PipelineRequest,
  PipelineResponse,
  DisambiguateRequest,
  DisambiguateResponse,
} from "./api_types.ts";

export interface PipelineService {
  run(request: PipelineRequest): Promise<PipelineResponse>;
  redisambiguate(request: DisambiguateRequest): Promise<DisambiguateResponse>;
}

type ElectronChannel = "pipeline:run" | "pipeline:disambiguate" | "cache:clear";

declare global {
  interface Window {
    electronAPI?: {
      invoke(channel: ElectronChannel, data: unknown): Promise<unknown>;
    };
  }
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

  async redisambiguate(
    request: DisambiguateRequest,
  ): Promise<DisambiguateResponse> {
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

class ElectronPipelineService implements PipelineService {
  private get api() {
    const api = window.electronAPI;
    if (!api) {
      throw new Error(
        "electronAPI is not available. " +
          "Ensure the Electron preload script has been loaded before using ElectronPipelineService.",
      );
    }
    return api;
  }

  async run(request: PipelineRequest): Promise<PipelineResponse> {
    return this.api.invoke(
      "pipeline:run",
      request,
    ) as Promise<PipelineResponse>;
  }

  async redisambiguate(
    request: DisambiguateRequest,
  ): Promise<DisambiguateResponse> {
    return this.api.invoke(
      "pipeline:disambiguate",
      request,
    ) as Promise<DisambiguateResponse>;
  }
}

let _instance: PipelineService | null = null;

export function getPipelineService(): PipelineService {
  if (!_instance) {
    const isElectron = typeof window !== "undefined" && "electronAPI" in window;
    _instance = isElectron
      ? new ElectronPipelineService()
      : new WebPipelineService();
  }
  return _instance;
}
