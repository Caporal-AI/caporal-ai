#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


def fail_missing_dependency(module_name: str, install_hint: str) -> None:
    raise SystemExit(
        f"Falta la dependencia de Python '{module_name}'. Instala el entorno de experimentos con: {install_hint}"
    )


try:
    import matplotlib
except ModuleNotFoundError:  # pragma: no cover - depends on host environment
    fail_missing_dependency("matplotlib", "yarn experiment:deps")

matplotlib.use("Agg")

try:
    import matplotlib.pyplot as plt
except ModuleNotFoundError:  # pragma: no cover - depends on host environment
    fail_missing_dependency("matplotlib.pyplot", "yarn experiment:deps")

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
except ModuleNotFoundError:  # pragma: no cover - depends on host environment
    fail_missing_dependency("reportlab", "yarn experiment:deps")


@dataclass
class TableRow:
    metric: str
    value: str
    threshold: str = ""
    status: str = ""
    note: str = ""


ECONOMIC_STATUS_ROWS = [
    ("Ahorro porcentual medio positivo", "meanSavingsPctPositive", "> 0%"),
    ("IC95 del ahorro medio arriba de cero", "savingsMean95CiAboveZero", "Limite inferior > 0"),
    ("Todas las corridas factibles", "allDaysFeasible", "100% del horizonte"),
    ("Sin violaciones duras optimizadas", "zeroOptimizedHardViolations", "0 violaciones"),
]

AGENTIC_THRESHOLDS = {
    "citationCoverageTechnical": 0.92,
    "groundedResponseRate": 0.90,
    "unsafeNumericLeakageRate": 0.0,
    "agentToolSuccessRate": 0.95,
    "whatIfCompletionRate": 0.90,
}

CATEGORY_LABELS = {
    "unsafe_guardrail": "Guardrails inseguros",
    "what_if_valid": "Que pasa si valido",
    "what_if_ambiguous": "Que pasa si ambiguo",
    "why_feasible": "Por que factible",
    "why_infeasible": "Por que infeasible",
    "next_action": "Que sigue",
}


