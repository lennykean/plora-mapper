# Plora Mapper

## Architecture

The app ships in three modes: **CLI**, **Web** (Vite + React), and **Electron**. CLI and web are implemented today; Electron will be added later. All shared code must remain mode-agnostic so Electron can be introduced without rework.

## File Structure

```
src/
  cli.ts              # CLI entry point
  main.tsx            # Web entry point (Vite)
  steps/
    index.ts          # Step registry
    [step-name].ts    # One file per step
  types.ts            # Shared types
```
