import { PipelineContext, usePipelineInternal } from "./use-pipeline.tsx";

export default function PipelineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pipeline = usePipelineInternal();
  return (
    <PipelineContext.Provider value={pipeline}>
      {children}
    </PipelineContext.Provider>
  );
}
