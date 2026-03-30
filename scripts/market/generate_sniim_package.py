#!/usr/bin/env python3

from __future__ import annotations

import argparse
import calendar
import csv
import json
import statistics
import sys
import unicodedata
from dataclasses import dataclass
from datetime import date
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SNIIM_SELECT_URL = "http://www.economia-sniim.gob.mx/SNIIM-Pecuarios-Nacionales/SelIng.asp"
SNIIM_RESULT_URL = "http://www.economia-sniim.gob.mx/SNIIM-Pecuarios-Nacionales/e_Ing.asp"


@dataclass(frozen=True)
class IngredientMapping:
    ingredient_name: str
    source_product_code: int
    source_product_name: str
    match_type: str
    note: str | None = None


MAPPINGS: tuple[IngredientMapping, ...] = (
    IngredientMapping(
        ingredient_name="Maiz molido",
        source_product_code=804,
        source_product_name="Maiz amarillo",
        match_type="proxy",
        note="SNIIM no publica 'Maiz molido' como tal; se usa 'Maiz amarillo' como proxy del grano energetico base.",
    ),
    IngredientMapping(
        ingredient_name="Sorgo rolado",
        source_product_code=809,
        source_product_name="Sorgo molido",
        match_type="proxy",
        note="SNIIM no reporto 'Sorgo rolado' en el ultimo corte; se usa 'Sorgo molido' como aproximacion operativa.",
    ),
    IngredientMapping(
        ingredient_name="Heno de alfalfa",
        source_product_code=817,
        source_product_name="Alfalfa pacas",
        match_type="proxy",
        note="La presentacion 'Alfalfa pacas' es la mas cercana al heno comercial para corral.",
    ),
    IngredientMapping(
        ingredient_name="Pasta de soya",
        source_product_code=834,
        source_product_name="Pasta de soya",
        match_type="exact",
    ),
    IngredientMapping(
        ingredient_name="Pasta de canola",
        source_product_code=830,
        source_product_name="Pasta de canola",
        match_type="exact",
    ),
    IngredientMapping(
        ingredient_name="Cascarilla de soya",
        source_product_code=838,
        source_product_name="Cascarilla de soya",
        match_type="exact",
    ),
    IngredientMapping(
        ingredient_name="Melaza de cana",
        source_product_code=860,
        source_product_name="Melaza de caña",
        match_type="exact",
    ),
    IngredientMapping(
        ingredient_name="Urea pecuaria",
        source_product_code=863,
        source_product_name="Urea",
        match_type="exact",
    ),
)


class SniimIngredientParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.current_origin: str | None = None
        self.records: list[dict[str, Any]] = []
        self._row: list[tuple[str, str]] = []
        self._td_class: str | None = None
        self._buffer: list[str] = []
        self._in_td = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "tr":
            self._row = []
        if tag.lower() == "td":
            attr_map = {key.lower(): (value or "") for key, value in attrs}
            self._td_class = attr_map.get("class", "")
            self._buffer = []
            self._in_td = True

    def handle_data(self, data: str) -> None:
        if self._in_td:
            self._buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "td":
            text = normalize_text("".join(self._buffer))
            self._row.append((self._td_class or "", text))
            self._td_class = None
            self._buffer = []
            self._in_td = False
            return

        if tag.lower() != "tr" or not self._row:
            return

        if len(self._row) == 1 and self._row[0][0].lower() == "encabdes":
            self.current_origin = self._row[0][1]
            return

        if len(self._row) < 5 or self._row[0][0].lower() != "datos":
            return

        product = self._row[0][1]
        min_text = self._row[1][1]
        max_text = self._row[2][1]
        avg_text = self._row[3][1]
        obs = self._row[4][1]

        self.records.append(
            {
                "origin": self.current_origin,
                "product": product,
                "min_mxn_per_ton": parse_currency(min_text),
                "max_mxn_per_ton": parse_currency(max_text),
                "avg_mxn_per_ton": parse_currency(avg_text),
                "observations": obs,
            }
        )


def normalize_text(value: str) -> str:
    return " ".join(unescape(value).replace("\xa0", " ").split())


def parse_currency(value: str) -> float | None:
    cleaned = normalize_text(value).replace("$", "").replace(",", "")
    if not cleaned or cleaned == "-":
        return None
    return float(cleaned)


def slugify(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").strip().upper()
    )
    return "_".join(part for part in ascii_value.replace("-", " ").split() if part)


def last_day_of_month(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}-{calendar.monthrange(year, month)[1]:02d}"


