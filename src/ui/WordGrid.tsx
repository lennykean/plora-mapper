import { Flex, Text } from "@mantine/core";
import { usePipeline } from "./hooks/use-pipeline.tsx";
import WordCard from "./WordCard.tsx";
import AmbiguousCard from "./AmbiguousCard.tsx";
import UnknownCard from "./UnknownCard.tsx";

export default function WordGrid() {
  const { state, override, setManualIpa } = usePipeline();

  if (!state.results) {
    return (
      <Text c="dimmed" ta="center" mt="xl">
        Enter text above and click Map to see pronunciations.
      </Text>
    );
  }

  return (
    <Flex wrap="wrap" gap="md" justify="flex-start" align="flex-start" p="md">
      {state.results.map((result) => {
        const pos = result.token.position;
        const overrideIdx = state.overrides[pos];
        const manual = state.manualIpa[pos];
        const isOverridden = overrideIdx !== undefined;

        if (isOverridden && overrideIdx < result.entries.length) {
          const entry = result.entries[overrideIdx];
          const overrideIpa = entry?.pronunciations[0]?.ipa;
          if (!overrideIpa) {
            return (
              <UnknownCard
                key={pos}
                result={result}
                manualIpa={state.manualIpa[pos]}
                onSetIpa={(ipa) => setManualIpa(pos, ipa)}
              />
            );
          }
          return (
            <WordCard
              key={pos}
              result={{ ...result, status: "resolved" }}
              ipa={overrideIpa}
            />
          );
        }

        if (manual) {
          if (result.status === "unknown") {
            return (
              <UnknownCard
                key={pos}
                result={result}
                manualIpa={manual}
                onSetIpa={(ipa) => setManualIpa(pos, ipa)}
              />
            );
          }
          return (
            <WordCard
              key={pos}
              result={{ ...result, status: "resolved" }}
              ipa={manual}
            />
          );
        }

        const isUnknown = result.status === "unknown";
        if (isUnknown) {
          return (
            <UnknownCard
              key={pos}
              result={result}
              manualIpa={state.manualIpa[pos]}
              onSetIpa={(ipa) => setManualIpa(pos, ipa)}
            />
          );
        }

        if (result.status === "ambiguous") {
          return (
            <AmbiguousCard
              key={pos}
              result={result}
              onSelect={(entryIndex) => override(pos, entryIndex)}
            />
          );
        }

        const firstIpa = result.entries[0]?.pronunciations[0]?.ipa;
        if (!firstIpa) {
          return (
            <UnknownCard
              key={pos}
              result={result}
              manualIpa={state.manualIpa[pos]}
              onSetIpa={(ipa) => setManualIpa(pos, ipa)}
            />
          );
        }

        return <WordCard key={pos} result={result} />;
      })}
    </Flex>
  );
}
