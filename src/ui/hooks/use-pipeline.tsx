import {
  useReducer,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
} from "react";
import type { LookupResult, StepOptions } from "../../data/types.ts";
import { getPipelineService } from "../../api/pipeline-service.ts";

// ── State ────────────────────────────────────────────────────────

export type DisplayMode = "both" | "words" | "ipa";
export type PhonemeDisplay = "ipa" | "plora";

export interface PipelineState {
  input: string;
  displayMode: DisplayMode;
  phonemeDisplay: PhonemeDisplay;
  options: StepOptions;
  pronounceResults: LookupResult[] | null;
  results: LookupResult[] | null;
  overrides: Record<number, number>;
  manualIpa: Record<number, string>;
  loading: boolean;
  error: string | null;
  availableAccents: string[];
  availableQualifiers: string[];
}

const initialState: PipelineState = {
  input: "",
  displayMode: "both",
  phonemeDisplay: "plora",
  options: {},
  pronounceResults: null,
  results: null,
  overrides: {},
  manualIpa: {},
  loading: false,
  error: null,
  availableAccents: [],
  availableQualifiers: [],
};

// ── Actions ──────────────────────────────────────────────────────

type PipelineAction =
  | { type: "SUBMIT"; input: string }
  | { type: "RERUN"; input: string; options: StepOptions }
  | {
      type: "PIPELINE_SUCCESS";
      pronounceResults: LookupResult[];
      results: LookupResult[];
    }
  | { type: "PIPELINE_ERROR"; error: string }
  | { type: "UPDATE_OPTIONS"; options: StepOptions }
  | { type: "SET_OPTIONS_ONLY"; options: StepOptions }
  | { type: "REDISAMBIGUATE_SUCCESS"; results: LookupResult[] }
  | { type: "OVERRIDE"; position: number; entryIndex: number }
  | { type: "CLEAR_OVERRIDE"; position: number }
  | { type: "MANUAL_IPA"; position: number; ipa: string }
  | { type: "SET_DISPLAY_MODE"; mode: DisplayMode }
  | { type: "SET_PHONEME_DISPLAY"; phonemeDisplay: PhonemeDisplay };

// ── Derivation helpers ───────────────────────────────────────────

