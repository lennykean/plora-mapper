import { program } from "commander";
import { readFileSync } from "fs";
import { steps } from "./steps/index.ts";

program
  .name("plora-mapper")
  .description("Plora mapping pipeline CLI")
  .argument("<step>", "pipeline step to run")
  .option("--input <text>", "input text")
  .option("--file <path>", "input file path")
  .option("-v, --verbose", "verbose output")
  .action(async (step: string, opts: { input?: string; file?: string; verbose?: boolean }) => {
    const input = opts.input ?? (opts.file ? readFileSync(opts.file, "utf-8") : null);

    if (!input) {
      console.error("Error: provide --input or --file");
      process.exit(1);
    }

    const fn = steps[step];
    if (!fn) {
      console.error(`Unknown step: ${step}`);
      console.error(`Available steps: ${Object.keys(steps).join(", ")}`);
      process.exit(1);
    }

    const result = await fn(input, { verbose: opts.verbose });
    console.log(JSON.stringify(result, null, 2));
  });

program.parse();
