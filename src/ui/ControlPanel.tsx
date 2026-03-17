import {
  Group,
  Select,
  MultiSelect,
  SegmentedControl,
  Button,
  Text,
} from "@mantine/core";
import { usePipeline } from "./hooks/use-pipeline.tsx";

export default function ControlPanel() {
  const { state, updateOptions, setDisplayMode, setPhonemeDisplay } =
    usePipeline();

  const stressValue = (() => {
    const pq = state.options.preferQualifier ?? [];
    if (pq.includes("weak form")) return "weak";
    if (pq.includes("strong form")) return "strong";
    return "off";
  })();

  function setAccent(accent: string | null) {
    updateOptions({ ...state.options, accent: accent ?? undefined });
  }

  function setQualifiers(values: string[]) {
    const stressQuals = (state.options.preferQualifier ?? []).filter((q) =>
      ["weak form", "unstressed", "strong form", "stressed"].includes(q),
    );
    const merged = [...new Set([...stressQuals, ...values])];
    updateOptions({
      ...state.options,
      preferQualifier: merged.length ? merged : undefined,
    });
  }

  function setExcludeQualifiers(values: string[]) {
    const stressExcludes = (state.options.preferQualifierNot ?? []).filter(
      (q) => ["stressed", "unstressed"].includes(q),
    );
    const merged = [...new Set([...stressExcludes, ...values])];
    updateOptions({
      ...state.options,
      preferQualifierNot: merged.length ? merged : undefined,
    });
  }

  function setStress(value: string) {
    const opts = { ...state.options };
    if (value === "weak") {
      opts.preferQualifier = [
        ...(opts.preferQualifier ?? []).filter(
          (q) => q !== "strong form" && q !== "stressed",
        ),
        "weak form",
        "unstressed",
      ];
      opts.preferQualifierNot = [
        ...(opts.preferQualifierNot ?? []).filter((q) => q !== "unstressed"),
        "stressed",
      ];
    } else if (value === "strong") {
      opts.preferQualifier = [
        ...(opts.preferQualifier ?? []).filter(
          (q) => q !== "weak form" && q !== "unstressed",
        ),
        "strong form",
        "stressed",
      ];
      opts.preferQualifierNot = [
        ...(opts.preferQualifierNot ?? []).filter((q) => q !== "stressed"),
        "unstressed",
      ];
    } else {
      opts.preferQualifier = (opts.preferQualifier ?? []).filter(
        (q) =>
          !["weak form", "unstressed", "strong form", "stressed"].includes(q),
      );
      opts.preferQualifierNot = (opts.preferQualifierNot ?? []).filter(
        (q) => !["stressed", "unstressed"].includes(q),
      );
      if (!opts.preferQualifier.length) opts.preferQualifier = undefined;
      if (!opts.preferQualifierNot?.length) opts.preferQualifierNot = undefined;
    }
    updateOptions(opts);
  }

  return (
    <Group gap="sm" mt="xs" wrap="wrap" justify="space-between">
      <Group gap="sm" wrap="wrap">
        {state.availableAccents.length > 0 && (
          <Select
            size="xs"
            placeholder="Accent"
            data={state.availableAccents}
            value={state.options.accent ?? null}
            onChange={setAccent}
            clearable
            w={140}
          />
        )}

        {state.availableQualifiers.length > 0 && (
          <MultiSelect
            size="xs"
            placeholder="Prefer qualifier"
            data={state.availableQualifiers}
            value={(state.options.preferQualifier ?? []).filter(
              (q) =>
                ![
                  "weak form",
                  "unstressed",
                  "strong form",
                  "stressed",
                ].includes(q),
            )}
            onChange={setQualifiers}
            w={200}
          />
        )}

        {state.availableQualifiers.length > 0 && (
          <MultiSelect
            size="xs"
            placeholder="Exclude qualifier"
            data={state.availableQualifiers}
            value={(state.options.preferQualifierNot ?? []).filter(
              (q) => !["stressed", "unstressed"].includes(q),
            )}
            onChange={setExcludeQualifiers}
            w={200}
          />
        )}

        <Group gap={4}>
          <Text size="xs" c="dimmed">
            Stress
          </Text>
          <SegmentedControl
            size="xs"
            data={[
              { label: "Off", value: "off" },
              { label: "Weak", value: "weak" },
              { label: "Strong", value: "strong" },
            ]}
            value={stressValue}
            onChange={setStress}
          />
        </Group>

        <Button.Group>
          <Button
            size="compact-xs"
            variant={state.displayMode !== "ipa" ? "filled" : "default"}
            onClick={() => {
              const wordsOn = state.displayMode !== "ipa";
              const phonemesOn = state.displayMode !== "words";
              if (wordsOn && !phonemesOn) return; // can't turn off the only one
              const newWords = !wordsOn;
              setDisplayMode(
                newWords && phonemesOn ? "both" : newWords ? "words" : "ipa",
              );
            }}
          >
            Words
          </Button>
          <Button
            size="compact-xs"
            variant={state.displayMode !== "words" ? "filled" : "default"}
            onClick={() => {
              const wordsOn = state.displayMode !== "ipa";
              const phonemesOn = state.displayMode !== "words";
              if (phonemesOn && !wordsOn) return; // can't turn off the only one
              const newPhonemes = !phonemesOn;
              setDisplayMode(
                wordsOn && newPhonemes ? "both" : newPhonemes ? "ipa" : "words",
              );
            }}
          >
            Phonemes
          </Button>
        </Button.Group>

        <Group gap={4}>
          <Text size="xs" c="dimmed">
            Type
          </Text>
          <SegmentedControl
            size="xs"
            data={[
              { label: "PLORA", value: "plora" },
              { label: "IPA", value: "ipa" },
            ]}
            value={state.phonemeDisplay}
            onChange={(v) => setPhonemeDisplay(v as "ipa" | "plora")}
          />
        </Group>

        <Button
          size="compact-xs"
          variant="subtle"
          color="gray"
          onClick={async () => {
            if (window.confirm("Clear the definition cache?")) {
              await fetch("/api/clear-cache", { method: "POST" });
            }
          }}
        >
          Clear Cache
        </Button>
      </Group>
    </Group>
  );
}
