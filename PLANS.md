# PLANS.md

## Current repo status

- [x] Seeded repo structure exists
- [x] Codex guidance exists
- [x] Official summary source pages are documented
- [x] Initial downloader and inspection stubs exist
- [x] Minimal frontend shell exists

## Phase 1 — deterministic summary-table ingestion

- [ ] Verify every configured BTS page resolves and exposes an XLSX link
- [ ] Download each current workbook
- [ ] Write a machine-readable manifest with source page and resolved workbook URL
- [ ] Fail clearly when an upstream page changes shape

## Phase 2 — workbook inspection

- [ ] Export workbook sheet names
- [ ] Record sheet dimensions
- [ ] Export every sheet to CSV in `data/intermediate/`
- [ ] Identify the best tables for airline and airport views

## Phase 3 — curated datasets

- [ ] Build airline monthly history artifact
- [ ] Build current airline year-to-date summary artifact
- [ ] Build annual airport arrival history artifact
- [ ] Build annual airport departure history artifact
- [ ] Build latest month and latest YTD airport snapshot artifacts

## Phase 4 — frontend shell

- [ ] Add routing
- [ ] Add homepage
- [ ] Add airline explorer
- [ ] Add airport explorer
- [ ] Add methodology page

## Phase 5 — visualization and shipping

- [ ] Add ranking heatmap or bump chart for airlines
- [ ] Add airport league tables and slope charts
- [ ] Add filters for airline, airport, year, and view type
- [ ] Add attribution and caveat components
- [ ] Prepare static deployment
- [ ] Add monthly refresh notes

## Phase 6 — optional raw expansion

- [ ] Add last-12-month raw TranStats downloader
- [ ] Add airport-month detail
- [ ] Add route-level views
- [ ] Add airport geography enrichment