function extractAccents(results: LookupResult[]): string[] {
  const counts = new Map<string, number>();
  for (const r of results) {
    for (const e of r.entries) {
      for (const p of e.pronunciations) {
        if (p.accent) {
          for (const a of p.accent.split(",")) {
            const trimmed = a.trim();
            counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
          }
        }
      }
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

function extractQualifiers(results: LookupResult[]): string[] {
  const counts = new Map<string, number>();
  for (const r of results) {
    for (const e of r.entries) {
      for (const p of e.pronunciations) {
        if (p.qualifier) {
          counts.set(p.qualifier, (counts.get(p.qualifier) ?? 0) + 1);
        }
      }
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

// ── Reducer ──────────────────────────────────────────────────────

function pipelineReducer(
  state: PipelineState,
  action: PipelineAction,
): PipelineState {
  switch (action.type) {
    case "SUBMIT":
      return {
        ...state,
        input: action.input,
        loading: true,
        error: null,
        overrides: {},
        manualIpa: {},
      };
    case "RERUN":
      return {
        ...state,
        input: action.input,
        options: action.options,
        loading: true,
        error: null,
        overrides: {},
        manualIpa: {},
      };
    case "PIPELINE_SUCCESS": {
      const accents = extractAccents(action.pronounceResults);
      const newAccent =
        state.options.accent && accents.includes(state.options.accent)
          ? state.options.accent
          : undefined;
      const options = { ...state.options, accent: newAccent };
      return {
        ...state,
        loading: false,
        pronounceResults: action.pronounceResults,
        results: action.results,
        options,
        availableAccents: accents,
        availableQualifiers: extractQualifiers(action.pronounceResults),
      };
    }
    case "PIPELINE_ERROR":
      return { ...state, loading: false, error: action.error };
    case "UPDATE_OPTIONS":
      return { ...state, options: action.options, loading: true, error: null };
    case "SET_OPTIONS_ONLY":
      return { ...state, options: action.options };
    case "REDISAMBIGUATE_SUCCESS":
      return {
        ...state,
        loading: false,
        results: action.results,
        overrides: {},
        manualIpa: {},
      };
    case "OVERRIDE":
      return {
        ...state,
        overrides: { ...state.overrides, [action.position]: action.entryIndex },
      };
    case "CLEAR_OVERRIDE": {
      const rest = Object.fromEntries(
        Object.entries(state.overrides).filter(
          ([k]) => k !== String(action.position),
        ),
      );
      return { ...state, overrides: rest };
    }
    case "MANUAL_IPA":
      return {
        ...state,
        manualIpa: { ...state.manualIpa, [action.position]: action.ipa },
      };
    case "SET_DISPLAY_MODE":
      return { ...state, displayMode: action.mode };
    case "SET_PHONEME_DISPLAY":
      return { ...state, phonemeDisplay: action.phonemeDisplay };
    default:
      return state;
  }
}

// ── Hook ─────────────────────────────────────────────────────────

function usePipelineInternal() {
  const [state, dispatch] = useReducer(pipelineReducer, initialState);
  const nonceRef = useRef(0);
  const optionsRef = useRef(state.options);
  useEffect(() => {
    optionsRef.current = state.options;
  }, [state.options]);
  const pronounceResultsRef = useRef(state.pronounceResults);
  useEffect(() => {
    pronounceResultsRef.current = state.pronounceResults;
  }, [state.pronounceResults]);

  const submit = useCallback(async (text: string) => {
    const nonce = ++nonceRef.current;
    dispatch({ type: "SUBMIT", input: text });
    try {
      const response = await getPipelineService().run({
        text,
        options: optionsRef.current,
      });
      if (nonce !== nonceRef.current) return;
      dispatch({
        type: "PIPELINE_SUCCESS",
        pronounceResults: response.pronounceResults,
        results: response.results,
      });
    } catch (e) {
      if (nonce !== nonceRef.current) return;
      dispatch({ type: "PIPELINE_ERROR", error: (e as Error).message });
    }
  }, []);

  const inputRef = useRef(state.input);
  useEffect(() => {
    inputRef.current = state.input;
  }, [state.input]);

  const updateOptions = useCallback(async (opts: StepOptions) => {
    const prev = optionsRef.current;
    if (!pronounceResultsRef.current) {
      dispatch({ type: "SET_OPTIONS_ONLY", options: opts });
      return;
    }
    const accentChanged = prev.accent !== opts.accent;
    if (accentChanged) {
      if (!inputRef.current) {
        dispatch({ type: "SET_OPTIONS_ONLY", options: opts });
        return;
      }
      const nonce = ++nonceRef.current;
      dispatch({ type: "RERUN", input: inputRef.current, options: opts });
      try {
        const response = await getPipelineService().run({
          text: inputRef.current,
          options: opts,
        });
        if (nonce !== nonceRef.current) return;
        dispatch({
          type: "PIPELINE_SUCCESS",
          pronounceResults: response.pronounceResults,
          results: response.results,
        });
      } catch (e) {
        if (nonce !== nonceRef.current) return;
        dispatch({ type: "PIPELINE_ERROR", error: (e as Error).message });
      }
      return;
    }
    const nonce = ++nonceRef.current;
    dispatch({ type: "UPDATE_OPTIONS", options: opts });
    try {
      const response = await getPipelineService().redisambiguate({
        results: pronounceResultsRef.current,
        options: opts,
      });
      if (nonce !== nonceRef.current) return;
      dispatch({ type: "REDISAMBIGUATE_SUCCESS", results: response.results });
    } catch (e) {
      if (nonce !== nonceRef.current) return;
      dispatch({ type: "PIPELINE_ERROR", error: (e as Error).message });
    }
  }, []);

  const override = useCallback((position: number, entryIndex: number) => {
    dispatch({ type: "OVERRIDE", position, entryIndex });
  }, []);

  const clearOverride = useCallback((position: number) => {
    dispatch({ type: "CLEAR_OVERRIDE", position });
  }, []);

  const setManualIpa = useCallback((position: number, ipa: string) => {
    dispatch({ type: "MANUAL_IPA", position, ipa });
  }, []);

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    dispatch({ type: "SET_DISPLAY_MODE", mode });
  }, []);

  const setPhonemeDisplay = useCallback((phonemeDisplay: PhonemeDisplay) => {
    dispatch({ type: "SET_PHONEME_DISPLAY", phonemeDisplay });
  }, []);

  return {
    state,
    submit,
    updateOptions,
    override,
    clearOverride,
    setManualIpa,
    setDisplayMode,
    setPhonemeDisplay,
  };
}

// ── Context ──────────────────────────────────────────────────────

export type PipelineContextType = ReturnType<typeof usePipelineInternal>;

export const PipelineContext = createContext<PipelineContextType | null>(null);

export { usePipelineInternal };

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
  return ctx;
}
