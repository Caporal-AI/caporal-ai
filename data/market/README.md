# Market Data Package

This folder stores external market datasets prepared for Caporal AI.

## SNIIM package

Generator:

```bash
timeout 600 python3 scripts/market/generate_sniim_package.py --start 2024-01 --end 2026-02
```

Outputs under `data/market/sniim/`:

- `sniim_ingest_payloads_<YYYYMMDD>.json`
  Latest price rows ready to map into `POST /api/ingredients/:id/prices`.
- `sniim_historical_series_<YYYYMMDD>.csv`
  Monthly historical price observations by origin in `MXN/ton` and `MXN/kg as fed`.
- `sniim_historical_stats_<YYYYMMDD>.json`
  Derived statistics based on the historical monthly series.
- `sniim_manifest_<YYYYMMDD>.json`
  Small manifest with generated file paths.

## Important notes

- Source: SNIIM "Ingredientes para la formulacion de raciones".
- Latest available cut in this package is `2026-02`, because SNIIM publishes monthly near month end.
- Some Caporal ingredients are not published by SNIIM with the exact same commercial name.
  In those cases the package marks the record as `proxy` and explains the mapping.
- The generator marks obvious monthly outliers as `OUTLIER_VS_MONTH_MEDIAN` and excludes them from ingest payloads, while keeping the raw observation in the historical CSV for auditability.