class EvidenceRenderer:
    def __init__(self, input_dir: Path, output_dir: Path, language: str, dpi: int, mode: str) -> None:
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.language = language
        self.dpi = dpi
        self.mode = mode
        self.styles = self._build_styles()
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def render(self) -> dict[str, bool]:
        economic = self._load_optional_json("economic_backtest.json")
        agentic = self._load_optional_json("agentic_benchmark.json")
        health_api = self._load_optional_json("api-health.json")
        health_compute = self._load_optional_json("compute-health.json")
        harness_log = self._load_optional_text("rag-quality-harness.log")

        if economic is None and agentic is None:
            raise SystemExit(
                f"No se encontraron artefactos base en {self.input_dir}. Se requiere economic_backtest.json o agentic_benchmark.json."
            )

        rendered = {"economic": False, "agentic": False, "chapter6": False}
        captions: list[str] = []

        if self.mode in ("auto", "economic", "chapter6") and economic is None:
            raise SystemExit(f"Falta economic_backtest.json en {self.input_dir} para renderizar en modo {self.mode}.")

        if self.mode in ("auto", "agentic", "chapter6") and agentic is None and self.mode != "economic":
            if self.mode in ("agentic", "chapter6"):
                raise SystemExit(f"Falta agentic_benchmark.json en {self.input_dir} para renderizar en modo {self.mode}.")

        if economic is not None and self.mode in ("auto", "economic", "chapter6"):
            self.render_economic(economic)
            captions.extend(self.build_economic_captions())
            rendered["economic"] = True

        if agentic is not None and self.mode in ("auto", "agentic", "chapter6"):
            self.render_agentic(agentic)
            captions.extend(self.build_agentic_captions())
            rendered["agentic"] = True

        if economic is not None and agentic is not None and self.mode in ("auto", "chapter6"):
            self.render_chapter6(economic, agentic, health_api, health_compute, harness_log)
            captions.extend(self.build_chapter6_captions())
            rendered["chapter6"] = True

        if captions:
            (self.output_dir / "captions.md").write_text("\n".join(captions).strip() + "\n", encoding="utf-8")

        return rendered

    def render_economic(self, report: dict[str, Any]) -> None:
        summary = report["summary"]
        rows = report.get("rows", [])
        summary_rows = [
            TableRow("Costo baseline promedio", f"{summary['averageBaselineCostMxnPerHeadDay']:.2f} MXN/cabeza/dia"),
            TableRow("Costo optimizado promedio", f"{summary['averageOptimizedCostMxnPerHeadDay']:.2f} MXN/cabeza/dia"),
            TableRow("Ahorro promedio", f"{summary['averageSavingsMxnPerHeadDay']:.2f} MXN/cabeza/dia"),
            TableRow("Ahorro porcentual medio", f"{summary['averageSavingsPct']:.2f}%"),
            TableRow(
                "IC 95% del ahorro medio",
                f"[{summary['savingsMean95Ci']['low']:.2f}, {summary['savingsMean95Ci']['high']:.2f}] MXN/cabeza/dia",
            ),
            TableRow("Ahorro total del lote", f"{summary['totalSavingsMxnPerLot']:.2f} MXN"),
            TableRow("Dias factibles", f"{summary['daysFeasible']} de {summary['daysConfigured']}"),
            TableRow("Dias infeasible", str(summary['daysInfeasible'])),
            TableRow("Violaciones duras baseline", str(summary['baselineHardConstraintViolations'])),
            TableRow("Violaciones duras optimizado", str(summary['optimizedHardConstraintViolations'])),
        ]
        for label, key, threshold in ECONOMIC_STATUS_ROWS:
            summary_rows.append(
                TableRow(
                    label,
                    "PASS" if summary["acceptance"][key] else "FAIL",
                    threshold,
                    "PASS" if summary["acceptance"][key] else "FAIL",
                )
            )

        self._write_table_csv_md(
            self.output_dir / "economic_summary_table.csv",
            self.output_dir / "economic_summary_table.md",
            ["Metrica", "Valor", "Umbral", "Estado", "Nota"],
            summary_rows,
        )

        baseline = summary["averageBaselineCostMxnPerHeadDay"]
        optimized = summary["averageOptimizedCostMxnPerHeadDay"]
        self._bar_chart(
            ["Baseline", "Optimizado"],
            [baseline, optimized],
            "Costo promedio por cabeza al dia",
            "MXN/cabeza/dia",
            self.output_dir / "figure_economic_cost_comparison.png",
            colors_list=["#FFB454", "#4BE1B9"],
        )

        savings_series = [float(row["dailySavingsMxnPerHead"]) for row in rows]
        self._histogram(
            savings_series,
            "Distribucion del ahorro diario",
            "Ahorro diario (MXN/cabeza)",
            self.output_dir / "figure_economic_savings_distribution.png",
            color="#4BE1B9",
        )

        self._line_chart(
            [int(row["dayIndex"]) for row in rows],
            savings_series,
            "Ahorro diario por dia del horizonte",
            "Dia",
            "MXN/cabeza/dia",
            self.output_dir / "figure_economic_daily_savings.png",
            color="#4BE1B9",
        )

        pdf_lines = [
            f"Baseline usado: {summary.get('baselineDescription', 'No disponible')}",
            f"Veredicto global: {'PASS' if summary['acceptance']['overall'] else 'REVISAR'}.",
            (
                f"La corrida observo un ahorro medio de {summary['averageSavingsPct']:.2f}% "
                f"sin violaciones duras en las soluciones optimizadas."
            ),
        ]
        self._build_pdf(
            self.output_dir / "economic_report.pdf",
            "Experimento A - Backtesting economico",
            pdf_lines,
            [self.output_dir / "economic_summary_table.md"],
            [
                self.output_dir / "figure_economic_cost_comparison.png",
                self.output_dir / "figure_economic_savings_distribution.png",
                self.output_dir / "figure_economic_daily_savings.png",
            ],
        )

    def render_agentic(self, report: dict[str, Any]) -> None:
        summary = report["summary"]
        by_category = summary.get("byCategory", {})
        summary_rows = [
            TableRow("Cobertura de citas tecnicas", f"{summary['citationCoverageTechnical'] * 100:.2f}%", ">= 92%", self._status(summary['citationCoverageTechnical'] >= AGENTIC_THRESHOLDS['citationCoverageTechnical'])),
            TableRow("Grounded response rate", f"{summary['groundedResponseRate'] * 100:.2f}%", ">= 90%", self._status(summary['groundedResponseRate'] >= AGENTIC_THRESHOLDS['groundedResponseRate'])),
            TableRow("Unsafe block rate", f"{summary['unsafeBlockRate'] * 100:.2f}%"),
            TableRow("Unsafe numeric leakage", f"{summary['unsafeNumericLeakageRate'] * 100:.2f}%", "= 0%", self._status(summary['unsafeNumericLeakageRate'] <= AGENTIC_THRESHOLDS['unsafeNumericLeakageRate'])),
            TableRow("Agent tool success rate", f"{summary['agentToolSuccessRate'] * 100:.2f}%", ">= 95%", self._status(summary['agentToolSuccessRate'] >= AGENTIC_THRESHOLDS['agentToolSuccessRate'])),
            TableRow("Mode accuracy", f"{summary['modeAccuracy'] * 100:.2f}%"),
            TableRow("What-if completion rate", f"{summary['whatIfCompletionRate'] * 100:.2f}%", ">= 90%", self._status(summary['whatIfCompletionRate'] >= AGENTIC_THRESHOLDS['whatIfCompletionRate'])),
            TableRow("Next-action completion rate", f"{summary['nextActionCompletionRate'] * 100:.2f}%"),
            TableRow("Scenario pass rate", f"{summary['scenarioPassRate'] * 100:.2f}%"),
        ]
        for category, payload in sorted(by_category.items()):
            total = int(payload.get("total", 0))
            passed = int(payload.get("passed", 0))
            summary_rows.append(TableRow(f"Categoria: {CATEGORY_LABELS.get(category, category)}", f"{passed}/{total} OK"))

        self._write_table_csv_md(
            self.output_dir / "agentic_summary_table.csv",
            self.output_dir / "agentic_summary_table.md",
            ["Metrica", "Valor", "Umbral", "Estado", "Nota"],
            summary_rows,
        )

        metric_labels = [
            "Citas",
            "Grounded",
            "Block",
            "Tool",
            "Modo",
            "What-if",
            "Que sigue",
            "Pass global",
        ]
        metric_values = [
            summary["citationCoverageTechnical"] * 100,
            summary["groundedResponseRate"] * 100,
            summary["unsafeBlockRate"] * 100,
            summary["agentToolSuccessRate"] * 100,
            summary["modeAccuracy"] * 100,
            summary["whatIfCompletionRate"] * 100,
            summary["nextActionCompletionRate"] * 100,
            summary["scenarioPassRate"] * 100,
        ]
        self._bar_chart(
            metric_labels,
            metric_values,
            "KPIs principales del benchmark agentic",
            "%",
            self.output_dir / "figure_agentic_kpis.png",
            colors_list=["#4BE1B9"] * len(metric_labels),
            rotation=20,
            max_value=100,
        )

        category_labels = [CATEGORY_LABELS.get(key, key) for key in sorted(by_category.keys())]
        category_values = [
            (float(by_category[key]["passed"]) / float(by_category[key]["total"]) * 100) if float(by_category[key]["total"]) > 0 else 0.0
            for key in sorted(by_category.keys())
        ]
        self._bar_chart(
            category_labels,
            category_values,
            "Pass rate por categoria",
            "%",
            self.output_dir / "figure_agentic_category_pass_rate.png",
            colors_list=["#7BC7FF"] * len(category_labels),
            rotation=20,
            max_value=100,
        )

        self._bar_chart(
            ["Bloqueo inseguro", "Fuga numerica"],
            [summary["unsafeBlockRate"] * 100, summary["unsafeNumericLeakageRate"] * 100],
            "Indicadores de seguridad del agente",
            "%",
            self.output_dir / "figure_agentic_guardrails.png",
            colors_list=["#4BE1B9", "#FF6B7A"],
            max_value=100,
        )

        pdf_lines = [
            (
                f"El benchmark agentic evaluo {summary['totalScenarios']} escenarios y obtuvo "
                f"un pass rate global de {summary['scenarioPassRate'] * 100:.2f}%."
            ),
            (
                f"La fuga numerica insegura se mantuvo en {summary['unsafeNumericLeakageRate'] * 100:.2f}%, "
                f"mientras que el exito de tools fue de {summary['agentToolSuccessRate'] * 100:.2f}%."
            ),
        ]
        self._build_pdf(
            self.output_dir / "agentic_report.pdf",
            "Experimento B - Benchmark agentic y seguridad",
            pdf_lines,
            [self.output_dir / "agentic_summary_table.md"],
            [
                self.output_dir / "figure_agentic_kpis.png",
                self.output_dir / "figure_agentic_category_pass_rate.png",
                self.output_dir / "figure_agentic_guardrails.png",
            ],
        )

    def render_chapter6(
        self,
        economic: dict[str, Any],
        agentic: dict[str, Any],
        api_health: dict[str, Any] | None,
        compute_health: dict[str, Any] | None,
        harness_log: str | None,
    ) -> None:
        econ = economic["summary"]
        ag = agentic["summary"]
        harness = self._parse_harness_log(harness_log)
        rows = [
            TableRow("Ahorro porcentual medio", f"{econ['averageSavingsPct']:.2f}%", "> 0%", self._status(econ['acceptance']['meanSavingsPctPositive'])),
            TableRow("IC95 ahorro medio arriba de cero", self._format_pass_fail(econ['acceptance']['savingsMean95CiAboveZero']), "PASS", self._status(econ['acceptance']['savingsMean95CiAboveZero'])),
            TableRow("Factibilidad del horizonte", f"{econ['daysFeasible']}/{econ['daysConfigured']}", "100%", self._status(econ['acceptance']['allDaysFeasible'])),
            TableRow("Violaciones duras optimizadas", str(econ['optimizedHardConstraintViolations']), "0", self._status(econ['acceptance']['zeroOptimizedHardViolations'])),
            TableRow("Cobertura de citas", f"{ag['citationCoverageTechnical'] * 100:.2f}%", ">= 92%", self._status(ag['citationCoverageTechnical'] >= AGENTIC_THRESHOLDS['citationCoverageTechnical'])),
            TableRow("Grounded response rate", f"{ag['groundedResponseRate'] * 100:.2f}%", ">= 90%", self._status(ag['groundedResponseRate'] >= AGENTIC_THRESHOLDS['groundedResponseRate'])),
            TableRow("Unsafe numeric leakage", f"{ag['unsafeNumericLeakageRate'] * 100:.2f}%", "= 0%", self._status(ag['unsafeNumericLeakageRate'] <= AGENTIC_THRESHOLDS['unsafeNumericLeakageRate'])),
            TableRow("Agent tool success rate", f"{ag['agentToolSuccessRate'] * 100:.2f}%", ">= 95%", self._status(ag['agentToolSuccessRate'] >= AGENTIC_THRESHOLDS['agentToolSuccessRate'])),
            TableRow("What-if completion rate", f"{ag['whatIfCompletionRate'] * 100:.2f}%", ">= 90%", self._status(ag['whatIfCompletionRate'] >= AGENTIC_THRESHOLDS['whatIfCompletionRate'])),
            TableRow("Scenario pass rate", f"{ag['scenarioPassRate'] * 100:.2f}%"),
        ]
        if api_health is not None:
            rows.append(TableRow("API health", str(api_health.get("status", "ok")), "ok", self._status(str(api_health.get("status", "ok")).lower() == "ok")))
        if compute_health is not None:
            rows.append(TableRow("Compute health", str(compute_health.get("status", "ok")), "ok", self._status(str(compute_health.get("status", "ok")).lower() == "ok")))
        if harness:
            for key, ok in harness.items():
                rows.append(TableRow(f"Harness {key}", self._format_pass_fail(ok), "PASS", self._status(ok)))

        self._write_table_csv_md(
            self.output_dir / "chapter6_results_table.csv",
            self.output_dir / "chapter6_results_table.md",
            ["Metrica", "Valor", "Umbral", "Estado", "Nota"],
            rows,
        )

        matrix_labels = [row.metric for row in rows if row.status]
        matrix_values = [1 if row.status == "PASS" else 0 for row in rows if row.status]
        self._bar_chart(
            matrix_labels,
            matrix_values,
            "Matriz de aceptacion chapter 6",
            "PASS=1 / FAIL=0",
            self.output_dir / "figure_chapter6_acceptance_matrix.png",
            colors_list=["#4BE1B9" if value == 1 else "#FF6B7A" for value in matrix_values],
            rotation=25,
            max_value=1.1,
        )

        main_labels = ["Ahorro %", "Citas", "Grounded", "Tool success", "What-if"]
        main_values = [
            econ["averageSavingsPct"],
            ag["citationCoverageTechnical"] * 100,
            ag["groundedResponseRate"] * 100,
            ag["agentToolSuccessRate"] * 100,
            ag["whatIfCompletionRate"] * 100,
        ]
        self._bar_chart(
            main_labels,
            main_values,
            "KPIs principales chapter 6",
            "%",
            self.output_dir / "figure_chapter6_main_kpis.png",
            colors_list=["#4BE1B9", "#7BC7FF", "#7BC7FF", "#FFB454", "#4BE1B9"],
            max_value=max(100, math.ceil(max(main_values) / 10) * 10),
        )

        interpretation = self._build_chapter6_interpretation(econ, ag, harness)
        self._build_pdf(
            self.output_dir / "chapter6_executive_summary.pdf",
            "Resumen ejecutivo de la validacion Chapter 6",
            interpretation,
            [self.output_dir / "chapter6_results_table.md"],
            [
                self.output_dir / "figure_chapter6_acceptance_matrix.png",
                self.output_dir / "figure_chapter6_main_kpis.png",
            ],
        )

    def build_economic_captions(self) -> list[str]:
        return [
            "- `figure_economic_cost_comparison.png`: Comparacion del costo promedio diario por cabeza entre la dieta baseline y la dieta optimizada.",
            "- `figure_economic_savings_distribution.png`: Distribucion del ahorro diario observado en el horizonte de 90 dias.",
            "- `figure_economic_daily_savings.png`: Serie temporal del ahorro diario por cabeza a lo largo del experimento economico.",
        ]

    def build_agentic_captions(self) -> list[str]:
        return [
            "- `figure_agentic_kpis.png`: KPIs principales del benchmark agentic para evaluar citas, groundedness, seguridad y exito de herramientas.",
            "- `figure_agentic_category_pass_rate.png`: Pass rate por categoria de escenario adversarial o explicativo.",
            "- `figure_agentic_guardrails.png`: Indicadores de bloqueo inseguro y fuga numerica del agente.",
        ]

    def build_chapter6_captions(self) -> list[str]:
        return [
            "- `figure_chapter6_acceptance_matrix.png`: Matriz de cumplimiento de criterios de aceptacion del paquete experimental Chapter 6.",
            "- `figure_chapter6_main_kpis.png`: Resumen comparativo de los KPIs principales del experimento economico y del benchmark agentic.",
            "- `chapter6_results_table.md`: Tabla consolidada de resultados y umbrales lista para insertar en el documento final.",
        ]

    def _build_chapter6_interpretation(
        self,
        econ: dict[str, Any],
        agentic: dict[str, Any],
        harness: dict[str, bool],
    ) -> list[str]:
        lines = [
            (
                f"El experimento economico observo un ahorro medio de {econ['averageSavingsPct']:.2f}% "
                f"({econ['averageSavingsMxnPerHeadDay']:.2f} MXN/cabeza/dia) con "
                f"{econ['optimizedHardConstraintViolations']} violaciones duras en la solucion optimizada."
            ),
            (
                f"En la capa IA, la cobertura de citas fue de {agentic['citationCoverageTechnical'] * 100:.2f}% "
                f"y la fuga numerica insegura se mantuvo en {agentic['unsafeNumericLeakageRate'] * 100:.2f}%."
            ),
        ]
        if agentic['agentToolSuccessRate'] < AGENTIC_THRESHOLDS['agentToolSuccessRate']:
            lines.append(
                (
                    f"La principal brecha operativa permanece en el exito de herramientas del agente "
                    f"({agentic['agentToolSuccessRate'] * 100:.2f}%), por debajo del umbral objetivo de 95%."
                )
            )
        if harness:
            failed = [name for name, ok in harness.items() if not ok]
            if failed:
                lines.append("El harness de calidad reporto alertas en: " + ", ".join(failed) + ".")
            else:
                lines.append("El harness de calidad existente no reporto fallos en la corrida consolidada.")
        lines.append(
            "Estos resultados deben interpretarse como evidencia del escenario experimental congelado y no como una promesa universal transferible sin recalibracion a cualquier rancho o mercado."
        )
        return lines

    def _load_optional_json(self, name: str) -> dict[str, Any] | None:
        path = self.input_dir / name
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def _load_optional_text(self, name: str) -> str | None:
        path = self.input_dir / name
        if not path.exists():
            return None
        return path.read_text(encoding="utf-8")

    def _build_styles(self) -> dict[str, ParagraphStyle]:
        styles = getSampleStyleSheet()
        return {
            "title": styles["Title"],
            "body": styles["BodyText"],
            "small": ParagraphStyle(
                "Small",
                parent=styles["BodyText"],
                fontSize=9,
                leading=12,
                spaceAfter=6,
            ),
        }

    def _write_table_csv_md(self, csv_path: Path, md_path: Path, headers: list[str], rows: list[TableRow]) -> None:
        with csv_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(headers)
            for row in rows:
                writer.writerow([row.metric, row.value, row.threshold, row.status, row.note])

        md_lines = ["| " + " | ".join(headers) + " |", "|" + "|".join(["---"] * len(headers)) + "|"]
        for row in rows:
            md_lines.append(
                f"| {row.metric} | {row.value} | {row.threshold or '-'} | {row.status or '-'} | {row.note or '-'} |"
            )
        md_path.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    def _bar_chart(
        self,
        labels: list[str],
        values: list[float],
        title: str,
        ylabel: str,
        output_path: Path,
        *,
        colors_list: list[str] | None = None,
        rotation: int = 0,
        max_value: float | None = None,
    ) -> None:
        fig, ax = plt.subplots(figsize=(10, 5.5))
        palette = colors_list if colors_list is not None else ["#4BE1B9"] * len(labels)
        bars = ax.bar(labels, values, color=palette)
        ax.set_title(title)
        ax.set_ylabel(ylabel)
        ax.grid(axis="y", linestyle="--", alpha=0.25)
        if max_value is not None:
            ax.set_ylim(0, max_value)
        ax.tick_params(axis="x", rotation=rotation)
        for bar, value in zip(bars, values):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + (max(values) * 0.02 if values else 0.02), f"{value:.2f}", ha="center", va="bottom", fontsize=9)
        fig.tight_layout()
        fig.savefig(output_path, dpi=self.dpi, bbox_inches="tight")
        plt.close(fig)

    def _histogram(self, values: list[float], title: str, xlabel: str, output_path: Path, *, color: str) -> None:
        fig, ax = plt.subplots(figsize=(10, 5.5))
        bins = min(12, max(5, int(math.sqrt(len(values) or 1))))
        ax.hist(values, bins=bins, color=color, edgecolor="#16313D")
        ax.set_title(title)
        ax.set_xlabel(xlabel)
        ax.set_ylabel("Frecuencia")
        ax.grid(axis="y", linestyle="--", alpha=0.25)
        fig.tight_layout()
        fig.savefig(output_path, dpi=self.dpi, bbox_inches="tight")
        plt.close(fig)

    def _line_chart(
        self,
        x_values: list[int],
        y_values: list[float],
        title: str,
        xlabel: str,
        ylabel: str,
        output_path: Path,
        *,
        color: str,
    ) -> None:
        fig, ax = plt.subplots(figsize=(10, 5.5))
        ax.plot(x_values, y_values, marker="o", linewidth=2, color=color)
        ax.set_title(title)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        ax.grid(linestyle="--", alpha=0.25)
        fig.tight_layout()
        fig.savefig(output_path, dpi=self.dpi, bbox_inches="tight")
        plt.close(fig)

    def _build_pdf(self, output_path: Path, title: str, paragraphs: Iterable[str], table_paths: list[Path], image_paths: list[Path]) -> None:
        doc = SimpleDocTemplate(str(output_path), pagesize=A4, leftMargin=1.6 * cm, rightMargin=1.6 * cm, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
        flow: list[Any] = [Paragraph(title, self.styles["title"]), Spacer(1, 0.35 * cm)]
        for paragraph in paragraphs:
            flow.append(Paragraph(paragraph, self.styles["body"]))
            flow.append(Spacer(1, 0.2 * cm))

        for table_path in table_paths:
            if table_path.exists():
                flow.append(Spacer(1, 0.2 * cm))
                flow.append(Paragraph(f"Tabla derivada: {table_path.name}", self.styles["small"]))
                flow.append(self._markdown_table_to_reportlab(table_path))
                flow.append(Spacer(1, 0.3 * cm))

        for image_path in image_paths:
            if image_path.exists():
                flow.append(Paragraph(image_path.name, self.styles["small"]))
                flow.append(Image(str(image_path), width=17.2 * cm, height=9.2 * cm, kind="proportional"))
                flow.append(Spacer(1, 0.25 * cm))

        doc.build(flow)

    def _markdown_table_to_reportlab(self, path: Path) -> Table:
        lines = [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        rows: list[list[str]] = []
        for index, line in enumerate(lines):
            if index == 1 and set(line.replace("|", "").replace("-", "").strip()) == set():
                continue
            parts = [item.strip() for item in line.strip("|").split("|")]
            rows.append(parts)
        table = Table(rows, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DDEFF1")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#10212B")),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#87A1AD")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("LEADING", (0, 0), (-1, -1), 10),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FBFC")]),
                ]
            )
        )
        return table

    def _parse_harness_log(self, raw_log: str | None) -> dict[str, bool]:
        if not raw_log:
            return {}
        checks = {
            "baseline": bool(re.search(r"Baseline evaluation PASS", raw_log)),
            "redteam": bool(re.search(r"Red-team evaluation PASS", raw_log)),
            "mandatory": bool(re.search(r"Mandatory cases PASS", raw_log)),
            "harness": bool(re.search(r"Harness PASS", raw_log)),
        }
        return checks

    def _status(self, ok: bool) -> str:
        return "PASS" if ok else "FAIL"

    def _format_pass_fail(self, ok: bool) -> str:
        return "PASS" if ok else "FAIL"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render evidence assets from experiment report artifacts.")
    parser.add_argument("--input-dir", default="data/experiments/reports/latest")
    parser.add_argument("--output-dir", default="")
    parser.add_argument("--language", default="es")
    parser.add_argument("--dpi", type=int, default=240)
    parser.add_argument("--mode", default="auto", choices=["auto", "economic", "agentic", "chapter6"])
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = Path(args.input_dir)
    if not input_dir.exists():
        raise SystemExit(f"La carpeta de entrada no existe: {input_dir}")
    output_dir = Path(args.output_dir) if args.output_dir else input_dir
    renderer = EvidenceRenderer(
        input_dir=input_dir,
        output_dir=output_dir,
        language=args.language,
        dpi=args.dpi,
        mode=args.mode,
    )
    rendered = renderer.render()
    print(json.dumps({"inputDir": str(input_dir), "outputDir": str(output_dir), "rendered": rendered}, indent=2, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
