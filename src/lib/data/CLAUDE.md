# data/ — Training data pipeline hub

This folder hosts both runtime data exports and automation pipeline artifacts.

## Runtime-facing modules
- `published/runtime.ts` — canonical runtime entry (active published snapshot)
- `recommendation/engine.ts` — recommendation engine
- `analysis/engine.ts` — survey result analysis text
- `presets.ts` — B2B preset constants

## Automation pipeline folders
- `raw/` — external ingestion payloads (unvalidated)
- `candidates/` — normalized payloads awaiting quality gates
- `approved/` — quality-passed records ready for publication
- `published/` — app-consumable final snapshots only
- `archive/` — compressed retention storage

## Metadata
- `catalog.json` — index, counts, active version metadata
- `CHANGELOG.ndjson` — append-only automation run history

## Rules
- Runtime code must consume only `published` snapshots.
- Automation jobs must not mutate runtime UI/API files.
- Behavior-to-curriculum mapping must stay single-sourced in `mappings/`.