def iter_months(start_year: int, start_month: int, end_year: int, end_month: int) -> list[tuple[int, int]]:
    year = start_year
    month = start_month
    out: list[tuple[int, int]] = []
    while (year, month) <= (end_year, end_month):
        out.append((year, month))
        month += 1
        if month == 13:
            year += 1
            month = 1
    return out


def fetch_html(payload: dict[str, Any], timeout_seconds: int) -> str:
    request = Request(
        SNIIM_RESULT_URL,
        data=urlencode(payload).encode(),
        headers={
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    with urlopen(request, timeout=timeout_seconds) as response:
        return response.read().decode("cp1252", "ignore")


def fetch_month_rows(mapping: IngredientMapping, year: int, month: int, timeout_seconds: int) -> list[dict[str, Any]]:
    payload = {
        "prod": str(mapping.source_product_code),
        "origen": "0",
        "mes": f"{month:02d}",
        "anio": str(year),
        "RegPag": "1000",
    }
    html = fetch_html(payload, timeout_seconds=timeout_seconds)
    if "NO HAY REGISTROS" in html:
        return []
    parser = SniimIngredientParser()
    parser.feed(html)

    effective_date = last_day_of_month(year, month)
    rows: list[dict[str, Any]] = []
    for record in parser.records:
        avg = record["avg_mxn_per_ton"]
        rows.append(
            {
                "ingredientName": mapping.ingredient_name,
                "sourceProductCode": mapping.source_product_code,
                "sourceProductName": mapping.source_product_name,
                "matchType": mapping.match_type,
                "matchNote": mapping.note,
                "sourceOrigin": record["origin"],
                "sourceProductObserved": record["product"],
                "effectiveDate": effective_date,
                "year": year,
                "month": month,
                "priceMxnPerTon": avg,
                "priceMxnPerKgAsFed": round(avg / 1000.0, 4) if avg is not None else None,
                "minMxnPerTon": record["min_mxn_per_ton"],
                "maxMxnPerTon": record["max_mxn_per_ton"],
                "observations": record["observations"],
                "locationCode": f"MX-SNIIM-{slugify(record['origin'] or 'SIN_ORIGEN')}",
                "sourcePageUrl": SNIIM_SELECT_URL,
                "sourceResultUrl": SNIIM_RESULT_URL,
                "sourceQuery": payload,
            }
        )
    return rows


def build_monthly_summary(series_rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, dict[str, list[float]]] = {}
    counts: dict[str, dict[str, int]] = {}
    for row in series_rows:
        if row.get("ingestEligible") is False:
            continue
        ingredient = row["ingredientName"]
        month_key = row["effectiveDate"][:7]
        grouped.setdefault(ingredient, {}).setdefault(month_key, []).append(row["priceMxnPerKgAsFed"])
        counts.setdefault(ingredient, {}).setdefault(month_key, 0)
        counts[ingredient][month_key] += 1

    summary: dict[str, list[dict[str, Any]]] = {}
    for ingredient, month_map in grouped.items():
        month_rows: list[dict[str, Any]] = []
        for month_key in sorted(month_map):
            values = [value for value in month_map[month_key] if value is not None]
            if not values:
                continue
            month_rows.append(
                {
                    "month": month_key,
                    "simpleAvgMxnPerKgAsFed": round(sum(values) / len(values), 4),
                    "originCount": counts[ingredient][month_key],
                }
            )
        summary[ingredient] = month_rows
    return summary


def annotate_quality(series_rows: list[dict[str, Any]]) -> None:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in series_rows:
        grouped.setdefault((row["ingredientName"], row["effectiveDate"]), []).append(row)

    for rows in grouped.values():
        values = [row["priceMxnPerKgAsFed"] for row in rows if row["priceMxnPerKgAsFed"] is not None]
        median_value = statistics.median(values) if values else None
        for row in rows:
            row["qualityFlag"] = None
            row["ingestEligible"] = True
            if median_value is None or len(values) < 3 or median_value <= 0:
                continue
            value = row["priceMxnPerKgAsFed"]
            if value is None:
                row["qualityFlag"] = "MISSING_PRICE"
                row["ingestEligible"] = False
                continue
            if value < median_value * 0.25 or value > median_value * 4.0:
                row["qualityFlag"] = "OUTLIER_VS_MONTH_MEDIAN"
                row["ingestEligible"] = False


def build_stats(
    mappings: tuple[IngredientMapping, ...],
    ingredient_ids: dict[str, str | None],
    series_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    monthly_summary = build_monthly_summary(series_rows)
    stats_rows: list[dict[str, Any]] = []
    for mapping in mappings:
        points = monthly_summary.get(mapping.ingredient_name, [])
        values = [point["simpleAvgMxnPerKgAsFed"] for point in points]
        latest = points[-1] if points else None
        last_12 = values[-12:]
        yoy = None
        if latest and len(points) >= 13:
            latest_month = latest["month"]
            previous_year_month = f"{int(latest_month[:4]) - 1:04d}-{latest_month[5:]}"
            previous = next((item for item in points if item["month"] == previous_year_month), None)
            if previous and previous["simpleAvgMxnPerKgAsFed"]:
                yoy = round(
                    ((latest["simpleAvgMxnPerKgAsFed"] - previous["simpleAvgMxnPerKgAsFed"]) / previous["simpleAvgMxnPerKgAsFed"]) * 100,
                    2,
                )

        stats_rows.append(
            {
                "ingredientId": ingredient_ids.get(mapping.ingredient_name),
                "ingredientName": mapping.ingredient_name,
                "sourceProductCode": mapping.source_product_code,
                "sourceProductName": mapping.source_product_name,
                "matchType": mapping.match_type,
                "matchNote": mapping.note,
                "availableMonths": len(points),
                "availableOriginObservations": sum(
                    1 for row in series_rows if row["ingredientName"] == mapping.ingredient_name
                ),
                "flaggedObservationCount": sum(
                    1
                    for row in series_rows
                    if row["ingredientName"] == mapping.ingredient_name and row.get("qualityFlag")
                ),
                "latestMonth": latest["month"] if latest else None,
                "latestNationalSimpleAvgMxnPerKgAsFed": latest["simpleAvgMxnPerKgAsFed"] if latest else None,
                "minNationalSimpleAvgMxnPerKgAsFed": min(values) if values else None,
                "maxNationalSimpleAvgMxnPerKgAsFed": max(values) if values else None,
                "mean12mNationalSimpleAvgMxnPerKgAsFed": round(sum(last_12) / len(last_12), 4) if last_12 else None,
                "stdev12mNationalSimpleAvgMxnPerKgAsFed": round(statistics.pstdev(last_12), 4) if len(last_12) > 1 else 0.0 if len(last_12) == 1 else None,
                "yoyPctVsSameMonth": yoy,
                "nationalMonthlySeries": points,
                "sources": [
                    {
                        "sourcePageUrl": SNIIM_SELECT_URL,
                        "sourceResultUrl": SNIIM_RESULT_URL,
                        "latestQuery": {
                            "prod": str(mapping.source_product_code),
                            "origen": "0",
                            "RegPag": "1000",
                        },
                    }
                ],
            }
        )
    return stats_rows


def fetch_ingredient_ids(api_base_url: str, timeout_seconds: int) -> dict[str, str | None]:
    try:
        url = f"{api_base_url.rstrip('/')}/ingredients"
        request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(request, timeout=timeout_seconds) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (URLError, json.JSONDecodeError):
        return {}
    return {item["name"]: item["id"] for item in payload if "name" in item and "id" in item}


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    fieldnames = [
        "ingredientId",
        "ingredientName",
        "sourceProductCode",
        "sourceProductName",
        "matchType",
        "matchNote",
        "sourceOrigin",
        "sourceProductObserved",
        "effectiveDate",
        "year",
        "month",
        "priceMxnPerTon",
        "priceMxnPerKgAsFed",
        "minMxnPerTon",
        "maxMxnPerTon",
        "observations",
        "locationCode",
        "qualityFlag",
        "ingestEligible",
        "sourcePageUrl",
        "sourceResultUrl",
        "sourceQuery",
    ]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            flat_row = row.copy()
            flat_row["sourceQuery"] = json.dumps(flat_row["sourceQuery"], ensure_ascii=True, sort_keys=True)
            writer.writerow(flat_row)


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")


def default_end_month() -> tuple[int, int]:
    today = date.today()
    year = today.year
    month = today.month - 1
    if month == 0:
        year -= 1
        month = 12
    return year, month


def parse_args(argv: list[str]) -> argparse.Namespace:
    end_year, end_month = default_end_month()
    parser = argparse.ArgumentParser(
        description="Generate a SNIIM package with ingest payloads, historical series, and derived stats."
    )
    parser.add_argument("--start", default="2024-01", help="Start month in YYYY-MM format.")
    parser.add_argument("--end", default=f"{end_year:04d}-{end_month:02d}", help="End month in YYYY-MM format.")
    parser.add_argument(
        "--api-base-url",
        default="http://localhost/api",
        help="API base URL used to resolve ingredient IDs.",
    )
    parser.add_argument(
        "--output-dir",
        default="data/market/sniim",
        help="Directory where generated files will be written.",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=20,
        help="Per-request timeout in seconds.",
    )
    return parser.parse_args(argv)


def parse_month_arg(value: str) -> tuple[int, int]:
    year_text, month_text = value.split("-", 1)
    year = int(year_text)
    month = int(month_text)
    if month < 1 or month > 12:
        raise ValueError(f"Invalid month: {value}")
    return year, month


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    start_year, start_month = parse_month_arg(args.start)
    end_year, end_month = parse_month_arg(args.end)
    if (start_year, start_month) > (end_year, end_month):
        raise ValueError("--start must be <= --end")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    ingredient_ids = fetch_ingredient_ids(args.api_base_url, timeout_seconds=args.timeout_seconds)
    month_list = iter_months(start_year, start_month, end_year, end_month)
    series_rows: list[dict[str, Any]] = []

    for mapping in MAPPINGS:
        for year, month in month_list:
            rows = fetch_month_rows(mapping, year=year, month=month, timeout_seconds=args.timeout_seconds)
            for row in rows:
                row["ingredientId"] = ingredient_ids.get(mapping.ingredient_name)
            series_rows.extend(rows)

    series_rows.sort(
        key=lambda row: (row["ingredientName"], row["effectiveDate"], row["sourceOrigin"] or "", row["locationCode"])
    )
    annotate_quality(series_rows)

    latest_date_by_ingredient: dict[str, str] = {}
    for row in series_rows:
        ingredient = row["ingredientName"]
        latest_date_by_ingredient[ingredient] = max(latest_date_by_ingredient.get(ingredient, ""), row["effectiveDate"])

    ingest_payloads: list[dict[str, Any]] = []
    for row in series_rows:
        if latest_date_by_ingredient.get(row["ingredientName"]) != row["effectiveDate"]:
            continue
        if row.get("ingestEligible") is False:
            continue
        ingest_payloads.append(
            {
                "ingredientId": row["ingredientId"],
                "ingredientName": row["ingredientName"],
                "sourceProductCode": row["sourceProductCode"],
                "sourceProductName": row["sourceProductName"],
                "matchType": row["matchType"],
                "matchNote": row["matchNote"],
                "sourceOrigin": row["sourceOrigin"],
                "locationCode": row["locationCode"],
                "effectiveDate": row["effectiveDate"],
                "priceMxnPerKgAsFed": row["priceMxnPerKgAsFed"],
                "createPriceDto": {
                    "priceMxnPerKgAsFed": row["priceMxnPerKgAsFed"],
                    "effectiveDate": row["effectiveDate"],
                    "locationCode": row["locationCode"],
                },
                "provenance": {
                    "sourcePageUrl": row["sourcePageUrl"],
                    "sourceResultUrl": row["sourceResultUrl"],
                    "sourceQuery": row["sourceQuery"],
                },
            }
        )

    stats_payload = {
        "generatedAt": date.today().isoformat(),
        "window": {"start": args.start, "end": args.end},
        "source": {
            "name": "SNIIM ingredientes para la formulacion de raciones",
            "sourcePageUrl": SNIIM_SELECT_URL,
            "sourceResultUrl": SNIIM_RESULT_URL,
        },
        "ingredients": build_stats(MAPPINGS, ingredient_ids, series_rows),
    }

    stamp = date.today().strftime("%Y%m%d")
    series_csv = output_dir / f"sniim_historical_series_{stamp}.csv"
    ingest_json = output_dir / f"sniim_ingest_payloads_{stamp}.json"
    stats_json = output_dir / f"sniim_historical_stats_{stamp}.json"
    manifest_json = output_dir / f"sniim_manifest_{stamp}.json"

    write_csv(series_csv, rows=series_rows)
    write_json(ingest_json, ingest_payloads)
    write_json(stats_json, stats_payload)
    write_json(
        manifest_json,
        {
            "generatedAt": date.today().isoformat(),
            "files": {
                "historicalSeriesCsv": str(series_csv),
                "ingestPayloadsJson": str(ingest_json),
                "historicalStatsJson": str(stats_json),
            },
            "ingredientsResolvedToIds": {key: value for key, value in ingredient_ids.items() if key in {m.ingredient_name for m in MAPPINGS}},
        },
    )

    print(json.dumps({"seriesRows": len(series_rows), "ingestPayloads": len(ingest_payloads), "outputDir": str(output_dir)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
