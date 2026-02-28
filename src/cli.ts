import { program } from "commander";
import { readFileSync } from "fs";

program
  .name("plora-mapper")
  .description("Plora mapping pipeline CLI")
  .argument("<step>", "pipeline step to run")
  .option("--input <text>", "input text")
  .option("--file <path>", "input file path")
  .action((step: string, opts: { input?: string; file?: string }) => {
    const input = opts.input ?? (opts.file ? readFileSync(opts.file, "utf-8") : null);

    if (!input) {
      console.error("Error: provide --input or --file");
      process.exit(1);
    }

    // Placeholder: dispatch to step handlers as they're built
    const result = runStep(step, input);
    console.log(JSON.stringify(result, null, 2));
  });

function runStep(step: string, input: string): unknown {
  throw new Error(`Unknown step: ${step}`);
}

program.parse();
