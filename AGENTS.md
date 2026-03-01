# Plora Mapper

## Architecture

The app ships in three modes: **CLI**, **Web** (Vite + React), and **Electron**. CLI and web are implemented today; Electron will be added later. All shared code must remain mode-agnostic so Electron can be introduced without rework.

## Naming Conventions

- **kebab-case** for most multi-word files (e.g. `wiktionary-api.ts`, `lookup-step.ts`)
- **snake_case** for type definition files (e.g. `lookup_types.ts`)
- **PascalCase** for React component files and their types (e.g. `LookupForm.tsx`)

## File Structure

```
src/
  cli.ts              # CLI entry point
  main.tsx            # Web entry point (Vite)
  data/
    wiktionary-api.ts # Wiktionary API client
  steps/
    index.ts          # Step registry
    [step-name].ts    # One file per step
  types.ts            # Shared types
```
