# AGENTS.md

## Project overview

Ship a modern, professional, static-first flight reliability dashboard focused on official BTS on-time summary tables and rankings.

## Read order before doing work

1. `README.md`
2. `PLANS.md`

## Working rules

- Use official BTS summary/ranking workbook pages as the primary data source.
- Do not promise live or real-time flight status.
- Treat the product as a monthly-updating reliability explorer, not an operational flight tracker.
- Keep the default hosting posture static-first.
- Prefer exported CSV/parquet artifacts over client-side workbook parsing.

## Suggested commands

- `python scripts/etl/fetch_bts_summary_tables.py`
- `python scripts/etl/inspect_workbooks.py`
- `python scripts/etl/build_curated.py`
- `python scripts/etl/curate_v1_datasets.py`
- `python scripts/etl/curate_carrier_data.py`
- `python scripts/build_analyses.py`
- `python scripts/validate_data.py`
- `pnpm --dir apps/web dev`
- `pnpm --dir apps/web build`

## Done means

A task is not done until:

- the download workflow is deterministic
- workbook sheet exports are inspectable
- the frontend builds
- the product language stays honest about refresh cadence and granularity
- tests pass
